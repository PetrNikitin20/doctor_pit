from pathlib import Path
import json, re
from pypdf import PdfReader

B=Path(__file__).resolve().parents[1]
r=PdfReader(B/'articles/ПСТА_Статья_для_рецензирования.pdf')
texts=[p.extract_text() or '' for p in r.pages]
assert len(texts)==17 and all(len(t)>200 for t in texts)
combined='\n'.join(texts)
for token in ['никитин','nikitin','pvnikitin','финансов','financial university','0000-0001-8866-5610']:
    assert token not in combined.lower(), token
assert not (r.metadata.get('/Author') or '').strip()
assert '—' not in combined
links=[]; fonts={}; seen=set()
def resources(res):
    if not res: return
    res=res.get_object()
    for name,ref in (res.get('/Font') or {}).items():
        f=ref.get_object(); key=str(f.get('/BaseFont'))
        if key in fonts: continue
        subtype=str(f.get('/Subtype')); embedded=False
        ds=f.get('/DescendantFonts') or [f]
        for item in ds:
            item=item.get_object(); desc=item.get('/FontDescriptor')
            if desc:
                desc=desc.get_object()
                embedded=embedded or any(k in desc for k in ['/FontFile','/FontFile2','/FontFile3'])
        assert subtype!='/Type3',key
        assert embedded,(key,subtype)
        fonts[key]={'subtype':subtype,'embedded':embedded}
    for ref in (res.get('/XObject') or {}).values():
        obj=ref.get_object(); ident=id(obj)
        if ident in seen: continue
        seen.add(ident)
        resources(obj.get('/Resources'))
for page in r.pages:
    resources(page.get('/Resources'))
    for ref in page.get('/Annots',[]):
        ann=ref.get_object(); action=ann.get('/A')
        if action and '/URI' in action: links.append(str(action['/URI']))
for token in ['nikitin','pvnikitin','8866-5610','fa.ru']:
    assert token not in '\n'.join(links).lower(), token
rawmeta=str(r.metadata)+str(r.xmp_metadata)
assert 'nikitin' not in rawmeta.lower()
assert len([u for u in links if 'doi.org/' in u])>=14
report={'pages':17,'selectable_text_each_page':True,'anonymous_text_metadata_links':True,
        'font_count':len(fonts),'fonts_all_embedded':True,'type3_fonts':False,
        'doi_links':len([u for u in links if 'doi.org/' in u]),'fonts':fonts}
(B/'audit/psta_pdf_preflight.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k!='fonts'},ensure_ascii=False))
