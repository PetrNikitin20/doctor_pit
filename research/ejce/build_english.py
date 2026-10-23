"""Translate the retained Word package while preserving equations and structure.

The author's attached Russian revision is retained as translation_reference_ru.docx.
Paragraph numbers refer to that inspected revision only. Unknown source revisions
must be inspected before acceptance.
"""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from copy import deepcopy
from lxml import etree as E
import argparse, hashlib, json, re

BASE=Path(__file__).resolve().parent
REPO=BASE.parents[1]
NS={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
    'm':'http://schemas.openxmlformats.org/officeDocument/2006/math',
    'wp':'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
    'cp':'http://schemas.openxmlformats.org/package/2006/metadata/core-properties',
    'dc':'http://purl.org/dc/elements/1.1/'}
def tag(prefix,name):return '{'+NS[prefix]+'}'+name
def text(p):return ''.join(p.xpath('.//w:t/text()',namespaces=NS))
def replace_text(p,value):
    nodes=p.findall('.//w:t',NS)
    assert nodes, E.tostring(p)
    nodes[0].text=value
    nodes[0].set('{http://www.w3.org/XML/1998/namespace}space','preserve')
    for node in nodes[1:]:node.text=''
def clone_text(p,value):
    p=deepcopy(p)
    # Word requires unique paragraph identifiers. New paragraphs receive fresh
    # identifiers when Word next opens the document.
    for attribute in list(p.attrib):
        if E.QName(attribute).localname in ['paraId','textId']:
            del p.attrib[attribute]
    replace_text(p,value)
    return p
def bytes_xml(root):return E.tostring(root,xml_declaration=True,encoding='UTF-8',standalone=True)
def build(source,assets,out):
    data=json.loads((BASE/'translation_en.json').read_text(encoding='utf8'))
    source_hash=hashlib.sha256(source.read_bytes()).hexdigest()
    assert source_hash==data['source_sha256'], 'Inspect an unknown source revision before translating it'
    with ZipFile(source) as z:parts={name:z.read(name) for name in z.namelist()}
    original_parts=dict(parts)
    root=E.fromstring(parts['word/document.xml'])
    paragraphs=root.findall('w:body/w:p',NS)
    assert len(paragraphs)==95
    for key,value in data['paragraphs'].items():
        p=paragraphs[int(key)]
        assert p.find('.//m:oMath',NS) is None
        replace_text(p,value)
    paragraphs[14].addnext(clone_text(paragraphs[14],data['insert_after_14']))
    paragraphs[0].addnext(clone_text(paragraphs[0],data['specialty_line']))
    for paragraph in root.findall('w:body/w:p',NS):
        for lang in paragraph.findall('.//w:lang',NS):
            lang.set(tag('w','val'),'en-GB')
    # Decimal points are a localisation change; all mathematical structure stays.
    for node in root.findall('.//m:t',NS):
        if node.text:node.text=re.sub(r'(?<=\d),(?=\d)', '.',node.text)
    # The author guidelines require no added paragraph spacing around formulas.
    for paragraph in root.findall('w:body/w:p',NS):
        if paragraph.find('.//m:oMath',NS) is not None:
            spacing=paragraph.find('w:pPr/w:spacing',NS)
            assert spacing is not None
            spacing.set(tag('w','before'),'0');spacing.set(tag('w','after'),'0')
    tables=root.findall('w:body/w:tbl',NS)
    for table,values in zip(tables,data['tables']):
        rows=table.findall('w:tr',NS)
        assert len(rows)==len(values)
        for row,translated in zip(rows,values):
            cells=row.findall('w:tc',NS)
            assert len(cells)==len(translated)
            for cell,value in zip(cells,translated):
                replace_text(cell,value)
    # Keep original reference entries, adding the two verified publisher records.
    references=paragraphs[73:]
    combined=[(text(p).casefold(),deepcopy(p)) for p in references]
    for ref in data['new_references']:
        combined.append((ref['text'].casefold(),clone_text(references[0],ref['text'])))
    combined.sort(key=lambda pair:pair[0])
    anchor=paragraphs[72]
    for p in references:p.getparent().remove(p)
    for _,paragraph in combined:
        anchor.addnext(paragraph);anchor=paragraph
    # English accessibility labels for the regenerated scientific figures.
    for i,node in enumerate(root.findall('.//wp:docPr',NS),1):
        node.set('name','Figure '+str(i));node.set('title','Figure '+str(i))
        node.set('descr',data['paragraphs']['42' if i==1 else '56'])
    # All user-specified table properties are preserved from the input.
    parts['word/document.xml']=bytes_xml(root)
    if 'word/styles.xml' in parts:
        styles=E.fromstring(parts['word/styles.xml'])
        for lang in styles.findall('.//w:lang',NS):lang.set(tag('w','val'),'en-GB')
        parts['word/styles.xml']=bytes_xml(styles)
    if 'docProps/core.xml' in parts:
        core=E.fromstring(parts['docProps/core.xml'])
        for name,value in [('title',data['paragraphs']['1']),('subject','Instructional design of interdisciplinary learning pathways'),('creator',data['paragraphs']['2']),('keywords',data['paragraphs']['9'].removeprefix('Keywords: ')),('description','English translation of the author-revised conceptual and computational manuscript')]:
            prefix='cp' if name=='keywords' else 'dc'
            node=core.find(prefix+':'+name,NS)
            if node is None:node=E.SubElement(core,tag(prefix,name))
            node.text=value
        parts['docProps/core.xml']=bytes_xml(core)
    parts['word/media/image1.png']=(assets/'learning_cycle_en.png').read_bytes()
    parts['word/media/image2.png']=(assets/'decision_sensitivity_en.png').read_bytes()
    # Embed vector versions with the existing PNGs as a compatibility fallback.
    # The original relationship IDs and image dimensions remain unchanged.
    drawing_ns='http://schemas.openxmlformats.org/drawingml/2006/main'
    rel_ns='http://schemas.openxmlformats.org/package/2006/relationships'
    office_rel_ns='http://schemas.openxmlformats.org/officeDocument/2006/relationships'
    svg_ns='http://schemas.microsoft.com/office/drawing/2016/SVG/main'
    relationships=E.fromstring(parts['word/_rels/document.xml.rels'])
    blips=root.findall('.//{'+drawing_ns+'}blip')
    assert len(blips)==2
    for index,(blip,stem) in enumerate(zip(blips,['learning_cycle_en','decision_sensitivity_en']),1):
        rid='rIdEnglishVector'+str(index)
        extlist=E.SubElement(blip,'{'+drawing_ns+'}extLst')
        extension=E.SubElement(extlist,'{'+drawing_ns+'}ext',uri='{96DAC541-7B7A-43D3-8B79-37D633B846F1}')
        svg=E.SubElement(extension,'{'+svg_ns+'}svgBlip',nsmap={'asvg':svg_ns})
        svg.set('{'+office_rel_ns+'}embed',rid)
        E.SubElement(relationships,'{'+rel_ns+'}Relationship',Id=rid,Type=office_rel_ns+'/image',Target='media/'+stem+'.svg')
        parts['word/media/'+stem+'.svg']=(assets/(stem+'.svg')).read_bytes()
    types=E.fromstring(parts['[Content_Types].xml'])
    content_ns='http://schemas.openxmlformats.org/package/2006/content-types'
    if not any(node.get('Extension')=='svg' for node in types):
        E.SubElement(types,'{'+content_ns+'}Default',Extension='svg',ContentType='image/svg+xml')
    parts['word/document.xml']=bytes_xml(root)
    parts['word/_rels/document.xml.rels']=bytes_xml(relationships)
    parts['[Content_Types].xml']=bytes_xml(types)
    out.parent.mkdir(parents=True,exist_ok=True)
    with ZipFile(out,'w',ZIP_DEFLATED) as z:
        for name,raw in parts.items():z.writestr(name,raw)
    changed=[name for name in parts if parts[name]!=original_parts.get(name)]
    allowed={'word/document.xml','word/styles.xml','docProps/core.xml','word/media/image1.png','word/media/image2.png',
             'word/media/learning_cycle_en.svg','word/media/decision_sensitivity_en.svg',
             'word/_rels/document.xml.rels','[Content_Types].xml'}
    assert set(changed)<=allowed,changed
    print(json.dumps({'output':str(out),'source_sha256':source_hash,'changed_package_parts':changed,'references':len(combined),'sha256':hashlib.sha256(out.read_bytes()).hexdigest()},ensure_ascii=False,indent=2))

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--source',type=Path,default=BASE/'translation_reference_ru.docx')
    parser.add_argument('--assets',type=Path,default=BASE)
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    build(args.source,args.assets,args.output)
