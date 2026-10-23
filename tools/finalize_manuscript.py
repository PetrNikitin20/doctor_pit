"""Apply the author's explicit typography override without flattening Word math.

Usage: python finalize_manuscript.py input.docx output.docx --journal sitito
"""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from lxml import etree as E
import argparse, json, hashlib

NS={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
    'm':'http://schemas.openxmlformats.org/officeDocument/2006/math'}
def q(s):
    a,b=s.split(':');return '{'+NS[a]+'}'+b
def prop(parent,name,attrs):
    for v in list(parent.findall(name,NS)):parent.remove(v)
    v=E.SubElement(parent,q(name))
    for key,val in attrs.items():v.set(q(key),str(val))
    return v
def ppr(p):
    v=p.find('w:pPr',NS)
    if v is None:v=E.Element(q('w:pPr'));p.insert(0,v)
    return v

def finalize(src,dst,journal):
    with ZipFile(src) as z:parts={n:z.read(n) for n in z.namelist()}
    root=E.fromstring(parts['word/document.xml'])
    before_math=len(root.findall('.//m:oMath',NS))
    dash_count=0
    # Cover headers, footnotes, metadata and glossary, not binary media.
    for name,data in list(parts.items()):
        if name.endswith('.xml'):
            s=data.decode('utf-8');dash_count+=s.count('–')
            parts[name]=s.replace('–','–').encode('utf-8')
    root=E.fromstring(parts['word/document.xml'])
    cell_count=0
    for tb in root.findall('.//w:tbl',NS):
        pr=tb.find('w:tblPr',NS)
        if pr is None:pr=E.Element(q('w:tblPr'));tb.insert(0,pr)
        prop(pr,'w:tblStyle',{'w:val':'TableNormal'})
        bd=prop(pr,'w:tblBorders',{})
        for side in ['top','left','bottom','right','insideH','insideV']:
            prop(bd,'w:'+side,{'w:val':'single','w:sz':'4','w:color':'000000'})
        for n in list(tb.findall('.//w:shd',NS)):n.getparent().remove(n)
        if journal=='sitito':
            first=tb.find('w:tr',NS)
            for p in first.findall('.//w:p',NS):prop(ppr(p),'w:keepNext',{'w:val':'1'})
        for tc in tb.findall('.//w:tc',NS):
            cell_count+=1
            cp=tc.find('w:tcPr',NS)
            if cp is None:cp=E.Element(q('w:tcPr'));tc.insert(0,cp)
            cb=prop(cp,'w:tcBorders',{})
            for side in ['top','left','bottom','right']:
                prop(cb,'w:'+side,{'w:val':'single','w:sz':'4','w:color':'000000'})
            for color in tc.findall('.//w:rPr/w:color',NS):
                if color.get(q('w:val'),'').upper()=='FFFFFF':color.set(q('w:val'),'000000')
    body_count=0
    # Keep consecutive lines of one display equation on the same page.
    body=root.find('w:body',NS)
    for left,right in zip(list(body),list(body)[1:]):
        if left.find('m:oMath',NS) is not None and right.find('m:oMath',NS) is not None:
            prop(ppr(left),'w:keepNext',{'w:val':'1'})
    if journal=='itvs':
        for p in body.findall('w:p',NS):
            text=''.join(p.xpath('.//w:t/text()',namespaces=NS))
            if text.startswith('Identifying a Dynamic Interdisciplinary Learning Model'):
                prop(ppr(p),'w:pageBreakBefore',{'w:val':'1'})
    if journal=='sitito':
        # Text and abstract paragraphs are recognized by the source manuscript.
        base=Path(__file__).resolve().parents[1]
        metadata=next(p for p in [base/'article/manuscript.json',base/'research/article/manuscript.json'] if p.exists())
        meta=json.loads(metadata.read_text(encoding='utf8'))
        texts={v['text'] for v in meta['blocks'] if v['type']=='paragraph'}
        abstracts={text for label,text in meta['abstract_ru']+meta['abstract_en']}
        for p in root.findall('w:body/w:p',NS):
            text=''.join(p.xpath('.//w:t/text()',namespaces=NS))
            if text not in texts and not any(a in text for a in abstracts):continue
            pr=ppr(p)
            prop(pr,'w:ind',{'w:left':'0','w:right':'0','w:firstLine':'0'})
            prop(pr,'w:spacing',{'w:before':'0','w:after':'0','w:line':'240','w:lineRule':'auto'})
            prop(pr,'w:jc',{'w:val':'both'})
            prop(pr,'w:contextualSpacing',{'w:val':'0'})
            body_count+=1
        assert body_count>=40,body_count
        # The author's request to check journal requirements takes precedence
        # over different margins retained from the original template.
        for margin in root.findall('.//w:sectPr/w:pgMar',NS):
            for side in ['top','bottom','left','right']:margin.set(q('w:'+side),'1134')
    assert len(root.findall('.//m:oMath',NS))==before_math
    assert not root.findall('.//w:tbl//w:shd',NS)
    parts['word/document.xml']=E.tostring(root,xml_declaration=True,encoding='UTF-8',standalone=True)
    dst=Path(dst);dst.parent.mkdir(parents=True,exist_ok=True)
    with ZipFile(dst,'w',ZIP_DEFLATED) as z:
        for n,v in parts.items():z.writestr(n,v)
    return dict(file=dst.name,journal=journal,native_equations=before_math,
                tables=len(root.findall('.//w:tbl',NS)),bordered_cells=cell_count,
                active_table_shading=0,replaced_em_dashes=dash_count,
                sitito_body_paragraphs=body_count,sha256=hashlib.sha256(dst.read_bytes()).hexdigest())

if __name__=='__main__':
    a=argparse.ArgumentParser();a.add_argument('source');a.add_argument('destination')
    a.add_argument('--journal',required=True,choices=['sitito','ejce','injoit','itvs'])
    v=a.parse_args();print(json.dumps(finalize(v.source,v.destination,v.journal),ensure_ascii=False,indent=2))
