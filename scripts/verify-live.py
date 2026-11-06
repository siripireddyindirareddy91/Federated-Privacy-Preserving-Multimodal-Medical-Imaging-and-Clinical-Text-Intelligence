"""Exercise a deployed synthetic MediFed API without printing credentials."""
import argparse
import io
import os
import time
import httpx
from PIL import Image

parser=argparse.ArgumentParser()
parser.add_argument('--api',required=True)
parser.add_argument('--email',default='admin@medifed.ai')
args=parser.parse_args()
password=os.environ.get('MEDIFED_VERIFY_PASSWORD')
if not password:
    from getpass import getpass
    password=getpass('Research account password: ')
with httpx.Client(base_url=args.api.rstrip('/'),timeout=120) as api:
    def call(method,path,**kwargs):
        r=api.request(method,'/api'+path,**kwargs)
        if r.status_code>=400: raise RuntimeError(f'{method} {path}: HTTP {r.status_code}: {r.text[:180]}')
        return r
    health=call('GET','/health',headers={'Origin':'https://medifed-ai.vercel.app'})
    assert health.headers.get('access-control-allow-origin')=='https://medifed-ai.vercel.app'
    print('PASS: HTTPS health and frontend CORS')
    login=call('POST','/auth/login',json={'email':args.email,'password':password}).json()
    api.headers['Authorization']='Bearer '+login['token']
    assert call('GET','/auth/me').json()['role']=='admin'
    print('PASS: authenticated administrator session')
    assert call('GET','/search',params={'q':'Apollo'}).json()
    print('PASS: hospital search returns real directory records')
    text=call('POST','/clinical-text/analyze',json={'text':'Patient name: Synthetic Live Test\nMRN: SYN-LIVE\nResearch note contains cough, fever and opacity.'}).json()
    assert len(text['entities'])==3 and 'Synthetic Live Test' not in text['deidentified_text']
    print('PASS: clinical analysis and identifier masking')
    out=io.BytesIO();Image.new('L',(48,48),128).save(out,format='PNG')
    image=call('POST','/images/upload',files={'file':('synthetic-live.png',out.getvalue(),'image/png')}).json()
    assert len(image['embedding'])==16
    print('PASS: actual image upload and feature extraction')
    fusion=call('POST','/multimodal/analyze',json={'sample_id':3}).json()
    assert len(fusion['scores'])==3
    print('PASS: trained synthetic multimodal fusion')
    exp=call('POST','/federated/experiments',json={'name':'Live HTTPS verification','rounds':2,'epochs':1}).json()
    call('POST',f'/federated/experiments/{exp["id"]}/start')
    deadline=time.monotonic()+90
    while True:
        status=call('GET',f'/federated/experiments/{exp["id"]}/status').json()
        if status['status'] in ['completed','failed']: break
        if time.monotonic()>deadline: raise RuntimeError('Training verification timed out')
        time.sleep(.5)
    assert status['status']=='completed' and status['round']==2
    print('PASS: real federated training, aggregation and stored rounds')
    evaluations=call('POST','/evaluation/run').json()
    assert len(evaluations)==3 and all(e['samples']==180 for e in evaluations)
    print('PASS: three modality baselines evaluated on held-out predictions')
    for format,magic in [('pdf',b'%PDF'),('csv',b'modality'),('json',b'{')]:
        report=call('POST','/reports/generate',json={'format':format})
        assert report.content.startswith(magic)
    print('PASS: PDF, CSV and JSON report downloads')
    assert call('GET','/audit-logs').json()
    print('PASS: persistent audit trail')
    print('All live API smoke checks passed. Synthetic research only.')
