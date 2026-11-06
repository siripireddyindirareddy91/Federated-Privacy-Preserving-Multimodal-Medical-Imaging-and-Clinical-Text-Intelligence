import os
import time
import io
import pytest
import torch
from PIL import Image
from fastapi.testclient import TestClient
os.environ['DATABASE_URL']='sqlite:///./test-medifed.db'
os.environ['DEMO_PASSWORD']='ResearchDemo!2026'
from app.main import app
from app.ml import aggregate, deidentify, FusionModel, train_round, evaluate

@pytest.fixture(scope='module')
def client():
    with TestClient(app) as c: yield c
@pytest.fixture(scope='module')
def headers(client):
    r=client.post('/api/auth/login',json={'email':'admin@medifed.ai','password':'ResearchDemo!2026'})
    assert r.status_code==200
    return {'Authorization':'Bearer '+r.json()['token']}
def test_auth_and_health(client,headers):
    assert client.get('/api/health').json()['status']=='healthy'
    assert client.get('/api/hospitals').status_code==403 or client.get('/api/hospitals').status_code==401
    assert client.get('/api/auth/me',headers=headers).json()['role']=='admin'
    assert client.post('/api/auth/login',json={'email':'admin@medifed.ai','password':'WrongPassword123'}).status_code==401
def test_hospital_crud(client,headers):
    payload={'name':'Synthetic Test Hospital','location':'Test City','samples':40,'clinical':40,'active':True}
    r=client.post('/api/hospitals',json=payload,headers=headers); assert r.status_code==200
    id=r.json()['id']; payload['active']=False
    assert client.put(f'/api/hospitals/{id}',json=payload,headers=headers).json()['active']==False
    assert client.delete(f'/api/hospitals/{id}',headers=headers).status_code==200
def test_deidentification():
    text=deidentify('Patient name: Jane Doe\nMRN: 12345\nEmail jane@example.com; phone 9876543210')
    assert 'Jane Doe' not in text and 'jane@example.com' not in text and '9876543210' not in text
def test_text_and_audit_minimization(client,headers):
    secret='unique-sensitive-content'
    r=client.post('/api/clinical-text/analyze',json={'text':f'Patient name: {secret}\ncough and fever'},headers=headers)
    assert r.status_code==200 and len(r.json()['entities'])==2
    assert secret not in str(client.get('/api/audit-logs',headers=headers).json())
    assert secret not in str(client.get('/api/clinical-text/history',headers=headers).json())
def test_uploads(client,headers):
    b=io.BytesIO();Image.new('L',(32,32),128).save(b,format='PNG')
    r=client.post('/api/images/upload',files={'file':('synthetic.png',b.getvalue(),'image/png')},headers=headers)
    assert r.status_code==200 and r.json()['dimensions']==16
    assert client.post('/api/images/upload',files={'file':('bad.png',b'not image','image/png')},headers=headers).status_code==422
    assert client.post('/api/clinical-text/upload',files={'file':('note.txt',b'normal clear stable','text/plain')},headers=headers).status_code==200
def test_fedavg_exact():
    assert aggregate([({'w':torch.tensor([2.])},1),({'w':torch.tensor([6.])},3)])['w'].item()==5
def test_real_training_and_noise():
    torch.manual_seed(42); m=FusionModel(); initial=evaluate(m)['loss']
    cfg={'epochs':2,'batch_size':16,'learning_rate':.1,'strategy':'FedAvg','modality':'multimodal','noise':.01,'clip_norm':1}
    clients=[{'name':str(i),'seed':100+i,'samples':80,'bias':i*.05} for i in range(3)]
    for _ in range(5): metrics=train_round(m,clients,cfg)
    assert metrics['loss']<initial and metrics['samples']==180
    assert len(metrics['clients'])==3 and metrics['clients'][0]['update_bytes']>0
    assert sum(sum(row) for row in metrics['confusion_matrix'])==180
def test_fusion(client,headers):
    r=client.post('/api/multimodal/analyze',json={'sample_id':1},headers=headers)
    assert r.status_code==200 and len(r.json()['scores'])==3
def test_experiment_end_to_end(client,headers):
    r=client.post('/api/federated/experiments',json={'rounds':2,'epochs':1},headers=headers);id=r.json()['id']
    assert client.post(f'/api/federated/experiments/{id}/start',headers=headers).status_code==200
    deadline=time.time()+20
    while time.time()<deadline:
        status=client.get(f'/api/federated/experiments/{id}/status',headers=headers).json()
        if status['status'] in ['completed','failed']:break
        time.sleep(.1)
    assert status['status']=='completed' and status['round']==2
    assert len(client.get(f'/api/federated/experiments/{id}/rounds',headers=headers).json())==2
def test_reports(client,headers):
    for fmt,magic in [('pdf',b'%PDF'),('json',b'{'),('csv',b'modality')]:
        r=client.post('/api/reports/generate',json={'format':fmt},headers=headers)
        assert r.status_code==200 and r.content.startswith(magic)
def test_role_and_ownership(client,headers):
    email=f'test-{time.time_ns()}@example.com'
    payload={'email':email,'password':'ResearcherTest123!'}
    assert client.post('/api/auth/register',json=payload).status_code==200
    token=client.post('/api/auth/login',json=payload).json()['token']; h={'Authorization':'Bearer '+token}
    assert client.post('/api/hospitals',json={'name':'Forbidden hospital','location':'City'},headers=h).status_code==403
    assert client.get('/api/federated/experiments/999999/status',headers=h).status_code==404
def test_validation(client,headers):
    assert client.post('/api/federated/experiments',json={'rounds':9999},headers=headers).status_code==422
    assert client.put('/api/privacy/configuration',json={'noise':-1},headers=headers).status_code==422

def test_medical_formats(client,headers):
    import numpy as np
    import nibabel as nib
    from pydicom.dataset import FileDataset, FileMetaDataset
    from pydicom.uid import ExplicitVRLittleEndian, SecondaryCaptureImageStorage, generate_uid
    volume=nib.Nifti1Image(np.arange(512,dtype=np.int16).reshape(8,8,8),np.eye(4))
    r=client.post('/api/images/upload',files={'file':('synthetic.nii',volume.to_bytes(),'application/octet-stream')},headers=headers)
    assert r.status_code==200 and r.json()['width']==8
    meta=FileMetaDataset(); meta.TransferSyntaxUID=ExplicitVRLittleEndian
    meta.MediaStorageSOPClassUID=SecondaryCaptureImageStorage;meta.MediaStorageSOPInstanceUID=generate_uid()
    ds=FileDataset(None,{},file_meta=meta,preamble=b'\0'*128)
    ds.Rows=8;ds.Columns=8;ds.SamplesPerPixel=1;ds.PhotometricInterpretation='MONOCHROME2'
    ds.BitsAllocated=16;ds.BitsStored=16;ds.HighBit=15;ds.PixelRepresentation=0
    ds.PatientName='Synthetic^Patient';ds.PixelData=np.arange(64,dtype=np.uint16).tobytes()
    stream=io.BytesIO();ds.save_as(stream,enforce_file_format=True)
    r=client.post('/api/images/upload',files={'file':('synthetic.dcm',stream.getvalue(),'application/dicom')},headers=headers)
    assert r.status_code==200 and 'Synthetic^Patient' not in str(r.json())

def test_provider_database_urls():
    from app.database_config import normalize_database_url
    for scheme in ['postgres://','postgresql://','postgresql+psycopg://']:
        assert normalize_database_url(scheme+'user:password@db:5432/research?sslmode=require')=='postgresql+psycopg://user:password@db:5432/research?sslmode=require'
    assert normalize_database_url('sqlite:///local.db')=='sqlite:///local.db'
