"""Check the final Word packages, not their publisher-template placeholders."""
from pathlib import Path
from zipfile import ZipFile
from lxml import etree as E
from docx import Document
from docx.shared import Cm,Pt
import hashlib,json,re
B=Path(__file__).resolve().parents[1]
NS={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main','m':'http://schemas.openxmlformats.org/officeDocument/2006/math'}
def q(s):a,b=s.split(':');return '{'+NS[a]+'}'+b
def check():
    report=[]
    for file in sorted((B/'articles').glob('*.docx')):
        key='tusur' if 'ТУСУР' in file.name else 'ejce_en' if 'EJCE' in file.name and '_EN_' in file.name else 'sitito' if 'SITITO' in file.name else 'ejce' if 'EJCE' in file.name else 'injoit' if 'INJOIT' in file.name else 'itvs'
        with ZipFile(file) as z:
            for name in z.namelist():
                if name.endswith('.xml'):assert '—' not in z.read(name).decode('utf8'),(file.name,name)
            root=E.fromstring(z.read('word/document.xml'))
        text=''.join(root.xpath('.//w:t/text()|.//m:t/text()',namespaces=NS))
        cells=root.findall('.//w:tbl//w:tc',NS)
        assert not root.findall('.//w:tbl//w:shd',NS)
        for cell in cells:
            for edge in ['top','bottom','left','right']:
                bd=cell.find('w:tcPr/w:tcBorders/w:'+edge,NS)
                assert bd is not None and bd.get(q('w:val'))=='single'
        eq=len(root.findall('.//m:oMath',NS));assert eq=={'sitito':11,'ejce':8,'ejce_en':8,'injoit':21,'itvs':22,'tusur':22}[key]
        doc=Document(file);sec=doc.sections[0]
        assert abs(sec.page_width-Cm(21))<1300 and abs(sec.page_height-Cm(29.7))<1300
        if key=='sitito':
            meta=json.loads((B/'research/article/manuscript.json').read_text(encoding='utf8'))
            body={b['text'] for b in meta['blocks'] if b['type']=='paragraph'}
            count=0
            for p in root.findall('w:body/w:p',NS):
                t=''.join(p.xpath('.//w:t/text()',namespaces=NS))
                if t not in body:continue
                count+=1;pr=p.find('w:pPr',NS)
                sp=pr.find('w:spacing',NS);ind=pr.find('w:ind',NS)
                assert all(sp.get(q('w:'+k))==v for k,v in {'before':'0','after':'0','line':'240','lineRule':'auto'}.items())
                assert all(ind.get(q('w:'+k))=='0' for k in ['left','right','firstLine'])
                assert pr.find('w:jc',NS).get(q('w:val'))=='both'
            assert count>=50
            for edge in ['top','bottom','left','right']:assert abs(getattr(sec,edge+'_margin')-Cm(2))<650
            assert len(meta['references'])>=25
        if key in ['ejce','ejce_en']:
            assert doc.styles['Normal'].font.size==Pt(14)
            assert doc.styles['Normal'].paragraph_format.line_spacing==1.5
            for edge in ['top','bottom','left','right']:assert abs(getattr(sec,edge+'_margin')-Cm(2))<650
        if key=='injoit':
            assert root.find('.//w:sectPr/w:cols',NS).get(q('w:num'))=='2'
            meta=json.loads((B/'research/injoit/manuscript.json').read_text(encoding='utf8'))
            assert len(meta['references'])==25
            seen=[]
            for block in meta['blocks']:
                if block['type']!='paragraph':continue
                for match in re.finditer(r'\[(\d+)\](?:[–-]\[(\d+)\])?',block['text']):
                    ids=range(int(match[1]),int(match[2])+1) if match[2] else [int(match[1])]
                    for number in ids:
                        if number not in seen:seen.append(number)
            assert seen==list(range(1,26))
            assert sum('Цифровые решения и технологии искусственного интеллекта' in r for r in meta['references'])==2
            abstract=meta.get('abstract_en',meta.get('abstractEN',''))
            assert 180<=len(abstract.split())<=200
            assert 'погрешности ε₀' in text and 'ℬ' in text and 'ν' in text
        if key=='itvs':
            assert doc.styles['Normal'].font.size==Pt(11)
            assert doc.styles['Normal'].paragraph_format.line_spacing==1.5
            assert len(text)<40000 and 'ψ' in text and 'ω' in text
            for edge,target in [('top',3.6),('bottom',3.6),('left',2.5),('right',2.5)]:assert abs(getattr(sec,edge+'_margin')-Cm(target))<650
            meta=json.loads((B/'research/diff_eq/manuscript_itvs.json').read_text(encoding='utf8'))
            assert all(len(meta[k].split())<=120 for k in ['abstract','abstract_en'])
            body=' '.join(v for k,v in meta['blocks'] if k in ['p','s'])
            assert all('('+str(n)+')' in body for n in range(1,7))
        if key=='tusur':
            meta=json.loads((B/'research/diff_eq/manuscript_tusur.json').read_text(encoding='utf8'))
            assert len(meta['references'])==15 and meta['recent_references_2022_2026']>=8
            assert len(doc.sections)==2
            assert doc.sections[-1]._sectPr.find(q('w:cols')).get(q('w:num'))=='2'
            for lang in ['abstract','abstract_en']:
                assert 50<=sum(len(label.split())+len(value.split()) for label,value in meta[lang])<=300
            seen=[]
            for kind,value in meta['blocks']:
                if kind not in ['p','s']:continue
                for mt in re.finditer(r'\[(\d+)\]',value):
                    if int(mt[1]) not in seen:seen.append(int(mt[1]))
            assert seen==list(range(1,16))
            maths=[value for kind,value in meta['blocks'] if kind=='e']
            assert '^2κ(1-κ)' in maths[9] and '^2q(1-κ)' not in maths[9]
            assert '700-86-00' in text and '1.2.2 (технические науки)' in text
            # Structural conformance is not a claim of submission readiness:
            # native Word equations still require conversion to MathType.
        assert not any(v in text for v in ['TODO','TBD','[вставить','<source_ref>'])
        report.append({'journal':key,'file':file.name,'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'native_equations':eq,'tables':len(root.findall('.//w:tbl',NS)),'bordered_cells':len(cells),'em_dashes':0,'table_shading':0,'checks':'passed'})
        if key=='tusur':report[-1].update(submission_ready=False,open_requirements=['MathType conversion','author compliance with AI policy','signed author documents'])
    assert len(report)==6 and {r['journal'] for r in report}=={'sitito','ejce','ejce_en','injoit','itvs','tusur'}
    return report
if __name__=='__main__':
    r=check();(B/'audit/manuscript_checks.json').write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps(r,ensure_ascii=False,indent=2))
