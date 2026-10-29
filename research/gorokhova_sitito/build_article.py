"""Build an author-review manuscript from the retained SITITO DOCX package."""
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
from copy import deepcopy
from lxml import etree as E
from PIL import Image
import argparse,json,re,hashlib,html

BASE=Path(__file__).parent
NS={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main','r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships','wp':'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing','a':'http://schemas.openxmlformats.org/drawingml/2006/main','pic':'http://schemas.openxmlformats.org/drawingml/2006/picture'}
def tag(t):
 a,b=t.split(':');return '{'+NS[a]+'}'+b
def el(t,attrs=None,text=None):
 v=E.Element(tag(t))
 for k,x in (attrs or {}).items():v.set(tag(k) if ':' in k else k,str(x))
 v.text=text;return v
def prop(parent,t,attrs):
 for x in list(parent.findall(t,NS)):parent.remove(x)
 v=el(t,attrs);parent.append(v);return v
def xml(v):return E.tostring(v,encoding='UTF-8',xml_declaration=True,standalone=True)
def build(template,output):
 expected=json.loads((BASE/'source_manifest.json').read_text(encoding='utf-8'))['sources']['sitito_template']['sha256']
 assert hashlib.sha256(template.read_bytes()).hexdigest()==expected,'Template changed'
 with ZipFile(template) as z:original={n:z.read(n) for n in z.namelist()}
 parts=original.copy();root=E.fromstring(parts['word/document.xml']);body=root.find('w:body',NS)
 source_ps=body.findall('w:p',NS);section=deepcopy(body.find('w:sectPr',NS));license_table=deepcopy(body.find('w:tbl',NS))
 styles=E.fromstring(parts['word/styles.xml']);rels=E.fromstring(parts['word/_rels/document.xml.rels']);footnotes=E.fromstring(parts['word/footnotes.xml'])
 meta=json.loads((BASE/'front_matter.json').read_text(encoding='utf-8'));refs=json.loads((BASE/'bibliography_metadata.json').read_text(encoding='utf-8'));lookup={x['key']:x for x in refs}
 tables=json.loads((BASE/'tables.json').read_text(encoding='utf-8'));examples=json.loads((BASE/'demonstration_results.json').read_text(encoding='utf-8'))
 tables['measurements']['rows']=[[str(r['n']),str(r['insertion']),str(r['merge']),str(r['mergeNormalized']).replace('.',','),str(r['insertionNormalized']).replace('.',',')] for r in examples['sorting']]
 order=[]
 text=(BASE/'manuscript.md').read_text(encoding='utf-8')
 def cite(m):
  codes=m.group(1).split(',');ids=[]
  for code in codes:
   assert code in lookup,code
   if code not in order:order.append(code)
   ids.append(order.index(code)+1)
  return '['+', '.join(map(str,sorted(ids)))+']'
 text=re.sub(r'\[ref:([^\]]+)\]',cite,text)
 assert len(order)==27 and len(order)==len(refs)
 for v in list(body):body.remove(v)
 margin=section.find('w:pgMar',NS)
 for name in ('top','bottom','left','right'):margin.set(tag('w:'+name),'1134')
 width=int(section.find('w:pgSz',NS).get(tag('w:w')))-2268
 def run(txt,size=10,bold=False,italic=False):
  r=el('w:r');pr=el('w:rPr');pr.append(el('w:rFonts',{'w:ascii':'Times New Roman','w:hAnsi':'Times New Roman','w:cs':'Times New Roman'}));pr.append(el('w:sz',{'w:val':int(size*2)}));pr.append(el('w:szCs',{'w:val':int(size*2)}));pr.append(el('w:color',{'w:val':'000000'}));pr.append(el('w:b',{'w:val':int(bold)}));pr.append(el('w:i',{'w:val':int(italic)}));r.append(pr);t=el('w:t',text=txt.replace('\u2014','–'));t.set('{http://www.w3.org/XML/1998/namespace}space','preserve');r.append(t);return r
 def paragraph(txt='',pattern=114,size=10,bold=False,italic=False,align='both',before=0,after=0,keep=False,newpage=False,parent=None,style='Normal'):
  p=deepcopy(source_ps[pattern]);pr=p.find('w:pPr',NS)
  if pr is None:pr=el('w:pPr')
  for x in list(p):p.remove(x)
  p.append(pr)
  for name in ('rPr','numPr','tabs','keepNext','keepLines','pageBreakBefore','ind','pBdr','shd','pStyle'):
   for x in list(pr.findall('w:'+name,NS)):pr.remove(x)
  prop(pr,'w:pStyle',{'w:val':style});prop(pr,'w:ind',{'w:left':0,'w:right':0,'w:firstLine':0});prop(pr,'w:spacing',{'w:before':before,'w:after':after,'w:line':240,'w:lineRule':'auto'});prop(pr,'w:jc',{'w:val':align});prop(pr,'w:contextualSpacing',{'w:val':0});prop(pr,'w:widowControl',{'w:val':1});prop(pr,'w:keepNext',{'w:val':int(keep)})
  if newpage:prop(pr,'w:pageBreakBefore',{'w:val':1})
  if txt:p.append(run(txt,size,bold,italic))
  (body if parent is None else parent).append(p);return p
 def heading(t,major=True,newpage=False):return paragraph(t,113,14 if major else 10,True,align='left',before=130 if major else 100,after=70 if major else 40,keep=True,newpage=newpage)
 title_style=styles.find("w:style[@w:styleId='Title']",NS)
 if title_style is None:title_style=el('w:style',{'w:type':'paragraph','w:styleId':'Title'});styles.append(title_style)
 for x in list(title_style):title_style.remove(x)
 title_style.append(el('w:name',{'w:val':'Title'}));title_style.append(el('w:basedOn',{'w:val':'Normal'}))
 def title(t):return paragraph(t,10,16,True,align='left',before=60,after=140,keep=True,style='Title')
 def labelled(label,value,pattern=114,after=70):
  p=paragraph('',pattern,after=after);p.append(run(label+' ',bold=True));p.append(run(value));return p
 def source_note(p,key):
  notes={'sources':'Горохова Р. И. Алгоритмы и структуры данных в языке Python: рабочая программа дисциплины. Финансовый университет, 2025. 36 с. Предоставленный файл от 21.05.2026; КРМ, версия 3.0; целевая компетентностная модель выпускника. Методические материалы из авторского архива. Идентификация редакций по SHA-256: source_manifest.json в комплекте статьи.','software':'MKRmodel: публичный программный модуль, снимок e988a1ed1ff89ebca950ea522d4fad9fdc6181df от 29.10.2026. URL: https://github.com/PetrNikitin20/MKRmodel/tree/e988a1ed1ff89ebca950ea522d4fad9fdc6181df . Код воспроизведения примеров: research/gorokhova_sitito в https://github.com/PetrNikitin20/doctor_pit . Дата обращения: 29.10.2026.'}
  n=max(int(x.get(tag('w:id'))) for x in footnotes)+1
  r=el('w:r');rp=el('w:rPr');rp.append(el('w:vertAlign',{'w:val':'superscript'}));r.append(rp);r.append(el('w:footnoteReference',{'w:id':n}));p.append(r)
  fn=el('w:footnote',{'w:id':n});pp=paragraph('',size=8,parent=fn,align='left');rr=el('w:r');rr.append(el('w:footnoteRef'));pp.append(rr);pp.append(run(' '+notes[key],8));footnotes.append(fn)
 def table(b):
  paragraph('Таблица '+str(b['number'])+' / Table '+str(b['number']),italic=True,align='right',before=80,after=30,keep=True)
  paragraph(b['title'],bold=True,align='left',after=30,keep=True);paragraph(b['title_en'],italic=True,align='left',after=60,keep=True)
  t=el('w:tbl');pr=el('w:tblPr');t.append(pr);pr.append(el('w:tblW',{'w:w':width,'w:type':'dxa'}));pr.append(el('w:tblLayout',{'w:type':'fixed'}));pr.append(el('w:jc',{'w:val':'center'}));bd=el('w:tblBorders')
  for side in ('top','bottom','left','right','insideH','insideV'):bd.append(el('w:'+side,{'w:val':'single','w:sz':4,'w:color':'000000'}))
  pr.append(bd);grid=el('w:tblGrid');widths=[round(w*width/sum(b['widths'])) for w in b['widths']];widths[-1]=width-sum(widths[:-1])
  for w in widths:grid.append(el('w:gridCol',{'w:w':w}))
  t.append(grid)
  for ri,row in enumerate([b['headers']]+b['rows']):
   tr=el('w:tr');tp=el('w:trPr');tp.append(el('w:cantSplit'));tr.append(tp)
   if ri==0:tp.append(el('w:tblHeader'))
   for ci,(w,txt) in enumerate(zip(widths,row)):
    tc=el('w:tc');cp=el('w:tcPr');cp.append(el('w:tcW',{'w:w':w,'w:type':'dxa'}));cp.append(el('w:vAlign',{'w:val':'center'}));mar=el('w:tcMar')
    for side in ('top','bottom','left','right'):mar.append(el('w:'+side,{'w:w':70,'w:type':'dxa'}))
    cp.append(mar);tc.append(cp);paragraph(txt,bold=ri==0,parent=tc,align='center' if b['number']==4 else 'left',keep=ri==0);tr.append(tc)
   t.append(tr)
  body.append(t);paragraph('',size=2,after=25)
 def figure():
  name='word/media/gorokhova_cycle.png';parts[name]=(BASE/'figure_cycle.png').read_bytes();rid='rIdGorokhovaCycle'
  rels.append(E.Element('{http://schemas.openxmlformats.org/package/2006/relationships}Relationship',Id=rid,Type=NS['r']+'/image',Target='media/gorokhova_cycle.png'))
  cx=round(16.8*360000);cy=round(cx*520/1800)
  p=paragraph('',align='center',before=70,after=35,keep=True);r=el('w:r');drawing=el('w:drawing');inline=el('wp:inline',{'distT':0,'distB':0,'distL':0,'distR':0})
  inline.append(el('wp:extent',{'cx':cx,'cy':cy}));inline.append(el('wp:docPr',{'id':100,'name':'Учебный цикл','descr':'Диагностика, выбор задания и поддержки, гипотеза и код, опыт, объяснение, обратная связь'}))
  graphic=el('a:graphic');gd=el('a:graphicData',{'uri':NS['pic']});pic=el('pic:pic');nv=el('pic:nvPicPr');nv.append(el('pic:cNvPr',{'id':100,'name':'figure_cycle.png'}));nv.append(el('pic:cNvPicPr'));pic.append(nv)
  bf=el('pic:blipFill');bf.append(el('a:blip',{'r:embed':rid}));stretch=el('a:stretch');stretch.append(el('a:fillRect'));bf.append(stretch);pic.append(bf)
  sp=el('pic:spPr');xf=el('a:xfrm');xf.append(el('a:off',{'x':0,'y':0}));xf.append(el('a:ext',{'cx':cx,'cy':cy}));sp.append(xf);geo=el('a:prstGeom',{'prst':'rect'});geo.append(el('a:avLst'));sp.append(geo);pic.append(sp);gd.append(pic);graphic.append(gd);inline.append(graphic);drawing.append(inline);r.append(drawing);p.append(r)
  paragraph('Рис. 1. Цикл дифференцированного учебного эпизода',align='center',after=30);paragraph('Fig. 1. The differentiated learning episode cycle',italic=True,align='center',after=70)
 paragraph('УДК '+meta['udc'],0,bold=True,align='left',after=80);paragraph('Оригинальная статья',5,align='left',after=90,keep=True)
 title(meta['title']);paragraph(meta['author_ru'],17,12,True,align='left',after=80,keep=True)
 organisation='Финансовый университет при Правительстве Российской Федерации, г. Москва, Российская Федерация'
 address='125167, Российская Федерация, г. Москва, Ленинградский проспект, д. 49/2'
 paragraph(organisation,18,align='left',after=30);paragraph('Адрес: '+address,19,align='left',after=30);paragraph(meta['email'],20,align='left',after=110)
 paragraph('Аннотация',25,12,True,align='left',after=60,keep=True)
 for label,txt in meta['abstract_ru']:
  p=paragraph();p.append(run(label+' ',bold=True));p.append(run(txt))
 labelled('Ключевые слова:',meta['keywords_ru'],44)
 labelled('Конфликт интересов:','декларация подлежит подтверждению автором.',after=50)
 paragraph('© Горохова Р. И., 2026',align='right',after=50)
 for node in license_table.findall('.//w:t',NS):
  if node.text:node.text=node.text.replace('Контентдоступенподлицензией','Контент доступен под лицензией')
 body.append(license_table)
 paragraph('Original article',59,align='left',newpage=True,after=90,keep=True);title(meta['title_en']);paragraph(meta['author_en'],72,12,True,align='left',after=80,keep=True)
 paragraph('Financial University under the Government of the Russian Federation, Moscow, Russian Federation',73,align='left',after=30);paragraph('Address: 49/2 Leningradsky Prospekt, Moscow 125167, Russian Federation',74,align='left',after=30);paragraph(meta['email'],75,align='left',after=110)
 paragraph('Abstract',80,12,True,align='left',after=60,keep=True)
 for label,txt in meta['abstract_en']:
  p=paragraph();p.append(run(label+' ',bold=True));p.append(run(txt))
 labelled('Keywords:',meta['keywords_en']);labelled('Conflict of interest:','the declaration remains subject to author confirmation.',after=50)
 first=True
 for block in text.split('\n\n'):
  block=block.strip()
  if not block:continue
  if block.startswith('## '):heading(block[3:],False)
  elif block.startswith('# '):heading(block[2:],True,newpage=first);first=False
  elif block.startswith('[TABLE:'):table(tables[block[7:-1]])
  elif block=='[FIGURE:1]':figure()
  else:
   notes=re.findall(r'\{\{footnote:(\w+)\}\}',block);block=re.sub(r'\{\{footnote:\w+\}\}','',block).replace('\n',' ')
   p=paragraph(block)
   for key in notes:source_note(p,key)
 heading('Список литературы / References')
 def initials(s):
  return ''.join(x[0].upper()+'.' for x in re.findall(r'[^\W\d_]+',s,re.UNICODE))
 def reftext(ref,english=False):
  if ref['key']=='dig54' and english:authors='Rumyantsev S.A., Polishuk Yu.V.'
  elif ref['key']=='dig55' and english:authors='Ovsyannikova A.V.'
  else:
   authors=', '.join((a.get('family','').title() if a.get('family','').isupper() else a.get('family',''))+' '+initials(a.get('given','')) for a in ref.get('author',[])[:6])
   if len(ref.get('author',[]))>6:authors+=', et al.'
  journal=ref.get('journal_en') if english else None
  journal=journal or ref['container-title'][0];title_en=ref.get('title_en')
  title_text=title_en if english and title_en else ref['title'][0]
  if ref.get('subtitle') and not english:title_text+=': '+ref['subtitle'][0]
  issue='('+str(ref['issue'])+')' if ref.get('issue') else ''
  if ref.get('volume'):date=f"{ref['year']};{ref['volume']}{issue}"
  else:date=str(ref['year'])
  page=ref.get('page',ref.get('article-number',''));article={'qian':'7','sorva':'8','messer':'10','navigate':'54','formal':'15'}.get(ref['key'])
  if article:page='Article '+article+', '+page
  tail=' (In Russ., abstract in Eng.)' if english and ref['key'].startswith('dig') else ''
  return html.unescape(f"{authors} {title_text}. {journal}. {date}"+(':'+page if page else '')+'. https://doi.org/'+ref['DOI']+'.'+tail).replace('\u2014','–')
 def ref_runs(p,value,ref,english=False):
  journal=html.unescape(ref.get('journal_en') if english else ref['container-title'][0])
  start=value.find(journal)
  if start<0:p.append(run(value));return
  p.append(run(value[:start]));p.append(run(journal,italic=True));p.append(run(value[start+len(journal):]))
 for n,key in enumerate(order,1):
  ref=lookup[key];p=paragraph('',125,after=40,keep=key.startswith('dig'));ref_runs(p,str(n)+'. '+reftext(ref),ref)
  prop(p.find('w:pPr',NS),'w:ind',{'w:left':340,'w:hanging':340,'w:right':0})
  prop(p.find('w:pPr',NS),'w:keepLines',{'w:val':1})
  if key.startswith('dig'):
   ep=paragraph('',125,after=40);ref_runs(ep,reftext(ref,True),ref,True);prop(ep.find('w:pPr',NS),'w:ind',{'w:left':340,'w:firstLine':0,'w:right':0});prop(ep.find('w:pPr',NS),'w:keepLines',{'w:val':1})
 heading('Об авторе')
 paragraph('Горохова Римма Ивановна, кандидат педагогических наук, доцент, доцент кафедры информационных технологий, Финансовый университет при Правительстве Российской Федерации ('+address+'), e-mail: '+meta['email']+'.',157,after=70)
 heading('About the author')
 paragraph('Rimma I. Gorokhova, Candidate of Pedagogical Sciences, Associate Professor, Department of Information Technology, Financial University under the Government of the Russian Federation (49/2 Leningradsky Prospekt, Moscow 125167, Russian Federation), e-mail: '+meta['email']+'.',166,after=70)
 body.append(section)
 parts['word/document.xml']=xml(root);parts['word/styles.xml']=xml(styles);parts['word/_rels/document.xml.rels']=xml(rels);parts['word/footnotes.xml']=xml(footnotes)
 core=E.fromstring(parts['docProps/core.xml'])
 for path,value in [('{http://purl.org/dc/elements/1.1/}title',meta['title']),('{http://purl.org/dc/elements/1.1/}creator',meta['name_ru']),('{http://schemas.openxmlformats.org/package/2006/metadata/core-properties}lastModifiedBy','Author review draft')]:
  node=core.find(path)
  if node is None:node=E.SubElement(core,path)
  node.text=value
 parts['docProps/core.xml']=xml(core)
 changed=[n for n in original if original[n]!=parts[n]];allowed=['word/document.xml','word/styles.xml','word/_rels/document.xml.rels','word/footnotes.xml','docProps/core.xml']
 assert not set(changed)-set(allowed),changed
 assert not root.findall('.//w:tbl//w:shd',NS)
 alltext=' '.join(root.xpath('.//w:t/text()',namespaces=NS));assert '\u2014' not in alltext
 assert not any(t in alltext for t in ['О. М. Иванов','Иванов Олег','O. M. Ivanov','0000-0000','Автор прочитал и одобрил'])
 output.parent.mkdir(parents=True,exist_ok=True)
 with ZipFile(output,'w',ZIP_DEFLATED) as z:
  for name,data in parts.items():z.writestr(name,data)
 audit={'date':'2026-10-29','template_sha256':expected,'template_unchanged':hashlib.sha256(template.read_bytes()).hexdigest()==expected,'changed_parts':changed,'preserve_only_parts_unchanged':True,'scientific_tables':5,'figure_count':1,'references':len(order),'reference_order':order,'word_file_sha256':hashlib.sha256(output.read_bytes()).hexdigest(),'pedagogical_experiment_performed':False,'author_approval_pending':True,'orcid_unknown':True}
 (BASE/'build_audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 readable=text
 for key,t in tables.items():
  md='**Таблица '+str(t['number'])+'. '+t['title']+'**\n\n'+'| '+' | '.join(t['headers'])+' |\n'+'| '+' | '.join('---' for _ in t['headers'])+' |\n'+'\n'.join('| '+' | '.join(r)+' |' for r in t['rows'])
  readable=readable.replace('[TABLE:'+key+']',md)
 readable=readable.replace('[FIGURE:1]','![Цикл учебного эпизода](figure_cycle.svg)')
 readable=re.sub(r'\{\{footnote:\w+\}\}',' (источники и версии приведены в source_manifest.json)',readable)
 (BASE/'article_readable.md').write_text('# '+meta['title']+'\n\n'+meta['name_ru']+'\n\n'+'\n\n'.join('**'+a+'** '+b for a,b in meta['abstract_ru'])+'\n\n'+readable+'\n\n# Список литературы\n\n'+'\n\n'.join(str(n)+'. '+reftext(lookup[key]) for n,key in enumerate(order,1))+'\n',encoding='utf-8')
 print(json.dumps(audit,ensure_ascii=False,indent=2))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--template',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args();build(a.template,a.output)
