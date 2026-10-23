from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
from copy import deepcopy
from lxml import etree as E
from PIL import Image
import hashlib,json,re
BASE=Path(__file__).parent;import os
OUT=Path(os.environ.get('DOCTOR_PIT_OUTPUT_DIR',str(BASE.parent.parent/'outputs')))
OUT.mkdir(parents=True,exist_ok=True)
SRC=BASE/'template-reference.docx'
FINAL=OUT/'Статья_Никитин_Междисциплинарные_переходы_SITITO.docx'
EXPECTED='d708cba024080d6422dd81270b88f9eb2a5743a9fa1dc310c8bb49040d1e49b8'
assert hashlib.sha256(SRC.read_bytes()).hexdigest()==EXPECTED
DATA=json.loads((BASE/'manuscript.json').read_text(encoding='utf8'))
NS={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main','r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships','m':'http://schemas.openxmlformats.org/officeDocument/2006/math','wp':'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing','a':'http://schemas.openxmlformats.org/drawingml/2006/main','pic':'http://schemas.openxmlformats.org/drawingml/2006/picture'}
def tag(s):a,b=s.split(':');return '{'+NS[a]+'}'+b
def el(s,attrs=None,text=None):
 x=E.Element(tag(s))
 for k,v in (attrs or {}).items():x.set(tag(k) if ':' in k else k,str(v))
 x.text=text;return x
with ZipFile(SRC) as z:parts={n:z.read(n) for n in z.namelist()}
doc=E.fromstring(parts['word/document.xml']);body=doc.find('w:body',NS)
source_ps=body.findall('w:p',NS);section=deepcopy(body.find('w:sectPr',NS));license_table=deepcopy(body.find('w:tbl',NS))
styles=E.fromstring(parts['word/styles.xml']);rels=E.fromstring(parts['word/_rels/document.xml.rels']);ct=E.fromstring(parts['[Content_Types].xml']);footnotes=E.fromstring(parts['word/footnotes.xml'])
for c in list(body):body.remove(c)
def rpr(size=10,bold=False,italic=False,math=False):
 rp=el('w:rPr');rp.append(el('w:rFonts',{'w:ascii':'Cambria Math' if math else 'Times New Roman','w:hAnsi':'Cambria Math' if math else 'Times New Roman','w:cs':'Times New Roman'}))
 rp.append(el('w:sz',{'w:val':round(size*2)}));rp.append(el('w:szCs',{'w:val':round(size*2)}));rp.append(el('w:color',{'w:val':'000000'}))
 rp.append(el('w:b',{'w:val':int(bold)}));rp.append(el('w:i',{'w:val':int(italic)}));rp.append(el('w:lang',{'w:val':'ru-RU'}));return rp
def run(txt,size=10,bold=False,italic=False):
 r=el('w:r');r.append(rpr(size,bold,italic));t=el('w:t',text=txt);t.set('{http://www.w3.org/XML/1998/namespace}space','preserve');r.append(t);return r
def prop(pp,name,attrs=None):
 x=pp.find('w:'+name,NS)
 if x is not None:pp.remove(x)
 x=el('w:'+name,attrs);pp.append(x);return x
def paragraph(txt='',pattern=114,size=10,bold=False,italic=False,before=0,after=65,align='both',indent=0,keep=False,break_before=False):
 p=deepcopy(source_ps[pattern]);pr=p.find('w:pPr',NS)
 if pr is None:pr=el('w:pPr');p.insert(0,pr)
 for c in list(p):
  if c is not pr:p.remove(c)
 for n in ['rPr','numPr','tabs','keepNext','keepLines','pageBreakBefore','ind','pBdr']:
  x=pr.find('w:'+n,NS)
  if x is not None:pr.remove(x)
 prop(pr,'spacing',{'w:before':before,'w:after':after,'w:line':'240','w:lineRule':'auto'})
 prop(pr,'jc',{'w:val':align});prop(pr,'widowControl')
 if indent:prop(pr,'ind',{'w:firstLine':indent})
 if keep:prop(pr,'keepNext')
 if break_before:prop(pr,'pageBreakBefore')
 if txt:p.append(run(txt,size,bold,italic))
 body.append(p);return p
def heading(t,break_before=False):return paragraph(t,113,14,True,before=150,after=100,align='left',keep=True,break_before=break_before)
title_style=el('w:style',{'w:type':'paragraph','w:styleId':'Title'})
title_style.extend([el('w:name',{'w:val':'Title'}),el('w:basedOn',{'w:val':'Normal'}),el('w:qFormat')])
sp=el('w:pPr');sp.append(el('w:spacing',{'w:before':'100','w:after':'160'}));sp.append(el('w:keepNext'));title_style.append(sp);title_style.append(rpr(16,True))
old=styles.find("w:style[@w:styleId='Title']",NS)
if old is not None:styles.remove(old)
styles.append(title_style)
def title(t):
 p=paragraph(t,10,16,True,before=100,after=160,align='left',keep=True);prop(p.find('w:pPr',NS),'pStyle',{'w:val':'Title'});return p
def footnote(p,text):
 i=100+len(footnotes)
 r=el('w:r');pr=rpr(8);pr.append(el('w:vertAlign',{'w:val':'superscript'}));r.append(pr);r.append(el('w:footnoteReference',{'w:id':i}));p.append(r)
 fn=el('w:footnote',{'w:id':i});pp=el('w:p');pr=el('w:pPr');pr.append(el('w:spacing',{'w:after':'0','w:line':'240','w:lineRule':'auto'}));pp.append(pr)
 rr=el('w:r');rp=rpr(8);rp.append(el('w:vertAlign',{'w:val':'superscript'}));rr.append(rp);rr.append(el('w:footnoteRef'));pp.append(rr);pp.append(run(' '+text,8));fn.append(pp);footnotes.append(fn)
def mr(t):
 r=el('m:r');rp=el('m:rPr');rp.append(el('m:sty',{'m:val':'p'}));r.append(rp);r.append(rpr(10,math=True));r.append(el('m:t',text=t));return r
def wrap(t,items):
 x=el('m:'+t)
 for item in items:x.append(mr(item) if isinstance(item,str) else item)
 return x
def sub(b,i):return wrap('sSub',[wrap('e',[b]),wrap('sub',[i])])
def sup(b,i):return wrap('sSup',[wrap('e',[b]),wrap('sup',[i])])
def frac(a,b):return wrap('f',[wrap('num',a if isinstance(a,list) else [a]),wrap('den',b if isinstance(b,list) else [b])])
def sum_(lower,upper,items):
 x=el('m:nary');pr=el('m:naryPr');pr.append(el('m:chr',{'m:val':'∑'}));pr.append(el('m:limLoc',{'m:val':'subSup'}));x.append(pr);x.append(wrap('sub',[lower]));x.append(wrap('sup',[upper]));x.append(wrap('e',items));return x
def eqline(items,n=None):
 p=paragraph('',26,before=70,after=80,align='center');pr=p.find('w:pPr',NS);prop(pr,'keepLines')
 o=el('m:oMath')
 for x in items:o.append(mr(x) if isinstance(x,str) else x)
 if n:o.append(mr('    ('+str(n)+')'))
 p.append(o);return p
def equation(n):
 if n==1:eqline([sub('H','v'),' = (D ∪ U ∪ K ∪ L ∪ Q, ',sub('E','v'),');  e = (',sub('I','e'),', ',sub('u','e'),', ',sub('type','e'),')'],n)
 elif n==2:eqline(['∀k ∈ ',sub('K','req'),':  ',sum_('u∈U','',[sub('a','ukℓ*'),sub('x','u')]),' ≥ 1;  ',sum_('u∈U','',[sub('b','ukℓ*'),sub('x','u')]),' ≥ 1'],n)
 elif n==3:eqline([sup(sub('E','skℓ'),'∗'),'(t) = {r ∈ ',sub('E','skℓ'),': ',sub('V','r'),' = 1,  0 ≤ t − ',sub('t','r'),' ≤ Δ}'],n)
 elif n==4:
  eqline([sub('θ','skℓ'),' | E* ∼ Beta(a,b);  a = ',sub('a','0'),' + ',sum_('r∈E*','',[sub('z','r')]),',  b = ',sub('b','0'),' + ',sum_('r∈E*','',['(1−',sub('z','r'),')'])],n)
 elif n==5:
  eqline([sub('δ','ej'),' > 0;  ',sum_('j=1',sub('m','e'),[sub('δ','ej')]),' ≤ ',sub('δ','e'),';  ',sub('δ','ej'),' = ',frac(sub('δ','e'),sub('m','e')),'  при равном распределении'])
  eqline([sub('q','ej'),' = ',sup(sub('F','Beta(aⱼ,bⱼ)'),'−1'),'(',sub('δ','ej'),')'],n)
 elif n==6:
  eqline([sub('Allow','se'),' = ',sub('W','e'),' ∧ ',sub('T','e'),' ∧ ',sub('∀','j∈Iₑ'),' [',sub('q','ej'),' ≥ ',sub('τ','j'),' ∧ ',sub('N','j'),' ≥ ',sub('n','min'),']'],n)
 elif n==7:
  eqline(['Pr(∀j ∈ ',sub('I','e'),': ',sub('θ','j'),' ≥ ',sub('τ','j'),' | E*) ≥ 1 − ',sum_('j∈Iₑ','',['Pr(',sub('θ','j'),' < ',sub('τ','j'),' | E*)'])])
  eqline(['≥ 1 − ',sum_('j∈Iₑ','',[sub('δ','ej')]),' ≥ 1 − ',sub('δ','e')],n)
 elif n==8:eqline([sub('I','x'),'(a,b) = ',sum_('k=a','a+b−1',[sub('C','a+b−1,k'),sup('x','k'),sup('(1−x)','a+b−1−k')])],n)
 elif n==9:
  eqline([sub('q','e'),' = ',sup('(δ/m)',frac('1','n+1')),';  ',sub('n','min'),' = ⌈',frac('ln(δ/m)','ln τ'),'⌉ − 1'],n)
def table(b):
 paragraph('Таблица '+str(b['number'])+' / Table '+str(b['number']),26,10,italic=True,before=100,after=40,align='right',keep=True)
 paragraph(b['title'],26,10,True,after=80,align='left',keep=True)
 t=el('w:tbl');pr=el('w:tblPr');pr.append(el('w:tblW',{'w:w':'9520','w:type':'dxa'}));pr.append(el('w:tblLayout',{'w:type':'fixed'}));pr.append(el('w:jc',{'w:val':'center'}))
 borders=el('w:tblBorders')
 for name in ['top','left','bottom','right','insideH','insideV']:borders.append(el('w:'+name,{'w:val':'single','w:sz':'4','w:color':'D9D9D9'}))
 pr.append(borders);t.append(pr);grid=el('w:tblGrid');widths=[round(w*9520/sum(b['widths'])) for w in b['widths']]
 for w in widths:grid.append(el('w:gridCol',{'w:w':w}))
 t.append(grid)
 for ri,row in enumerate([b['headers']]+b['rows']):
  tr=el('w:tr');trpr=el('w:trPr');trpr.append(el('w:cantSplit'))
  if ri==0:trpr.append(el('w:tblHeader'))
  tr.append(trpr)
  for ci,(w,txt) in enumerate(zip(widths,row)):
   tc=el('w:tc');cp=el('w:tcPr');cp.append(el('w:tcW',{'w:w':w,'w:type':'dxa'}));cp.append(el('w:vAlign',{'w:val':'center'}));m=el('w:tcMar')
   for name in ['top','bottom','left','right']:m.append(el('w:'+name,{'w:w':'70','w:type':'dxa'}))
   cp.append(m)
   if ri==0:cp.append(el('w:shd',{'w:fill':'E7E6E6'}))
   tc.append(cp);pp=el('w:p');ppr=el('w:pPr');ppr.append(el('w:spacing',{'w:after':'0','w:line':'240','w:lineRule':'auto'}));ppr.append(el('w:jc',{'w:val':'center' if b['number']==3 or (b['number']==1 and ci==0) else 'left'}));pp.append(ppr);pp.append(run(txt,9.5,ri==0));tc.append(pp);tr.append(tc)
  t.append(tr)
 body.append(t);paragraph('',26,size=2,after=30)
draw_id=50
def figure(b):
 global draw_id;draw_id+=1
 f=BASE/b['file'];ext='png';part='word/media/article_'+b['file'];parts[part]=f.read_bytes();rid='rIdArticle'+str(draw_id)
 rel=E.Element('{http://schemas.openxmlformats.org/package/2006/relationships}Relationship',Id=rid,Type=NS['r']+'/image',Target='media/article_'+b['file']);rels.append(rel)
 with Image.open(f) as im:w,h=im.size
 cx=round(16.6*360000);cy=round(cx*h/w)
 p=paragraph('',26,before=60,after=30,align='center',keep=True);r=el('w:r');drawing=el('w:drawing');inline=el('wp:inline',{'distT':'0','distB':'0','distL':'0','distR':'0'})
 inline.append(el('wp:extent',{'cx':cx,'cy':cy}));inline.append(el('wp:docPr',{'id':draw_id,'name':b['title'],'descr':b['title']}));gf=el('a:graphic');gd=el('a:graphicData',{'uri':NS['pic']});pic=el('pic:pic');nv=el('pic:nvPicPr');nv.append(el('pic:cNvPr',{'id':draw_id,'name':b['file']}));nv.append(el('pic:cNvPicPr'));pic.append(nv)
 bf=el('pic:blipFill');bf.append(el('a:blip',{'r:embed':rid}));st=el('a:stretch');st.append(el('a:fillRect'));bf.append(st);pic.append(bf)
 sp=el('pic:spPr');xf=el('a:xfrm');xf.append(el('a:off',{'x':'0','y':'0'}));xf.append(el('a:ext',{'cx':cx,'cy':cy}));sp.append(xf);g=el('a:prstGeom',{'prst':'rect'});g.append(el('a:avLst'));sp.append(g);pic.append(sp);gd.append(pic);gf.append(gd);inline.append(gf);drawing.append(inline);r.append(drawing);p.append(r)
 paragraph('Рис. '+str(b['number'])+'. '+b['title'],26,10,after=60,align='center')

# Front matter source patterns, with placeholders intentionally removed.
paragraph('УДК 004.8:519.6:378.14',0,10,True,align='left',after=70)
paragraph('Оригинальная статья',5,10,align='left',after=80,keep=True)
title(DATA['title'])
paragraph('П. В. Никитин',17,12,True,align='left',after=100,keep=True)
paragraph('Финансовый университет при Правительстве Российской Федерации, г. Москва, Российская Федерация',18,align='left',after=30)
paragraph('Адрес: 125167, Российская Федерация, г. Москва, Ленинградский проспект, д. 49/2',19,align='left',after=30)
paragraph('pvnikitin@fa.ru   •   ORCID: 0000-0001-8866-5610',20,align='left',after=140)
paragraph('Аннотация',25,12,True,align='left',keep=True,after=80)
for label,txt in DATA['abstract_ru']:
 p=paragraph('',28,after=70);p.append(run(label+' ',10,True));p.append(run(txt))
paragraph('Ключевые слова: интеллектуальная обучающая система, междисциплинарное обучение, математическая модель, индивидуальная образовательная траектория, граф предпосылок, бета-распределение, перенос знаний, происхождение свидетельств',44,after=100)
paragraph('© Никитин П. В., 2026',53,align='left',after=50)
# Correct only missing word spaces in the template's license line, keeping the component.
for node in license_table.findall('.//w:t',NS):
 if node.text:node.text=node.text.replace('Контентдоступенподлицензией','Контент доступен под лицензией')
body.append(license_table)
paragraph('Original article',59,align='left',break_before=True,after=80,keep=True)
title(DATA['title_en'])
paragraph('P. V. Nikitin',72,12,True,align='left',after=100,keep=True)
paragraph('Financial University under the Government of the Russian Federation, Moscow, Russian Federation',73,align='left',after=30)
paragraph('Address: 49/2 Leningradsky Prospekt, Moscow 125167, Russian Federation',74,align='left',after=30)
paragraph('pvnikitin@fa.ru   •   ORCID: 0000-0001-8866-5610',75,align='left',after=140)
paragraph('Abstract',80,12,True,align='left',keep=True,after=80)
for label,txt in DATA['abstract_en']:
 p=paragraph('',83,after=70);p.append(run(label+' ',10,True));p.append(run(txt))
paragraph('Keywords: intelligent learning system, interdisciplinary learning, mathematical model, individual learning path, prerequisite graph, Beta distribution, knowledge transfer, evidence provenance',100,after=70)
for i,b in enumerate(DATA['blocks']):
 if b['type']=='heading':heading(b['text'],i==0)
 elif b['type']=='paragraph':
  pp=paragraph(b['text'],114,indent=709)
  if b.get('footnote'):footnote(pp,b['footnote'])
 elif b['type']=='equation':equation(b['id'])
 elif b['type']=='table':table(b)
 elif b['type']=='figure':figure(b)
paragraph('Список литературы / References',124,12,True,before=150,after=110,align='center',keep=True)
for ref in DATA['references']:
 p=paragraph(str(ref['n'])+'. '+ref['ru'],125,after=55,align='both')
 pr=p.find('w:pPr',NS);prop(pr,'ind',{'w:left':'360','w:hanging':'360'})
 if ref['ru']!=ref['en']:
  rr=el('w:r');rr.append(el('w:br'));p.append(rr);p.append(run(ref['en']))
heading('Об авторе')
paragraph('Никитин Пётр Владимирович, кандидат педагогических наук, доцент, доцент кафедры искусственного интеллекта Факультета информационных технологий и анализа больших данных, Финансовый университет при Правительстве Российской Федерации (125167, Российская Федерация, г. Москва, Ленинградский проспект, д. 49/2), ORCID: 0000-0001-8866-5610, pvnikitin@fa.ru.',157,after=90)
heading('About the author')
paragraph('Petr V. Nikitin, Candidate of Pedagogical Sciences, Associate Professor, Department of Artificial Intelligence, Faculty of Information Technology and Big Data Analysis, Financial University under the Government of the Russian Federation (49/2 Leningradsky Prospekt, Moscow 125167, Russian Federation), ORCID: 0000-0001-8866-5610, pvnikitin@fa.ru.',166,after=70)
body.append(section)

def xml(x):return E.tostring(x,encoding='UTF-8',xml_declaration=True,standalone=True)
parts['word/document.xml']=xml(doc);parts['word/styles.xml']=xml(styles);parts['word/_rels/document.xml.rels']=xml(rels);parts['word/footnotes.xml']=xml(footnotes)
# Existing template already declares PNG and footnotes. Add declarations only if missing.
ctns='http://schemas.openxmlformats.org/package/2006/content-types'
if not ct.xpath('c:Default[@Extension="png"]',namespaces={'c':ctns}):
 ct.append(E.Element('{'+ctns+'}Default',Extension='png',ContentType='image/png'));parts['[Content_Types].xml']=xml(ct)
OUT.mkdir(exist_ok=True)
with ZipFile(FINAL,'w',ZIP_DEFLATED) as z:
 for name,data in parts.items():z.writestr(name,data)
with ZipFile(SRC) as a,ZipFile(FINAL) as b:
 changed=[n for n in a.namelist() if a.read(n)!=b.read(n)];added=[n for n in b.namelist() if n not in a.namelist()]
allowed=['word/document.xml','word/styles.xml','word/_rels/document.xml.rels','word/footnotes.xml','[Content_Types].xml']
assert not set(changed)-set(allowed),changed
assert E.tostring(section)==E.tostring(body.find('w:sectPr',NS))
assert hashlib.sha256(SRC.read_bytes()).hexdigest()==EXPECTED
audit={'output':str(FINAL),'changed_parts':changed,'added_parts':added,'preserve_only_pass':True,'equations':len(doc.findall('.//m:oMath',NS)),'tables':len(doc.findall('.//w:tbl',NS)),'figures':len(doc.findall('.//w:drawing',NS)),'references':len(DATA['references']),'source_unchanged':True}
(BASE/'package_audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(audit,ensure_ascii=False,indent=2))
