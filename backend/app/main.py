import base64
import csv
import hashlib
import hmac
import io
import json
import os
import secrets
import threading
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Literal
import jwt
import numpy as np
import torch
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, Column, Integer, String, JSON, ForeignKey, Boolean
from sqlalchemy.orm import declarative_base, sessionmaker
from PIL import Image, UnidentifiedImageError
from .ml import FusionModel, synthetic, train_round, evaluate, analyze_text, image_features

ROOT=Path(__file__).resolve().parents[1]
DATABASE_URL=os.getenv('DATABASE_URL',f'sqlite:///{ROOT / "medifed.db"}')
engine=create_engine(DATABASE_URL,**({'connect_args':{'check_same_thread':False}} if DATABASE_URL.startswith('sqlite') else {}))
Session=sessionmaker(bind=engine,expire_on_commit=False)
Base=declarative_base()
SECRET=os.getenv('JWT_SECRET') or secrets.token_urlsafe(48)
if os.getenv('APP_ENV')=='production' and not os.getenv('JWT_SECRET'): raise RuntimeError('JWT_SECRET required in production')

class User(Base):
    __tablename__='users'
    id=Column(Integer,primary_key=True); email=Column(String(254),unique=True,index=True); password=Column(String); role=Column(String,default='researcher')
class Hospital(Base):
    __tablename__='hospitals'
    id=Column(Integer,primary_key=True); name=Column(String); location=Column(String); active=Column(Boolean,default=True); samples=Column(Integer,default=80); clinical=Column(Integer,default=80)
class Record(Base):
    __tablename__='research_records'
    id=Column(Integer,primary_key=True); kind=Column(String,index=True); owner=Column(Integer,ForeignKey('users.id'),index=True); data=Column(JSON); created_at=Column(String,default=lambda:datetime.now(timezone.utc).isoformat())

def password_hash(password,salt=None):
    salt=salt or secrets.token_hex(16)
    return salt+':'+hashlib.scrypt(password.encode(),salt=salt.encode(),n=16384,r=8,p=1).hex()
def password_ok(password,stored): return hmac.compare_digest(password_hash(password,stored.split(':')[0]),stored)
Base.metadata.create_all(engine)
with Session() as db:
    if not db.query(Hospital).count():
        for i,name in enumerate(['City General Hospital','Apollo Research Hospital','Sunrise Medical Center','Global Health Institute','Advanced Care Hospital']): db.add(Hospital(name=name,location=['Hyderabad','Bengaluru','Chennai','Mumbai','Delhi'][i],samples=80+i*16,clinical=80+i*16))
    demo_password=os.getenv('DEMO_PASSWORD')
    if demo_password and not db.query(User).filter_by(email='admin@medifed.ai').first(): db.add(User(email='admin@medifed.ai',password=password_hash(demo_password),role='admin'))
    db.commit()

app=FastAPI(title='MediFed AI Research API',version='1.0.0',description='Synthetic research only. Local in-process federated learning; no clinical validation.')
app.add_middleware(CORSMiddleware,allow_origins=os.getenv('CORS_ORIGINS','http://localhost:3000').split(','),allow_credentials=True,allow_methods=['GET','POST','PUT','DELETE'],allow_headers=['Authorization','Content-Type'])
security=HTTPBearer()
rate_lock=threading.Lock(); rates={}
@app.middleware('http')
async def rate_limit(request:Request,call_next):
    key=request.client.host if request.client else 'unknown'; now=time.monotonic()
    with rate_lock:
        hits=[t for t in rates.get(key,[]) if now-t<60]
        if len(hits)>=240: return Response('Rate limit exceeded',status_code=429)
        rates[key]=hits+[now]
        if len(rates)>10000:
            for k in list(rates):
                if not rates[k] or now-rates[k][-1]>60: rates.pop(k,None)
    return await call_next(request)
def current_user(credentials:HTTPAuthorizationCredentials=Depends(security)):
    try:
        payload=jwt.decode(credentials.credentials,SECRET,algorithms=['HS256'])
        with Session() as db: user=db.get(User,int(payload['sub']))
        if not user: raise ValueError()
        return user
    except Exception: raise HTTPException(401,'Invalid or expired session')
def admin(user=Depends(current_user)):
    if user.role!='admin': raise HTTPException(403,'Administrator access required')
    return user
def save(kind,data,user):
    with Session() as db:
        rec=Record(kind=kind,owner=user.id,data=data); db.add(rec); db.commit(); return {'id':rec.id,'created_at':rec.created_at,**data}
def records(kind,user):
    with Session() as db:
        q=db.query(Record).filter_by(kind=kind)
        if user.role!='admin': q=q.filter_by(owner=user.id)
        return [{'id':r.id,'created_at':r.created_at,**r.data} for r in q.order_by(Record.id.desc()).limit(500)]
def audit(action,user,resource='system'): save('audit',{'action':action,'resource':resource,'user':user.email,'status':'success'},user)
def hospital_dict(h): return {'id':h.id,'name':h.name,'location':h.location,'active':h.active,'samples':h.samples,'clinical':h.clinical,'status':'Connected' if h.active else 'Offline','synthetic':True}

class Auth(BaseModel):
    email:str=Field(min_length=5,max_length=254,pattern=r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
    password:str=Field(min_length=10,max_length=128)
@app.post('/api/auth/register')
def register(data:Auth):
    with Session() as db:
        if db.query(User).filter_by(email=data.email.lower()).first(): raise HTTPException(409,'Email already registered')
        u=User(email=data.email.lower(),password=password_hash(data.password)); db.add(u); db.commit()
    audit('Account registered',u); return {'message':'Account created; sign in to continue'}
@app.post('/api/auth/login')
def login(data:Auth):
    with Session() as db: u=db.query(User).filter_by(email=data.email.lower()).first()
    if not u or not password_ok(data.password,u.password): raise HTTPException(401,'Incorrect email or password')
    audit('Signed in',u)
    return {'token':jwt.encode({'sub':str(u.id),'exp':datetime.now(timezone.utc)+timedelta(hours=8)},SECRET,algorithm='HS256'),'user':{'email':u.email,'role':u.role}}
@app.get('/api/auth/me')
def me(user=Depends(current_user)): return {'email':user.email,'role':user.role}
@app.post('/api/auth/logout')
def logout(user=Depends(current_user)): audit('Signed out',user); return {'message':'Session cleared by client; token expires within 8 hours'}
@app.get('/api/health')
def health():
    with engine.connect() as connection:
        from sqlalchemy import text
        connection.execute(text('SELECT 1'))
    return {'status':'healthy','mode':'synthetic research','engine':'PyTorch in-process federated fallback','database':'connected'}
@app.get('/api/hospitals')
def hospitals(user=Depends(current_user)):
    with Session() as db: return [hospital_dict(h) for h in db.query(Hospital).all()]
class HospitalInput(BaseModel):
    name:str=Field(min_length=3,max_length=120); location:str=Field(min_length=2,max_length=120); active:bool=True
    samples:int=Field(default=80,ge=16,le=1000); clinical:int=Field(default=80,ge=0,le=1000)
@app.post('/api/hospitals')
def add_hospital(data:HospitalInput,user=Depends(admin)):
    with Session() as db:
        h=Hospital(**data.model_dump()); db.add(h); db.commit(); result=hospital_dict(h)
    audit('Hospital registered',user,str(result['id'])); return result
@app.get('/api/hospitals/{id}')
def get_hospital(id:int,user=Depends(current_user)):
    with Session() as db:
        h=db.get(Hospital,id)
        if not h: raise HTTPException(404,'Hospital not found')
        return hospital_dict(h)
@app.put('/api/hospitals/{id}')
def edit_hospital(id:int,data:HospitalInput,user=Depends(admin)):
    with Session() as db:
        h=db.get(Hospital,id)
        if not h: raise HTTPException(404,'Hospital not found')
        for k,v in data.model_dump().items(): setattr(h,k,v)
        db.commit(); result=hospital_dict(h)
    audit('Hospital updated',user,str(id)); return result
@app.delete('/api/hospitals/{id}')
def delete_hospital(id:int,user=Depends(admin)):
    with Session() as db:
        h=db.get(Hospital,id)
        if not h: raise HTTPException(404,'Hospital not found')
        db.delete(h); db.commit()
    audit('Hospital removed',user,str(id)); return {'deleted':id}

class TextInput(BaseModel): text:str=Field(min_length=3,max_length=50000)
@app.post('/api/clinical-text/analyze')
def clinical(data:TextInput,user=Depends(current_user)):
    result=analyze_text(data.text)
    # Only structured, content-free metadata goes into the central database.
    stored=save('text_analysis',{'tokens':result['tokens'],'dimensions':16,'model':result['model']},user)
    audit('Clinical text analyzed',user,str(stored['id'])); return {**result,'id':stored['id']}
async def read_upload(file,extensions):
    ext=Path(file.filename or '').suffix.lower()
    if ext not in extensions: raise HTTPException(415,'Unsupported file extension')
    data=await file.read(10*1024*1024+1)
    if len(data)>10*1024*1024: raise HTTPException(413,'Maximum upload size is 10 MB')
    return data,ext
@app.post('/api/clinical-text/upload')
async def text_upload(file:UploadFile=File(...),user=Depends(current_user)):
    data,ext=await read_upload(file,{'.txt','.pdf','.docx'})
    try:
        if ext=='.pdf':
            from pypdf import PdfReader
            reader=PdfReader(io.BytesIO(data))
            if len(reader.pages)>100: raise ValueError('PDF exceeds 100 pages')
            text='\n'.join(p.extract_text() or '' for p in reader.pages)
        elif ext=='.docx':
            import zipfile
            with zipfile.ZipFile(io.BytesIO(data)) as z:
                if sum(x.file_size for x in z.infolist())>30*1024*1024: raise ValueError('Expanded document exceeds limit')
            from docx import Document
            text='\n'.join(p.text for p in Document(io.BytesIO(data)).paragraphs)
        else: text=data.decode('utf-8')
        if not text.strip() or len(text)>50000: raise ValueError('Document must contain 3–50,000 text characters')
        return clinical(TextInput(text=text),user)
    except HTTPException: raise
    except Exception as e: raise HTTPException(422,'Document could not be extracted: '+str(e)[:120])
@app.post('/api/images/upload')
async def image_upload(file:UploadFile=File(...),user=Depends(current_user)):
    data,ext=await read_upload(file,{'.png','.jpg','.jpeg','.dcm','.dicom','.nii'})
    try:
        if ext in {'.dcm','.dicom'}:
            import pydicom
            a=pydicom.dcmread(io.BytesIO(data)).pixel_array.astype(float)
            if a.ndim>2: a=a[a.shape[0]//2]
            a=(a-a.min())/(a.max()-a.min()+1e-8)*255; image=Image.fromarray(a.astype('uint8'))
        elif ext=='.nii':
            import nibabel as nib
            img=nib.Nifti1Image.from_bytes(data); a=img.get_fdata()
            if a.size>20000000: raise ValueError('Volume exceeds voxel limit')
            a=a[:,:,a.shape[2]//2] if a.ndim==3 else a
            a=(a-a.min())/(a.max()-a.min()+1e-8)*255; image=Image.fromarray(a.astype('uint8'))
        else:
            image=Image.open(io.BytesIO(data)); image.load()
        width,height=image.size
        if width*height>20000000: raise ValueError('Image exceeds pixel limit')
        emb=image_features(image); preview=image.convert('L').resize((224,224)); out=io.BytesIO(); preview.save(out,format='PNG')
        result=save('image_analysis',{'width':width,'height':height,'dimensions':16,'format':ext,'model':'4x4 normalized intensity encoder','embedding':emb.tolist()},user)
        audit('Image processed',user,str(result['id']))
        return {**result,'preview':'data:image/png;base64,'+base64.b64encode(out.getvalue()).decode(),'notice':'Deterministic intensity features; no trained medical classifier or diagnosis.'}
    except Exception: raise HTTPException(422,'Invalid or unsupported image content')
@app.get('/api/images/history')
def image_history(user=Depends(current_user)): return records('image_analysis',user)
@app.get('/api/clinical-text/history')
def text_history(user=Depends(current_user)): return records('text_analysis',user)

class FusionInput(BaseModel): sample_id:int=Field(default=1,ge=1,le=100)
@app.post('/api/multimodal/analyze')
def fusion(data:FusionInput,user=Depends(current_user)):
    torch.manual_seed(42); model=FusionModel(); x,y=synthetic(42,120)
    opt=torch.optim.SGD(model.parameters(),lr=.15)
    for _ in range(25):
        opt.zero_grad(); loss=torch.nn.functional.cross_entropy(model(x),y); loss.backward(); opt.step()
    sample,label=synthetic(7000+data.sample_id,1)
    with torch.no_grad():
        image=sample.clone(); image[:,16:]=0; text=sample.clone(); text[:,:16]=0
        scores={k:float(model(v).softmax(1)[0,1]) for k,v in [('image_only',image),('text_only',text),('multimodal',sample)]}
    result=save('fusion',{'sample_id':f'SYN-{data.sample_id:03d}','scores':scores,'synthetic_label':int(label[0]),'model':'Locally trained two-branch PyTorch fusion baseline','notice':'Synthetic linked features only; probabilities refer to synthetic class 1.'},user)
    audit('Multimodal analysis completed',user,str(result['id'])); return result
@app.get('/api/multimodal/history')
def fusion_history(user=Depends(current_user)): return records('fusion',user)

class TrainConfig(BaseModel):
    name:str=Field(default='Multimodal federation',min_length=3,max_length=100)
    rounds:int=Field(default=8,ge=1,le=50); epochs:int=Field(default=2,ge=1,le=10)
    batch_size:int=Field(default=16,ge=4,le=128); learning_rate:float=Field(default=.1,ge=.001,le=1)
    strategy:Literal['FedAvg','FedProx']='FedAvg'; modality:Literal['image','text','multimodal']='multimodal'
    noise:float=Field(default=0,ge=0,le=2); clip_norm:float=Field(default=1,gt=0,le=10)
jobs={}; jobs_lock=threading.RLock()
def worker(id,user):
    try:
        job=jobs[id]; torch.manual_seed(42); model=FusionModel()
        while job['round']<job['config']['rounds']:
            if job['status']=='stopped': return
            if job['status']=='paused': time.sleep(.2); continue
            metrics=train_round(model,job['clients'],job['config'])
            with jobs_lock:
                job['round']+=1; entry={'round':job['round'],**metrics}; job['metrics'].append(entry)
            save('round',{'experiment_id':id,**entry},user); audit('Model parameters aggregated',user,str(id))
        with jobs_lock: job['status']='completed'
        save('evaluation',{'experiment_id':id,'modality':job['config']['modality'],**evaluate(model,job['config']['modality'])},user)
        audit('Federated training completed',user,str(id))
    except Exception as e:
        jobs[id]['status']='failed'; jobs[id]['error']=str(e)[:200]
    finally:
        j=jobs[id]
        with Session() as db:
            rec=db.get(Record,id)
            if rec: rec.data={**rec.data,'status':j['status'],'round':j['round']}; db.commit()
@app.post('/api/federated/experiments')
def create_experiment(data:TrainConfig,user=Depends(current_user)):
    result=save('experiment',{'config':data.model_dump(),'status':'created','round':0},user); return result
@app.get('/api/federated/experiments')
def experiments(user=Depends(current_user)):
    return [{**r,**({k:jobs[r['id']][k] for k in ['status','round']} if r['id'] in jobs else {'status':'interrupted' if r.get('status') in ['running','paused'] else r.get('status')})} for r in records('experiment',user)]
def owned_experiment(id,user):
    with Session() as db:
        rec=db.get(Record,id)
        if not rec or rec.kind!='experiment' or (rec.owner!=user.id and user.role!='admin'): raise HTTPException(404,'Experiment not found')
        return rec
@app.post('/api/federated/experiments/{id}/{action}')
def control(id:int,action:Literal['start','pause','resume','stop'],user=Depends(current_user)):
    rec=owned_experiment(id,user)
    with jobs_lock:
        if action=='start':
            if id in jobs or rec.data['status']!='created': raise HTTPException(409,'Experiment already started; create a new experiment')
            if any(j['status'] in ['running','paused'] for j in jobs.values()): raise HTTPException(409,'Another experiment is active')
            with Session() as db: hs=db.query(Hospital).filter_by(active=True).all()
            if len(hs)<2: raise HTTPException(422,'At least two active hospital clients required')
            jobs[id]={'id':id,'config':rec.data['config'],'status':'running','round':0,'metrics':[],'clients':[{'name':h.name,'seed':100+h.id,'samples':h.samples,'bias':((h.id%5)-2)*.08} for h in hs]}
            with Session() as db:
                row=db.get(Record,id); row.data={**row.data,'status':'running'}; db.commit()
            threading.Thread(target=worker,args=(id,user),daemon=True).start()
        else:
            if id not in jobs: raise HTTPException(409,'Experiment is not active in this backend process')
            j=jobs[id]; allowed={'pause':['running'],'resume':['paused'],'stop':['running','paused']}
            if j['status'] not in allowed[action]: raise HTTPException(409,'Invalid experiment state transition')
            j['status']={'pause':'paused','resume':'running','stop':'stopped'}[action]
    audit('Training '+action,user,str(id)); return {'id':id,'status':jobs[id]['status']}
@app.get('/api/federated/experiments/{id}/{view}')
def experiment_status(id:int,view:Literal['status','metrics','rounds'],user=Depends(current_user)):
    rec=owned_experiment(id,user)
    rows=[r for r in records('round',user) if r['experiment_id']==id][::-1]
    if view in ['metrics','rounds']: return rows
    return {**rec.data,**({k:jobs[id][k] for k in ['status','round','metrics']} if id in jobs else {'metrics':rows})}
@app.get('/api/evaluation/results')
def evaluations(user=Depends(current_user)): return records('evaluation',user)
@app.post('/api/evaluation/run')
def run_evaluation(user=Depends(current_user)):
    results=[]
    for modality in ['image','text','multimodal']:
        torch.manual_seed(42); model=FusionModel()
        config=TrainConfig(modality=modality).model_dump()
        for _ in range(5): train_round(model,[{'seed':i+100,'samples':80,'bias':(i-1)*.1,'name':f'Synthetic client {i+1}'} for i in range(3)],config)
        results.append(save('evaluation',{'modality':modality,'model':'Five-round federated '+modality,**evaluate(model,modality)},user))
    audit('Model evaluation completed',user); return results
@app.get('/api/dashboard/overview')
def overview(user=Depends(current_user)):
    hs=hospitals(user); rounds=records('round',user); ev=evaluations(user)
    return {'hospitals':len(hs),'active':sum(h['active'] for h in hs),'imaging_samples':sum(h['samples'] for h in hs),'clinical_records':sum(h['clinical'] for h in hs),'rounds':len(rounds),'accuracy':ev[0]['accuracy'] if ev else None,'performance':rounds[::-1],'activity':records('audit',user)[:8],'network':hs,'mode':'Synthetic demonstration'}
@app.get('/api/dashboard/analytics')
def analytics(user=Depends(current_user)): return overview(user)
class PrivacyConfig(BaseModel): noise:float=Field(default=0,ge=0,le=2); clip_norm:float=Field(default=1,gt=0,le=10)
@app.get('/api/privacy/status')
def privacy(user=Depends(current_user)):
    configs=records('privacy',user)
    return {'configuration':configs[0] if configs else {'noise':0,'clip_norm':1},'accountant':'Not implemented; no formal epsilon or DP guarantee','mechanism':'Batch gradient clipping with optional Gaussian noise; educational mechanism, not per-example DP-SGD','raw_data_transferred':0,'update_bytes':sum(c['update_bytes'] for r in records('round',user) for c in r['clients']),'limitations':['Model updates can leak information','All simulated clients share one process','Regex masking is incomplete; synthetic data only']}
@app.put('/api/privacy/configuration')
def set_privacy(data:PrivacyConfig,user=Depends(admin)):
    result=save('privacy',data.model_dump(),user); audit('Privacy configuration changed',user); return result
class DatasetInput(BaseModel):
    name:str=Field(min_length=3,max_length=100); hospital_id:int; modality:Literal['MRI','CT','X-ray','Clinical text']; samples:int=Field(ge=1,le=100000)
@app.get('/api/datasets')
def datasets(user=Depends(current_user)): return records('dataset',user)
@app.post('/api/datasets')
def add_dataset(data:DatasetInput,user=Depends(current_user)):
    get_hospital(data.hospital_id,user); result=save('dataset',{**data.model_dump(),'synthetic':True,'purpose':'Synthetic catalog metadata; training uses generated feature distributions'},user); audit('Dataset registered',user,str(result['id'])); return result
@app.delete('/api/datasets/{id}')
def remove_dataset(id:int,user=Depends(current_user)):
    with Session() as db:
        r=db.get(Record,id)
        if not r or r.kind!='dataset' or (r.owner!=user.id and user.role!='admin'): raise HTTPException(404,'Dataset not found')
        db.delete(r); db.commit()
    audit('Dataset deleted',user,str(id)); return {'deleted':id}
@app.get('/api/audit-logs')
def audit_logs(user=Depends(current_user)): return records('audit',user)
@app.get('/api/reports')
def reports(user=Depends(current_user)): return records('report',user)
class ReportInput(BaseModel): format:Literal['json','csv','pdf']='json'
@app.post('/api/reports/generate')
def report(data:ReportInput,user=Depends(current_user)):
    payload={'generated_at':datetime.now(timezone.utc).isoformat(),'scope':'Synthetic research; no clinical validation','overview':overview(user),'evaluations':evaluations(user),'privacy':privacy(user)}
    if data.format=='json': content=json.dumps(payload,indent=2).encode(); media='application/json'
    elif data.format=='csv':
        stream=io.StringIO(); writer=csv.writer(stream); writer.writerow(['modality','accuracy','precision','recall','f1','loss','samples'])
        for r in payload['evaluations']: writer.writerow([r.get(k,'') for k in ['modality','accuracy','precision','recall','f1','loss','samples']])
        content=stream.getvalue().encode(); media='text/csv'
    else:
        from reportlab.pdfgen.canvas import Canvas
        stream=io.BytesIO(); canvas=Canvas(stream); canvas.setFont('Helvetica-Bold',18); canvas.drawString(45,795,'MediFed AI - Research Report'); canvas.setFont('Helvetica',10)
        lines=['Synthetic research only. Not for diagnosis.',payload['generated_at'],f"Hospitals: {payload['overview']['hospitals']}; rounds: {payload['overview']['rounds']}",'Privacy accountant unavailable; no formal DP guarantee.']
        lines += [f"{e.get('modality')}: accuracy={e['accuracy']:.3f}, F1={e['f1']:.3f}, n={e['samples']}" for e in payload['evaluations']]
        y=760
        for line in lines:
            if y<50: canvas.showPage(); canvas.setFont('Helvetica',10); y=790
            canvas.drawString(45,y,line[:110]); y-=20
        canvas.save(); content=stream.getvalue(); media='application/pdf'
    save('report',{'format':data.format,'bytes':len(content)},user); audit('Report exported',user,data.format)
    return Response(content,media_type=media,headers={'Content-Disposition':f'attachment; filename="medifed-report.{data.format}"','Cache-Control':'no-store'})
