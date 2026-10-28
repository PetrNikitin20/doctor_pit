"""Extract local documents as data. Never compile TeX or execute uploaded code."""
from pathlib import Path
import sys,json,zipfile,re,xml.etree.ElementTree as E
M='{http://schemas.openxmlformats.org/officeDocument/2006/math}'
W='{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
def bounded_blocks(blocks,limit=1800):
    """Keep long paragraphs/code searchable beyond the prompt's excerpt limit.

    Math is an indivisible token; its full notation remains in the formula catalog.
    """
    pattern=r'(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[^$\n]+\$|\\begin\{equation\*?\}[\s\S]*?\\end\{equation\*?\})'
    out=[]
    for block in blocks:
        atoms=[]
        for i,piece in enumerate(re.split(pattern,block['text'])):
            if i%2:atoms.append(piece);continue
            for word in re.findall(r'\S+\s*|\s+',piece):
                atoms.extend(word[j:j+limit] for j in range(0,len(word),limit))
        parts=[];current=''
        for atom in atoms:
            if current and len(current)+len(atom)>limit:parts.append(current);current=''
            current+=atom
        if current:parts.append(current)
        if not parts:parts=['']
        for i,text in enumerate(parts):
            out.append({'location':block['location']+(f' · часть {i+1}' if len(parts)>1 else ''),'text':text})
    return out
def omml(node):
    tag=node.tag.split('}')[-1]
    def child(t):
        x=node.find(M+t);return omml(x) if x is not None else ''
    if tag in ['rPr','ctrlPr','sSubPr','sSupPr','fPr','dPr','naryPr','oMathParaPr']:return ''
    if tag=='t':return node.text or ''
    if tag=='f':return r'\frac{'+child('num')+'}{'+child('den')+'}'
    if tag=='sSub':return '{'+child('e')+'}_{'+child('sub')+'}'
    if tag=='sSup':return '{'+child('e')+'}^{'+child('sup')+'}'
    if tag=='sSubSup':return '{'+child('e')+'}_{'+child('sub')+'}^{'+child('sup')+'}'
    if tag=='rad':
        degree=child('deg');return r'\sqrt'+('['+degree+']' if degree else '')+'{'+child('e')+'}'
    if tag=='nary':
        pr=node.find(M+'naryPr');ch=pr.find(M+'chr') if pr is not None else None
        symbol=ch.get(M+'val','∫') if ch is not None else '∫'
        symbol={'∑':r'\sum','∏':r'\prod','∫':r'\int'}.get(symbol,symbol)
        return symbol+'_{'+child('sub')+'}^{'+child('sup')+'}{'+child('e')+'}'
    if tag=='eqArr':return r'\begin{aligned}'+r'\\'.join(omml(x) for x in node if x.tag==M+'e')+r'\end{aligned}'
    if tag=='d':return '('+child('e')+')'
    if tag=='acc':
        pr=node.find(M+'accPr');ch=pr.find(M+'chr') if pr is not None else None
        accent=ch.get(M+'val','̂') if ch is not None else '̂'
        return {'̂':r'\widehat','̃':r'\widetilde','̇':r'\dot','˙':r'\dot','¯':r'\bar'}.get(accent,r'\hat')+'{'+child('e')+'}'
    return ''.join(omml(c) for c in node)
def docx(path):
    with zipfile.ZipFile(path) as z:
        if sum(i.file_size for i in z.infolist())>60_000_000 or len(z.infolist())>4000:raise ValueError('Документ слишком большой после распаковки')
        root=E.fromstring(z.read('word/document.xml'))
    paragraphs=[]
    for p in root.iter(W+'p'):
        def text(n):
            if n.tag==M+'oMath':return ' $'+omml(n)+'$ '
            if n.tag==W+'t':return n.text or ''
            return ''.join(text(c) for c in n)
        t=text(p).strip()
        if t:paragraphs.append(t)
    return [{'location':'абзацы '+str(i+1)+'–'+str(min(i+5,len(paragraphs))),'text':'\n\n'.join(paragraphs[i:i+5])} for i in range(0,len(paragraphs),5)],False
def main(p):
    path=Path(p['path']);ext=path.suffix.lower();warnings=[]
    if ext=='.pdf':
        from pypdf import PdfReader
        reader=PdfReader(path)
        if reader.is_encrypted:raise ValueError('PDF зашифрован. Сохраните доступную для чтения копию.')
        if len(reader.pages)>300:raise ValueError('Для одного импорта допускается не больше 300 страниц')
        blocks=[{'location':'страница '+str(i+1),'text':page.extract_text() or ''} for i,page in enumerate(reader.pages)]
        sparse=sum(len(b['text'].strip())<40 for b in blocks)
        needs_ocr=sparse>len(blocks)*.5
        if needs_ocr:warnings.append('Большинство страниц – изображения. Нужен текстовый PDF, DOCX или предварительное OCR; скан не включён в диалог.')
        else:warnings.append('Проверьте извлечение формул по оригиналу PDF. Для точной записи предпочтительны DOCX с формулами или TeX.')
    elif ext=='.docx':blocks,needs_ocr=docx(path);warnings.append('Формулы Office преобразованы в текст TeX; сверьте сложные матрицы и специальные обозначения с оригиналом.')
    else:
        raw=path.read_bytes()
        try:content=raw.decode('utf-8-sig')
        except UnicodeDecodeError:content=raw.decode('cp1251')
        if '\x00' in content:raise ValueError('Ожидался текстовый файл')
        chunks=[];current=''
        for paragraph in re.split(r'\n\s*\n',content):
            if current and len(current)+len(paragraph)>2500:chunks.append(current);current=''
            current+=('\n\n' if current else '')+paragraph
        if current:chunks.append(current)
        blocks=[{'location':'фрагмент '+str(i+1),'text':text} for i,text in enumerate(chunks)];needs_ocr=False
    if not blocks or (not needs_ocr and not any(b['text'].strip() for b in blocks)):raise ValueError('Не удалось извлечь текст')
    total=sum(len(b['text']) for b in blocks)
    if total>700_000:raise ValueError('Текст превышает 700000 символов. Разделите документ на части.')
    return {'blocks':bounded_blocks(blocks),'characters':total,'needsOcr':needs_ocr,'warnings':warnings,**({'pages':len(reader.pages)} if ext=='.pdf' else {})}
try:print(json.dumps(main(json.load(sys.stdin)),ensure_ascii=False))
except Exception as exc:print(str(exc),file=sys.stderr);sys.exit(1)
