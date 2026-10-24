from pathlib import Path
from copy import deepcopy
from docx import Document
from docx.shared import Cm, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK, WD_TAB_ALIGNMENT
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.style import WD_STYLE_TYPE
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
import json, re, shutil, hashlib

import argparse
parser=argparse.ArgumentParser()
parser.add_argument('--output',type=Path,required=True)
parser.add_argument('--author-form',type=Path,required=True)
parser.add_argument('--consent-form',type=Path,required=True)
args=parser.parse_args()
B=Path(__file__).resolve().parent
ROOT=B.parents[1]
OUT=args.output;OUT.mkdir(parents=True,exist_ok=True)
TITLE='Идентификация динамической модели междисциплинарной подготовки при внешней поддержке'
ABSTRACTS=json.loads((B/'psta/abstracts.json').read_text(encoding='utf-8'))
ORIGINAL=ROOT/'articles/Никитин_Доклады_ТУСУР_Идентификация_динамической_модели_2026-10-23.docx'

def clear_theme(doc):
    for st in doc.styles:
        if st.type != 1:
            continue
        st.font.name = 'Times New Roman'
        st.font.color.rgb = RGBColor(0,0,0)
        if st.element.rPr is not None:
            for e in st.element.rPr.iter(qn('w:rFonts')):
                for k in list(e.attrib):
                    if 'theme' in k.lower():
                        del e.attrib[k]
                e.set(qn('w:ascii'),'Times New Roman')
                e.set(qn('w:hAnsi'),'Times New Roman')
    for root in [doc.element, doc.styles.element]:
        for tag in ['w:shd','w:pBdr']:
            for e in list(root.iter(qn(tag))):
                e.getparent().remove(e)

def base_doc():
    d = Document()
    s = d.sections[0]
    s.page_width=Cm(21);s.page_height=Cm(29.7)
    s.left_margin=s.right_margin=Cm(2.3)
    s.top_margin=s.bottom_margin=Cm(2)
    d.styles['Normal'].font.name='Times New Roman'
    d.styles['Normal'].font.size=Pt(12)
    d.styles['Normal'].paragraph_format.line_spacing=1.05
    d.styles['Normal'].paragraph_format.space_after=Pt(5)
    d.styles['Title'].font.name='Times New Roman'
    d.styles['Title'].font.size=Pt(16)
    d.styles['Title'].font.bold=True
    clear_theme(d)
    d.core_properties.author=''
    return d

def add(d,text,bold=False):
    p=d.add_paragraph(text.replace('—','–'))
    if bold:
        for r in p.runs:r.bold=True
    return p

doc=Document(ORIGINAL)
if 'Title' not in doc.styles:
    doc.styles.add_style('Title', WD_STYLE_TYPE.PARAGRAPH)
doc.settings.odd_and_even_pages_header_footer=False
original_math = [deepcopy(x) for x in doc.element.iter(qn('m:oMath'))]
for s in doc.sections:
    s.different_first_page_header_footer=False
    s.page_width=Cm(21);s.page_height=Cm(29.7)
    s.top_margin=s.bottom_margin=s.left_margin=s.right_margin=Cm(2)
    cols=s._sectPr.find(qn('w:cols'))
    if cols is not None:
        cols.set(qn('w:num'),'1')
        for c in list(cols):cols.remove(c)
    s.header_distance=Cm(.7);s.footer_distance=Cm(.7)
    for part in [s.header,s.first_page_header,s.even_page_header,s.footer,s.first_page_footer,s.even_page_footer]:
        for p in list(part.paragraphs):
            p._element.getparent().remove(p._element)
    p=s.footer.add_paragraph();p.alignment=WD_ALIGN_PARAGRAPH.CENTER
    f=OxmlElement('w:fldSimple');f.set(qn('w:instr'),'PAGE');p._p.append(f)
for st in doc.styles:
    if st.type==1:
        st.font.name='Times New Roman'
        st.font.size=Pt(11)
        st.paragraph_format.line_spacing=1.12
        st.paragraph_format.space_before=Pt(0)
        st.paragraph_format.space_after=Pt(3)
for name in ['Heading 1','Heading 2']:
    doc.styles[name].font.size=Pt(12)
    doc.styles[name].font.bold=True
    doc.styles[name].paragraph_format.space_before=Pt(8)
    doc.styles[name].paragraph_format.space_after=Pt(4)
    doc.styles[name].paragraph_format.keep_with_next=True
for p in doc.paragraphs:
    for r in p.runs:
        r.font.name='Times New Roman';r.font.size=Pt(11)
        r.font.color.rgb=RGBColor(0,0,0)
    if p.text.startswith('Актуальность.'):
        p.text='Аннотация. '+ABSTRACTS['ru']
    elif p.text.startswith('Relevance.'):
        p.text='Abstract. '+ABSTRACTS['en']
    if p.text==TITLE:
        p.style=doc.styles['Title']
        p.paragraph_format.alignment=WD_ALIGN_PARAGRAPH.CENTER
        for r in p.runs:r.font.size=Pt(15);r.bold=True
        nohyphen=OxmlElement('w:suppressAutoHyphens');p._p.get_or_add_pPr().append(nohyphen)
    if p._element.xpath('.//m:oMath') and re.search(r'\t\([0-9]+\)',p.text):
        p.paragraph_format.tab_stops.clear_all()
        p.paragraph_format.tab_stops.add_tab_stop(Cm(16.5),WD_TAB_ALIGNMENT.RIGHT)
    if p.text.startswith(('Таблица ','Рис. ')):
        p.paragraph_format.keep_with_next=p.text.startswith('Таблица ')
    if p._element.xpath('.//w:drawing'):
        for r in list(p.runs):
            if r._element.xpath('.//w:drawing'):r._element.getparent().remove(r._element)
        p.add_run().add_picture(str(B/'psta/figures/conditioning.png'),width=Cm(10.7))
        p.alignment=WD_ALIGN_PARAGRAPH.CENTER
for t in doc.tables:
    t.autofit=False
    widths=[2.5,4.4,9.5] if len(t.columns)==3 else [1.5,2,6.6,6.3]
    for col,w in zip(t.columns,widths):col.width=Cm(w)
    borders=t._tbl.tblPr.find(qn('w:tblBorders'))
    if borders is None:
        borders=OxmlElement('w:tblBorders');t._tbl.tblPr.append(borders)
    for edge in ['top','bottom','left','right','insideH','insideV']:
        e=borders.find(qn('w:'+edge))
        if e is None:e=OxmlElement('w:'+edge);borders.append(e)
        for k,v in [('val','single'),('sz','4'),('color','000000')]:e.set(qn('w:'+k),v)
    for row_index,row in enumerate(t.rows):
        for c,w in zip(row.cells,widths):
            c.width=Cm(w);c.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
            for p in c.paragraphs:
                p.paragraph_format.line_spacing=1
                p.paragraph_format.keep_with_next=(row_index<len(t.rows)-1)
                for r in p.runs:r.font.size=Pt(10)
clear_theme(doc)
doc.core_properties.title=TITLE
doc.core_properties.subject='Авторская редактируемая версия для журнала Программные системы теория и приложения'
doc.core_properties.author='Никитин Пётр Владимирович'
doc.core_properties.comments=''
article_path=OUT/'ПСТА_Статья_Никитин_2026-10-24.docx'
doc.save(article_path)
assert len(list(doc.element.iter(qn('m:oMath'))))==len(original_math)==22

letter=base_doc()
letter.add_paragraph('Сопроводительное письмо в редакцию','Title')
add(letter,'В редакцию журнала «Программные системы: теория и приложения»')
add(letter,'Адрес: info@psta.psiras.ru')
add(letter,'Тема: Статья в рубрику «Математическое моделирование» – Никитин П.В.')
add(letter,'Уважаемая редакция!')
add(letter,'Прошу рассмотреть статью «'+TITLE+'» для публикации в рубрике «Математическое моделирование» по специальности 1.2.2 (технические науки).')
add(letter,'Для двухкомпонентной нелинейной модели построен конечный протокол идентификации девяти параметров, включая характеристики внешней поддержки. Доказаны однозначность восстановления на образе модели, невырожденность якобиана и локальная устойчивость обратного отображения. Представлены воспроизводимый численный алгоритм и результаты 80 синтетических восстановлений и 180000 повторений биномиальной калибровки. Эксперимент с результатами обучения студентов в статье не заявляется.')
add(letter,'Согласен с опубликованными порядком рассмотрения и требованиями журнала, принимаю декларацию научной этики. Одновременная подача этой работы в другое рецензируемое издание исключается. Готов представить авторскую справку, заверенную по месту работы, согласие на обработку персональных данных и фотографию для публикационной версии.')
add(letter,'Для двойного слепого рецензирования прилагается PDF без данных автора. Исходники LaTeX по актуальному стилевому файлу журнала и воспроизводимые расчетные материалы подготовлены и могут быть переданы редакции.')
add(letter,'При подготовке и редактировании текста, перевода и программных материалов использовался ИИ-ассистент. Научная ответственность за представляемую работу остается за автором.')
add(letter,'Сведения об авторе',bold=True)
add(letter,'Никитин Пётр Владимирович / Petr Vladimirovich Nikitin')
add(letter,'Кандидат педагогических наук, доцент кафедры искусственного интеллекта Финансового университета при Правительстве Российской Федерации.')
add(letter,'Financial University under the Government of the Russian Federation, Moscow, Russia.')
add(letter,'E-mail: pvnikitin@fa.ru. ORCID: 0000-0001-8866-5610.')
add(letter,'Служебный телефон организации: +7 (499) 700-86-00.')
add(letter,'С уважением, Пётр Владимирович Никитин')
letter.core_properties.title='Сопроводительное письмо в журнал Программные системы теория и приложения'
letter_path=OUT/'ПСТА_Сопроводительное_письмо.docx'
letter.save(letter_path)
letter_text='\n\n'.join(p.text for p in letter.paragraphs[4:])+'\n'
(OUT/'ПСТА_Текст_письма.txt').write_text(
    'Кому: info@psta.psiras.ru\nТема: Статья в рубрику «Математическое моделирование» – Никитин П.В.\n\n'+letter_text,encoding='utf-8')

form=Document(args.author_form)
for p in form.paragraphs:
    text=p.text
    if text.startswith('Фамилия, имя, отчество'):p.text='Фамилия, имя, отчество: Никитин Пётр Владимирович'
    elif text.startswith('Ученая степень и звание'):p.text='Ученая степень и звание: кандидат педагогических наук, доцент'
    elif text.startswith('Место работы'):p.text='Место работы: Финансовый университет при Правительстве Российской Федерации'
    elif text.startswith('Должность'):p.text='Должность: доцент кафедры искусственного интеллекта'
    elif text.startswith('Тел.'):p.text='Телефон организации: +7 (499) 700-86-00'
# Replace only the three title lines, preserving the publisher's legal text and signature fields.
lines=[p for p in form.paragraphs if re.fullmatch(r'[_ ,]+',p.text.strip() or 'X')]
if lines:
    lines[0].text=TITLE
    for p in lines[1:]:p.text=''
clear_theme(form)
form.core_properties.title='Авторская справка для журнала Программные системы теория и приложения'
form.core_properties.author=''
form_path=OUT/'ПСТА_Авторская_справка_без_подписи.docx'
form.save(form_path)
shutil.copy2(args.consent_form,OUT/'ПСТА_Согласие_на_обработку_ПДн_бланк.pdf')
(OUT/'word_manifest.json').write_text(json.dumps({
    'date':'2026-10-24','article':str(article_path),'letter':str(letter_path),'author_form':str(form_path),
    'original_article':str(ORIGINAL),'word_equations':22,'signed':False,
    'source_sha256':hashlib.sha256(ORIGINAL.read_bytes()).hexdigest()
},ensure_ascii=False,indent=2),encoding='utf-8')
print('Word documents prepared:',article_path,letter_path,form_path,sep='\n')
