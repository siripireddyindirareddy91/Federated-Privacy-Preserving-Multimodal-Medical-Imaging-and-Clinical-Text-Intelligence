import copy
import re
import time
import numpy as np
import torch
from torch import nn
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix, roc_auc_score

torch.set_num_threads(1)
TERMS = ['opacity','infiltrate','lesion','mass','fever','cough','pain','dyspnea','normal','clear','stable','unremarkable','improved','negative','healthy','routine']

def deidentify(text):
    for pattern, label in [(r'[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}', 'EMAIL'), (r'\b(?:\+?\d[\d ()-]{7,}\d)\b','PHONE'), (r'(?im)\b(?:patient(?: name)?|name|mrn|dob|address)\s*:\s*[^\n,;]+','IDENTIFIER')]:
        text = re.sub(pattern, f'[{label}]', text)
    return text

def text_features(text):
    words = re.findall(r'[a-z]+', text.lower())
    return np.array([min(words.count(t), 4)/4 for t in TERMS], dtype=np.float32)

def image_features(image):
    return (np.asarray(image.convert('L').resize((4,4)), dtype=np.float32)/255).flatten()

class FusionModel(nn.Module):
    def __init__(self):
        super().__init__()
        self.image = nn.Sequential(nn.Linear(16, 8), nn.Tanh())
        self.text = nn.Sequential(nn.Linear(16, 8), nn.Tanh())
        self.head = nn.Linear(16, 2)
    def forward(self, x):
        return self.head(torch.cat([self.image(x[:,:16]), self.text(x[:,16:])], 1))

def synthetic(seed, count=80, bias=0, modality='multimodal'):
    rng = np.random.default_rng(seed)
    x = rng.normal(0, .2, (count,32)).astype('float32')
    y = (rng.random(count) > .5+bias).astype('int64')
    x[:,:8] += y[:,None]*.9
    x[:,16:24] += y[:,None]*.7
    x[:,24:32] += (1-y[:,None])*.7
    if modality == 'image': x[:,16:] = 0
    if modality == 'text': x[:,:16] = 0
    return torch.tensor(x), torch.tensor(y)

def aggregate(updates):
    total = sum(n for _,n in updates)
    if total <= 0: raise ValueError('No client samples')
    return {k:sum(state[k]*(n/total) for state,n in updates) for k in updates[0][0]}

def evaluate(model, modality='multimodal'):
    x,y = synthetic(9182, 180, modality=modality)
    model.eval()
    with torch.no_grad():
        logits=model(x); prob=logits.softmax(1)[:,1].numpy(); pred=logits.argmax(1).numpy()
        loss=nn.functional.cross_entropy(logits,y).item()
    p,r,f,_=precision_recall_fscore_support(y.numpy(),pred,average='binary',zero_division=0)
    return dict(accuracy=float(accuracy_score(y,pred)), precision=float(p), recall=float(r), f1=float(f), auc=float(roc_auc_score(y,prob)), loss=loss, confusion_matrix=confusion_matrix(y,pred,labels=[0,1]).tolist(), samples=180, split='Independent synthetic held-out set; seed 9182')

def train_round(model, clients, config):
    started=time.perf_counter(); updates=[]; metrics=[]
    for client in clients:
        local=copy.deepcopy(model); local.train()
        x,y=synthetic(client['seed'], client['samples'], client['bias'],config['modality'])
        optimizer=torch.optim.SGD(local.parameters(),lr=config['learning_rate'])
        for _ in range(config['epochs']):
            for batch in range(0,len(y),config['batch_size']):
                optimizer.zero_grad(); loss=nn.functional.cross_entropy(local(x[batch:batch+config['batch_size']]),y[batch:batch+config['batch_size']])
                if config['strategy']=='FedProx': loss=loss+.01*sum((a-b.detach()).pow(2).sum() for a,b in zip(local.parameters(),model.parameters()))
                loss.backward()
                nn.utils.clip_grad_norm_(local.parameters(),config['clip_norm'])
                if config['noise']>0:
                    for p in local.parameters(): p.grad.add_(torch.randn_like(p.grad)*config['noise']*config['clip_norm']/config['batch_size'])
                optimizer.step()
        state={k:v.detach().clone() for k,v in local.state_dict().items()}
        updates.append((state,len(y)))
        metrics.append({'hospital':client['name'],'samples':len(y),'loss':float(loss.detach()),'update_bytes':sum(v.numel()*v.element_size() for v in state.values())})
    model.load_state_dict(aggregate(updates))
    return {**evaluate(model,config['modality']),'clients':metrics,'aggregation_seconds':time.perf_counter()-started}

def analyze_text(text):
    cleaned=deidentify(text); emb=text_features(cleaned)
    entities=[{'term':t,'count':len(re.findall(r'\b'+t+r'\b',cleaned.lower()))} for t in TERMS if re.search(r'\b'+t+r'\b',cleaned.lower())]
    return {'deidentified_text':cleaned,'entities':entities,'embedding':emb.tolist(),'dimensions':16,'tokens':len(cleaned.split()),'model':'Transparent clinical keyword encoder (fallback)','classification':'Research keyword representation','notice':'No diagnostic or severity interpretation; negation is not resolved.'}
