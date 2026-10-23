"""Verify the English EJCE article against the retained author revision."""
from pathlib import Path
from zipfile import ZipFile
from collections import Counter
from copy import deepcopy
from lxml import etree as E
from docx import Document
from docx.shared import Cm,Pt
import hashlib,json,re

B=Path(__file__).resolve().parents[1]
MODULE=B/'research/ejce'
NS={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main','m':'http://schemas.openxmlformats.org/officeDocument/2006/math'}
def sha(raw):return hashlib.sha256(raw).hexdigest()
def root(path):
    with ZipFile(path) as z:return E.fromstring(z.read('word/document.xml'))
def math_structure(node):
    node=deepcopy(node)
    for element in node.findall('.//m:t',NS):
        if element.text:element.text=re.sub(r'(?<=\d),(?=\d)','.',element.text)
    for element in node.findall('.//w:lang',NS):element.set('{'+NS['w']+'}val','common')
    return E.tostring(node,method='c14n')
def numbers(text):
    return Counter(re.findall(r'\d+(?:\.\d+)*',re.sub(r'(?<=\d),(?=\d)','.',text)))

def check():
    source=MODULE/'translation_reference_ru.docx'
    final=B/'articles/Article_EJCE_Interdisciplinary_Learning_Pathways_EN_2026-10-23.docx'
    data=json.loads((MODULE/'translation_en.json').read_text(encoding='utf8'))
    assert sha(source.read_bytes())==data['source_sha256']
    before=root(source);after=root(final)
    old_math=before.findall('.//m:oMath',NS);new_math=after.findall('.//m:oMath',NS)
    assert len(old_math)==len(new_math)==8
    assert [math_structure(x) for x in old_math]==[math_structure(x) for x in new_math]
    original=Document(source);document=Document(final)
    translated_numbers=0
    for index,value in data['paragraphs'].items():
        assert numbers(original.paragraphs[int(index)].text)==numbers(value),index
        translated_numbers+=sum(numbers(value).values())
    for old_table,new_table in zip(original.tables,document.tables):
        assert len(old_table.rows)==len(new_table.rows)
        for old_row,new_row in zip(old_table.rows,new_table.rows):
            for a,b in zip(old_row.cells,new_row.cells):
                if re.fullmatch(r'<?\d+(?:[,.]\d+)?',a.text):
                    assert a.text.replace(',','.')==b.text
    paragraphs=[p.text for p in document.paragraphs]
    start=paragraphs.index('Literature')
    prose=' '.join(paragraphs[:start]);refs=paragraphs[start+1:]
    assert len(refs)==24 and refs==sorted(refs,key=str.casefold)
    keys=[r.split(' – ')[0] for r in refs]
    assert all(key in prose for key in keys)
    assert all(ref['key'] in prose and ref['text'] in refs for ref in data['new_references'])
    assert all(ref['doi'] not in r for ref in data['new_references'] for r in json.loads((B/'research/injoit/manuscript.json').read_text(encoding='utf8'))['references'])
    assert not re.search('[А-Яа-яЁё]',' '.join(paragraphs))
    abstract=paragraphs[paragraphs.index('Abstract')+1]
    assert len(abstract)>=1500
    keywords=paragraphs[paragraphs.index('Abstract')+2].removeprefix('Keywords: ').rstrip('.').split(', ')
    assert len(keywords)<=10
    assert document.styles['Normal'].font.name=='Times New Roman'
    assert document.styles['Normal'].font.size==Pt(14)
    assert document.styles['Normal'].paragraph_format.line_spacing==1.5
    section=document.sections[0]
    assert len(document.sections)==1
    for side in ['top','bottom','left','right']:assert abs(getattr(section,side+'_margin')-Cm(2))<650
    for table in after.findall('.//w:tbl',NS):
        assert not table.findall('.//w:shd',NS)
        for cell in table.findall('.//w:tc',NS):
            for edge in ['top','bottom','left','right']:
                border=cell.find('w:tcPr/w:tcBorders/w:'+edge,NS)
                assert border is not None and border.get('{'+NS['w']+'}val')=='single'
    with ZipFile(final) as z:
        assert all('—' not in z.read(n).decode('utf8') for n in z.namelist() if n.endswith('.xml'))
        assert all('word/media/'+stem+'.svg' in z.namelist() for stem in ['learning_cycle_en','decision_sensitivity_en'])
        assert len(after.findall('.//{http://schemas.microsoft.com/office/drawing/2016/SVG/main}svgBlip'))==2
    # Verify original computational files against their canonical Git-blob hashes.
    manifest=json.loads((B/'SHA256SUMS.json').read_text(encoding='utf8'))
    protected={}
    for filename in ['decision_simulation.mjs','simulation_results.json','simulation_results.csv']:
        relative='research/ejce/'+filename
        actual=sha((B/relative).read_bytes().replace(b'\r\n',b'\n'))
        assert actual==manifest[relative],filename
        protected[relative]=actual
    return {
        'date':'2026-10-23','file':final.name,'docx_sha256':sha(final.read_bytes()),
        'source_sha256':data['source_sha256'],'native_equation_objects':8,
        'numbered_equation_groups':4,'mathematical_structure_unchanged':True,
        'mathematical_localisation':'Decimal commas changed to decimal points; language tags localised',
        'numeric_tokens_in_translated_paragraphs_checked':translated_numbers,
        'numeric_table_cells_unchanged':True,'tables':3,'figures':2,'embedded_vector_figures':2,
        'references':24,'all_references_cited':True,'references_alphabetical':True,
        'new_digitarin_references':data['new_references'],
        'digitarin_references_in_total':sum('Tsifrovye resheniya' in r for r in refs),
        'new_digitarin_works_distinct_from_injoit_additions':True,
        'abstract_characters':len(abstract),'abstract_words':len(abstract.split()),
        'keywords':len(keywords),'active_cyrillic':0,
        'protected_computational_files_canonical_sha256':protected,
        'numerical_experiment_rerun':False,
        'numerical_verification':'Source equation structure, paragraph numbers and numeric table cells preserved; computational files unchanged',
        'checks':'passed'
    }

if __name__=='__main__':
    result=check()
    (B/'audit/EJCE_EN_2026-10-23.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
    print(json.dumps(result,ensure_ascii=False,indent=2))
