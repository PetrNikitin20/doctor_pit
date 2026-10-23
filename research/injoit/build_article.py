from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
from copy import deepcopy
from lxml import etree as E
from PIL import Image
import json,hashlib,re
B=Path(__file__).parent
import os
OUT=Path(os.environ.get('DOCTOR_PIT_OUTPUT_DIR',str(B.parent.parent/'outputs')))
OUT.mkdir(parents=True,exist_ok=True)
FINAL=OUT/'Статья_INJOIT_Численный_метод_выбора_действий.docx'
SRC=B/'template-reference.docx'
assert hashlib.sha256(SRC.read_bytes()).hexdigest()=='013486ec43ad9fb9ec9461dafb71c9c79dab72e27920cdd6805d4def240d6a73'
D=json.loads((B/'manuscript.json').read_text(encoding='utf8'))
NS={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main','r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships','m':'http://schemas.openxmlformats.org/officeDocument/2006/math','a':'http://schemas.openxmlformats.org/drawingml/2006/main','wp':'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing','pic':'http://schemas.openxmlformats.org/drawingml/2006/picture'}
def q(s):a,b=s.split(':');return '{'+NS[a]+'}'+b
def el(s,attrs=None,text=None):
 x=E.Element(q(s))
 for k,v in (attrs or {}).items():x.set(q(k) if ':' in k else k,str(v))
 if text is not None:x.text=text
 return x
with ZipFile(SRC) as z:parts={n:z.read(n) for n in z.namelist()}
root=E.fromstring(parts['word/document.xml']);body=root.find('w:body',NS)
patterns=body.findall('w:p',NS);sect=deepcopy(body.find('w:sectPr',NS))
rels=E.fromstring(parts['word/_rels/document.xml.rels']);ct=E.fromstring(parts['[Content_Types].xml'])
foot=E.fromstring(parts['word/footnotes.xml'])
for x in list(body):body.remove(x)
counter=2000
def rpr(size=None,bold=None,italic=None,math=False):
 x=el('w:rPr');x.append(el('w:rFonts',{'w:ascii':'Cambria Math' if math else 'Times New Roman','w:hAnsi':'Cambria Math' if math else 'Times New Roman','w:cs':'Times New Roman'}))
 if size is not None:
  x.append(el('w:sz',{'w:val':round(size*2)}));x.append(el('w:szCs',{'w:val':round(size*2)}))
 if bold is not None:x.append(el('w:b',{'w:val':int(bold)}))
 if italic is not None:x.append(el('w:i',{'w:val':int(italic)}))
 x.append(el('w:color',{'w:val':'000000'}));x.append(el('w:lang',{'w:val':'ru-RU'}));return x
def run(t,size=None,bold=None,italic=None):
 x=el('w:r');x.append(rpr(size,bold,italic));tt=el('w:t',text=t);tt.set('{http://www.w3.org/XML/1998/namespace}space','preserve');x.append(tt);return x
def prop(pr,name,attrs=None):
 for old in list(pr.findall('w:'+name,NS)):pr.remove(old)
 x=el('w:'+name,attrs);pr.append(x);return x
def para(t='',pat=12,size=None,keep=False,before=None,after=None,align=None):
 global counter;counter+=1
 p=deepcopy(patterns[pat]);pr=p.find('w:pPr',NS)
 if pr is None:pr=el('w:pPr');p.insert(0,pr)
 for x in list(p):
  if x is not pr:p.remove(x)
 for attr in list(p.attrib):
  if 'paraId' in attr or 'textId' in attr or 'rsid' in attr:p.attrib.pop(attr)
 if keep:prop(pr,'keepNext')
 # Source body flow, with widow control enabled to avoid a stranded final line.
 if pat not in [0,1,2]:prop(pr,'widowControl',{'w:val':'1'})
 if before is not None or after is not None:
  sp=pr.find('w:spacing',NS)
  if sp is None:sp=el('w:spacing');pr.append(sp)
  if before is not None:sp.set(q('w:before'),str(before))
  if after is not None:sp.set(q('w:after'),str(after))
 if align:prop(pr,'jc',{'w:val':align})
 if t:p.append(run(t,size))
 body.append(p);return p
def mr(t):
 x=el('m:r');pr=el('m:rPr')
 if len(t.strip())>2 or not any(c.isalpha() for c in t):pr.append(el('m:sty',{'m:val':'p'}))
 x.append(pr);x.append(rpr(10,math=True));x.append(el('m:t',text=t));return x
def wrap(t,items):
 x=el('m:'+t)
 for item in items:x.append(mr(item) if isinstance(item,str) else item)
 return x
def sub(b,i):return wrap('sSub',[wrap('e',[b]),wrap('sub',[i])])
def sup(b,i):return wrap('sSup',[wrap('e',[b]),wrap('sup',[i])])
def ss(b,i,j):return wrap('sSubSup',[wrap('e',[b]),wrap('sub',[i]),wrap('sup',[j])])
def frac(a,b):return wrap('f',[wrap('num',a if isinstance(a,list) else [a]),wrap('den',b if isinstance(b,list) else [b])])
def nary(char,lo,hi,items):
 x=el('m:nary');pr=el('m:naryPr');pr.append(el('m:chr',{'m:val':char}));pr.append(el('m:limLoc',{'m:val':'subSup'}));x.append(pr)
 x.append(wrap('sub',[lo]));x.append(wrap('sup',[hi]));x.append(wrap('e',items));return x
def eqline(items,n=None,keep=False):
 p=para('',51,keep=keep,before=50,after=50,align='left');pr=p.find('w:pPr',NS)
 prop(pr,'ind',{'w:firstLine':'0'});tabs=prop(pr,'tabs');tabs.append(el('w:tab',{'w:val':'center','w:pos':'2400'}));tabs.append(el('w:tab',{'w:val':'right','w:pos':'4819'}))
 rr=el('w:r');rr.append(el('w:tab'));p.append(rr);o=el('m:oMath')
 for item in items:o.append(mr(item) if isinstance(item,str) else item)
 p.append(o)
 if n:
  rr=el('w:r');rr.append(el('w:tab'));p.append(rr);p.append(run('('+str(n)+')',10))
def equation(n):
 if n==1:
  eqline([sub('θ','sj'),' | E ∼ Beta(',sub('a','sj'),', ',sub('b','sj'),');'],keep=True)
  eqline([sub('a','sj'),' = 1 + ',sub('z','sj'),',  ',sub('b','sj'),' = 1 + ',sub('n','sj'),' − ',sub('z','sj')],n)
 if n==2:
  eqline([sub('p','s'),' = ',nary('∏','j=1','2',['[1 − ',sub('I','τ'),'(',sub('a','sj'),', ',sub('b','sj'),')]']),';'],keep=True)
  eqline([sub('ρ','s'),' = ',nary('∑','j=1','2',[sub('I','τ'),'(',sub('a','sj'),', ',sub('b','sj'),')'])],n)
 if n==3:
  eqline(['Pr(H = h | a, b, ν) ='],keep=True)
  eqline([ss('C','ν','h'),frac([sub('(a)','h'),sub('(b)','ν−h')],sub('(a+b)','ν')),',  h = 0,…,ν'],n)
 if n==4:
  eqline([sub('L','s'),'(',sub('D','jν'),') = ',sub('d','ν'),' +'],keep=True)
  eqline([nary('∑','h=0','ν',['Pr(H=h) V(',sub('ℬ','sjν'),'(h))'])],n)
 if n==5:
  eqline(['max G = ',nary('∑','s=1','S',[nary('∑','a∈Aₛ','',[sub('g','sa'),sub('x','sa')])]),';'],keep=True)
  eqline([nary('∑','a∈Aₛ','',[sub('x','sa')]),' = 1,  ',sub('x','sa'),' ∈ {0,1};'],keep=True)
  eqline([nary('∑','s,a','',[sub('t','sa'),sub('x','sa')]),' ≤ T,  ',nary('∑','s,a','',[sub('c','sa'),sub('x','sa')]),' ≤ C'],n)
 if n==6:
  eqline(['n = a + b − 1;'],keep=True)
  eqline([sub('I','4/5'),'(a,b) = ',sup('5','−n'),nary('∑','ℓ=a','n',[ss('C','n','ℓ'),sup('4','ℓ')])],n)
 if n==7:
  eqline([sub('F','s'),'(t,c) = ',sub('max','a∈Aₛ'),'{',sub('F','s−1'),'(t−',sub('t','sa'),',c−',sub('c','sa'),')'],keep=True)
  eqline(['+ ',sub('h','sa'),'}'],n)
 if n==8:eqline(['t′ ≤ t,  c′ ≤ c,  H′ ≥ H'],n)
 if n==9:
  eqline(['0 ≤ G* − G(',sub('x','ε'),') ≤ Sε;'],keep=True)
  eqline(['0 ≤ ',sub('J','ε'),' − J* ≤ Sε'],n)

def table(b):
 para('ТАБЛИЦА '+b['number']+'. '+b['title'],109,size=8,keep=True,before=90,after=50,align='center')
 t=el('w:tbl');pr=el('w:tblPr');pr.append(el('w:tblW',{'w:w':'4819','w:type':'dxa'}));pr.append(el('w:tblLayout',{'w:type':'fixed'}));pr.append(el('w:jc',{'w:val':'center'}))
 borders=el('w:tblBorders')
 for side in ['top','left','bottom','right','insideH','insideV']:borders.append(el('w:'+side,{'w:val':'single','w:sz':'4','w:color':'D9D9D9'}))
 pr.append(borders);t.append(pr);grid=el('w:tblGrid');widths=[round(x*4819/sum(b['widths'])) for x in b['widths']]
 for width in widths:grid.append(el('w:gridCol',{'w:w':width}))
 t.append(grid)
 for ri,row in enumerate([b['headers']]+b['rows']):
  tr=el('w:tr');trpr=el('w:trPr');trpr.append(el('w:cantSplit'))
  if ri==0:trpr.append(el('w:tblHeader'))
  tr.append(trpr)
  for width,text in zip(widths,row):
   tc=el('w:tc');cp=el('w:tcPr');cp.append(el('w:tcW',{'w:w':width,'w:type':'dxa'}));cp.append(el('w:vAlign',{'w:val':'center'}));mar=el('w:tcMar')
   for edge in ['top','bottom','left','right']:mar.append(el('w:'+edge,{'w:w':'55','w:type':'dxa'}))
   cp.append(mar)
   if ri==0:cp.append(el('w:shd',{'w:fill':'F2F2F2'}))
   tc.append(cp);pp=el('w:p');pppr=el('w:pPr');pppr.append(el('w:spacing',{'w:before':'0','w:after':'0','w:line':'240','w:lineRule':'auto'}));pppr.append(el('w:jc',{'w:val':'center'}))
   if ri<len(b['rows']):pppr.append(el('w:keepNext'))
   pp.append(pppr);pp.append(run(text,8));tc.append(pp);tr.append(tc)
  t.append(tr)
 body.append(t)
 para('',109,size=2,after=20)

def figure(b):
 fn=B/b['file'];part='word/media/numeric_budget.png';parts[part]=fn.read_bytes();rid='rIdNumericalFigure'
 rels.append(E.Element('{http://schemas.openxmlformats.org/package/2006/relationships}Relationship',Id=rid,Type=NS['r']+'/image',Target='media/numeric_budget.png'))
 if not ct.xpath('//*[local-name()="Default"][@Extension="png"]'):ct.append(E.Element('{http://schemas.openxmlformats.org/package/2006/content-types}Default',Extension='png',ContentType='image/png'))
 with Image.open(fn) as im:ww,hh=im.size
 cx=round(8.5*360000);cy=round(cx*hh/ww)
 p=para('',8,keep=True,before=70,after=30,align='center');prop(p.find('w:pPr',NS),'ind',{'w:firstLine':'0'})
 rr=el('w:r');drawing=el('w:drawing');inline=el('wp:inline',{'distT':'0','distB':'0','distL':'0','distR':'0'})
 inline.append(el('wp:extent',{'cx':cx,'cy':cy}));inline.append(el('wp:docPr',{'id':'900','name':'Рисунок 1','descr':b['title']}))
 graphic=el('a:graphic');gd=el('a:graphicData',{'uri':NS['pic']});pic=el('pic:pic');nv=el('pic:nvPicPr');nv.append(el('pic:cNvPr',{'id':'900','name':'budget.png'}));nv.append(el('pic:cNvPicPr'));pic.append(nv)
 bf=el('pic:blipFill');bf.append(el('a:blip',{'r:embed':rid}));stretch=el('a:stretch');stretch.append(el('a:fillRect'));bf.append(stretch);pic.append(bf)
 sp=el('pic:spPr');xf=el('a:xfrm');xf.append(el('a:off',{'x':'0','y':'0'}));xf.append(el('a:ext',{'cx':cx,'cy':cy}));sp.append(xf);geom=el('a:prstGeom',{'prst':'rect'});geom.append(el('a:avLst'));sp.append(geom);pic.append(sp)
 gd.append(pic);graphic.append(gd);inline.append(graphic);drawing.append(inline);rr.append(drawing);p.append(rr)
 para(b['title'],109,size=8,after=65)

# Retain the source's unnumbered author-footnote anchor and full-width title frames.
body.append(deepcopy(patterns[0]))
para(D['title'],1)
para('Никитин Пётр Владимирович',2)
p=para('',3);p.append(run('Аннотация–',9,bold=True,italic=True));p.append(run(D['abstract'],9,bold=True))
para('',4)
p=para('',5);p.append(run('Ключевые слова–',9,bold=True,italic=True));p.append(run(D['keywords']+'.',9,bold=True))
para('',6)
for b in D['blocks']:
 if b['type']=='heading':para(b['text'],7,keep=True)
 elif b['type']=='subheading':para(b['text'],17,keep=True)
 elif b['type']=='paragraph':
  p=para('',12)
  for segment in re.split('(c𝓌|d_q)',b['text']):
   if segment in ['c𝓌','d_q']:
    o=el('m:oMath');o.append(sub('c','W') if segment=='c𝓌' else sub('d','q'));p.append(o)
   elif segment:p.append(run(segment))
 elif b['type']=='equation':equation(b['id'])
 elif b['type']=='table':table(b)
 elif b['type']=='figure':figure(b)
para('Библиография',78,keep=True)
for i,text in enumerate(D['references'],1):
 p=para('',82,size=8);pr=p.find('w:pPr',NS);prop(pr,'numPr').append(el('w:numId',{'w:val':'0'}));prop(pr,'ind',{'w:left':'350','w:hanging':'350'});tabs=prop(pr,'tabs');tabs.append(el('w:tab',{'w:val':'left','w:pos':'350'}))
 p.append(run('['+str(i)+']',8));rr=el('w:r');rr.append(el('w:tab'));p.append(rr);p.append(run(text,8))
# Required last English page; retain the same title/author/abstract components.
p=para('',8);prop(p.find('w:pPr',NS),'pageBreakBefore')
para(D['title_en'],1)
para('Petr V. Nikitin',2)
para('Financial University under the Government of the Russian Federation, Moscow, Russia',8,align='center')
p=para('',3);p.append(run('Abstract–',9,bold=True,italic=True));p.append(run(D['abstract_en'],9,bold=True))
para('',4)
p=para('',5);p.append(run('Keywords–',9,bold=True,italic=True));p.append(run(D['keywords_en']+'.',9,bold=True))
para('Corresponding author: pvnikitin@fa.ru. ORCID: 0000-0001-8866-5610.',8)
body.append(sect)

for fn in list(foot.findall('w:footnote',NS)):
 i=int(fn.get(q('w:id')))
 if i>1:foot.remove(fn)
 elif i==1:
  old=fn.find('w:p',NS);pr=deepcopy(old.find('w:pPr',NS))
  for x in list(fn):fn.remove(x)
  pp=el('w:p')
  if pr is not None:pp.append(pr)
  pp.append(run('Никитин Пётр Владимирович – Финансовый университет при Правительстве Российской Федерации, кафедра искусственного интеллекта, Москва, Россия (e-mail: pvnikitin@fa.ru). ORCID: 0000-0001-8866-5610.',8));fn.append(pp)
parts['word/document.xml']=E.tostring(root,xml_declaration=True,encoding='UTF-8',standalone=True)
parts['word/footnotes.xml']=E.tostring(foot,xml_declaration=True,encoding='UTF-8',standalone=True)
parts['word/_rels/document.xml.rels']=E.tostring(rels,xml_declaration=True,encoding='UTF-8',standalone=True)
parts['[Content_Types].xml']=E.tostring(ct,xml_declaration=True,encoding='UTF-8',standalone=True)
core=E.fromstring(parts['docProps/core.xml'])
for local,value in [('title',D['title']),('creator','Никитин Пётр Владимирович'),('lastModifiedBy','Никитин Пётр Владимирович'),('subject','Численный метод ресурсно-согласованного выбора действий')]:
 nodes=core.xpath('//*[local-name()="'+local+'"]')
 if nodes:nodes[0].text=value
parts['docProps/core.xml']=E.tostring(core,xml_declaration=True,encoding='UTF-8',standalone=True)
OUT.mkdir(exist_ok=True)
with ZipFile(FINAL,'w',ZIP_DEFLATED) as z:
 for n,content in parts.items():z.writestr(n,content)
print(FINAL)
