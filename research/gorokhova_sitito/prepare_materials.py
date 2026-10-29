"""Freeze selected bibliography metadata and generate the teaching-cycle figure."""
from pathlib import Path
import json,html,hashlib
from PIL import Image,ImageDraw,ImageFont

BASE=Path(__file__).parent
data=json.loads((BASE/"bibliography_candidates.json").read_text(encoding="utf-8"))
keys="qian sorva smale biggs calderon visual primm shute scaffolding kasneci ouyang crompton lo khosravi yan messer navigate formal kazemi gap codeaid copilot prompt hard robots".split()
refs=[]
for key in keys:
    ref=data[key][1 if key in ("shute","khosravi") else 0].copy()
    ref["key"]=key;ref["verified"]="2026-10-29";ref["verification"]="Crossref DOI registration; article titles and publication venues reviewed"
    ref["year"]=ref["issued"]["date-parts"][0][0]
    if key=="calderon":ref.update(year=2024,volume="23",issue="2",page="279-322",issueYearEvidence="Publisher PDF: Informatics in Education 2024, 23(2), 279-322")
    if key=="yan":ref.update(year=2024,issueYearEvidence="Publisher: British Journal of Educational Technology 55(1), 90-112")
    for a in ref.get("author",[]):a.pop("affiliation",None);a.pop("ORCID",None);a.pop("authenticated-orcid",None)
    refs.append(ref)
for key,authors,title,title_en,pages in [
 ("dig54",[("Румянцев","С. А."),("Полищук","Ю. В.")],"Искусственный интеллект в высшем образовании и психологическом консультировании: методическая рамка внедрения","Artificial Intelligence in Higher Education and Psychological Counseling: A Methodological Framework for Implementation","6-15"),
 ("dig55",[("Овсянникова","А. В.")],"Интеллектуальные рекомендательные системы в образовании. Алгоритмы подбора индивидуальных траекторий обучения","Intelligent Recommender Systems in Education. Algorithms for Personalised Learning Pathways","16-24")]:
    refs.append({"key":key,"author":[{"family":f,"given":g} for f,g in authors],"title":[title],"title_en":title_en,"container-title":["Цифровые решения и технологии искусственного интеллекта"],"journal_en":"Digital Solutions and Artificial Intelligence Technologies","year":2026,"volume":"2","issue":"2","page":pages,"DOI":"10.26794/3030-7097-2026-2-2-"+pages,"URL":"https://www.digitarin.ru/jour/article/view/"+("54" if key=="dig54" else "55"),"type":"journal-article","verified":"2026-10-29","verification":"Publisher HTML citation metadata and abstract read"})
(BASE/"bibliography_metadata.json").write_text(json.dumps(refs,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")

W,H=1800,520
im=Image.new("RGB",(W,H),"white");draw=ImageDraw.Draw(im);font=ImageFont.truetype(r"C:\Windows\Fonts\times.ttf",34)
boxes=[(70,50,550,190,["Диагностика","наблюдаемых действий"]),(660,50,1140,190,["Выбор задания","и поддержки"]),(1250,50,1730,190,["Гипотеза","и реализация"]),(1250,320,1730,460,["Опыт в симуляторе","и проверка"]),(660,320,1140,460,["Объяснение","и артефакты"]),(70,320,550,460,["Обратная связь","и изменение шага"])]
svg=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}"><rect width="{W}" height="{H}" fill="white"/><defs><marker id="a" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto"><path d="M0,0 L12,6 L0,12" fill="none" stroke="black" stroke-width="1.5"/></marker></defs>']
for x1,y1,x2,y2,lines in boxes:
    draw.rectangle((x1,y1,x2,y2),outline="black",width=3);svg.append(f'<rect x="{x1}" y="{y1}" width="{x2-x1}" height="{y2-y1}" fill="white" stroke="black" stroke-width="3"/>')
    for j,line in enumerate(lines):
        cy=(y1+y2)/2+(j-.5)*43
        draw.text(((x1+x2)/2,cy),line,font=font,fill="black",anchor="mm")
        svg.append(f'<text x="{(x1+x2)/2}" y="{cy+11}" font-family="Times New Roman" font-size="34" text-anchor="middle">{html.escape(line)}</text>')
def arrow(a,b):
    draw.line([a,b],fill="black",width=3)
    import math
    angle=math.atan2(b[1]-a[1],b[0]-a[0]);size=16
    wings=[(b[0]-size*math.cos(angle+t),b[1]-size*math.sin(angle+t)) for t in (-.45,.45)]
    draw.line([wings[0],b,wings[1]],fill="black",width=3)
    svg.append(f'<path d="M{a[0]},{a[1]} L{b[0]},{b[1]}" fill="none" stroke="black" stroke-width="3" marker-end="url(#a)"/>')
for a,b in [((550,120),(660,120)),((1140,120),(1250,120)),((1490,190),(1490,320)),((1250,390),(1140,390)),((660,390),(550,390)),((310,320),(310,190))]:arrow(a,b)
svg.append("</svg>");(BASE/"figure_cycle.svg").write_text("".join(svg),encoding="utf-8");im.save(BASE/"figure_cycle.png",dpi=(300,300))

# A compact contract retained alongside the authoritative reference.
template=Path(r"C:\Users\PETR\Downloads\sitito_template.docx")
contract=f"""# Template contract for the Gorokhova SITITO author draft

Reference: {template}; SHA-256 {hashlib.sha256(template.read_bytes()).hexdigest()}.
Reference rendered by Microsoft Word read-only export and the packaged render_docx rasterizer: four pages, all inspected.
One portrait A4 section, one column; original margins 1422/917/709/567 twips (left/right/top/bottom).
Journal rule 1.8 overrides margins to 1134 twips on every side; page numbering remains absent.
Body: Times New Roman 10 pt, justified, single line spacing, 0 pt before/after.
First-line indentation 0 follows the user's previous explicit paragraph sample; journal rule 1.8 requests 1.25 cm. This author override is recorded for final submission review.
Title: source-derived 16 pt bold, black; no border; Title style only for article titles. Section labels use Normal style, not Heading styles.
Front matter: source paragraph patterns 0/5/10/17/18/19/20/25/28 and 59/72/73/74/75/80/83, with empty spacer paragraphs removed.
Body/section/reference patterns: 114/113/125; author patterns 157/166.
Slots: replace titles, author and organisation, address, mail, abstracts and keywords; replace body and bibliography; remove invented volume/page/DOI, editorial dates, sample ORCID and unconfirmed approval statements.
Keep the CC-BY image and license component from the reference; correct only its missing Russian word spaces. This is page furniture, not a numbered research table.
Tables: five authored comparison/data tables; black outer and internal borders, no fill, repeated header, no fixed row heights, cell padding. Captions precede tables.
Figure: one new monochrome SVG/PNG teaching-cycle diagram; caption follows it.
Editable parts: word/document.xml, word/styles.xml (Title only), document relationships (new figure only), footnotes (new source notes only), docProps/core.xml.
Preserve-only: original media, theme, settings, numbering, font table, customXml, app properties, existing package declarations and all other parts.
Fidelity gate: all preserve-only parts byte-identical; one A4 section; source hash unchanged; figure and new table relationships valid; no sample author, false publication details, em dash or table shading.
Template render and audits: work/gorokhova-sitito/template-render and template-style-evidence.json.
"""
(BASE/"template_contract.md").write_text(contract,encoding="utf-8")
work=BASE.parents[1]/"work"/"gorokhova-sitito";(work/"artifact.md").write_text(contract,encoding="utf-8")
print("Selected scientific sources:",len(refs),"; figure and template contract prepared")
