"""Independent numerical and OOXML checks for the author-review manuscript."""
from pathlib import Path
from zipfile import ZipFile
from lxml import etree as E
import json,math,hashlib,re

BASE=Path(__file__).parent
ROOT=BASE.parents[1]
DOC=ROOT/'articles'/'Горохова_Дифференцированное_обучение_алгоритмам_SITITO_2026-10-29.docx'
NS={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
results=json.loads((BASE/'demonstration_results.json').read_text(encoding='utf-8'))
for row in results['sorting']:
    n=row['n'];state=42;values=list(range(n))
    for i in range(n-1,0,-1):
        state=(1664525*state+1013904223)&0xffffffff
        j=(state*(i+1))//2**32
        values[i],values[j]=values[j],values[i]
    # Count insertion comparisons from prefix ranks, without running insertion sort.
    count=sum(sum(x>values[i] for x in values[:i])+int(any(x<=values[i] for x in values[:i])) for i in range(1,n))
    assert count==row['insertion'],row
    # Independent bottom-up merge schedule for the power-of-two example sizes.
    count=0;step=1;merged=values[:]
    while step<n:
        output=[]
        for start in range(0,n,2*step):
            left=merged[start:start+step];right=merged[start+step:start+2*step];a=b=0
            while a<len(left) and b<len(right):
                count+=1
                if left[a]<=right[b]:output.append(left[a]);a+=1
                else:output.append(right[b]);b+=1
            output.extend(left[a:]);output.extend(right[b:])
        merged=output;step*=2
    assert merged==list(range(n))
    assert count==row['merge'],row
    assert abs(count/(n*math.log2(n))-row['mergeNormalized'])<=.000050001
    assert abs(row['insertion']/n**2-row['insertionNormalized'])<=.000050001
assert results['boundary']['result']['index']==-1
assert results['aiFixture']['errors']==16 and not results['aiFixture']['externalModelCalled']
for row in results['inversionCases']:
    a=row['values'];assert row['expected']==sum(a[i]>a[j] for i in range(len(a)) for j in range(i+1,len(a)))

with ZipFile(DOC) as z:
    doc=E.fromstring(z.read('word/document.xml'))
    text=' '.join(doc.xpath('//w:t/text()',namespaces=NS))
    assert '\u2014' not in text and '[ref:' not in text and '[TABLE:' not in text and '{{footnote:' not in text
    tables=doc.findall('.//w:tbl',NS);scientific=[t for t in tables if t.find('w:tblPr/w:tblBorders',NS) is not None]
    assert len(scientific)==5 and not doc.findall('.//w:tbl//w:shd',NS)
    for t in scientific:
        borders=t.find('w:tblPr/w:tblBorders',NS)
        assert all(borders.find('w:'+k,NS) is not None for k in ('top','bottom','left','right','insideH','insideV'))
        assert t.find('w:tr/w:trPr/w:tblHeader',NS) is not None
    section=doc.find('.//w:sectPr',NS)
    assert len(doc.findall('.//w:sectPr',NS))==1
    assert all(section.find('w:pgMar',NS).get('{'+NS['w']+'}'+k)=='1134' for k in ('top','bottom','left','right'))
    for p in doc.findall('w:body/w:p',NS):
        style=p.find('w:pPr/w:pStyle',NS)
        assert style is None or style.get('{'+NS['w']+'}val') in ('Normal','Title')
    assert '0000-0000' not in text and 'Иванов Олег' not in text
    assert 'rigorokhova@fa.ru' in text
front=json.loads((BASE/'front_matter.json').read_text(encoding='utf-8'))
abstracts={}
for lang in ('ru','en'):
    s=' '.join(a+' '+b for a,b in front['abstract_'+lang]);words=len(s.split())
    assert 200<=words<=250 and 1500<=len(s)<=2000
    abstracts[lang]={'words':words,'characters':len(s)}
refs=json.loads((BASE/'bibliography_metadata.json').read_text(encoding='utf-8'))
assert len(refs)==27 and len(set(x['DOI'] for x in refs))==27
recent=[r['key'] for r in refs if r['type']=='journal-article' and r['year']>=2022 and not r['key'].startswith('dig')]
assert len(recent)>=math.ceil(len(refs)/3)
source=json.loads((BASE/'source_manifest.json').read_text(encoding='utf-8'))
assert hashlib.sha256(Path(r'C:\Users\PETR\Downloads\sitito_template.docx').read_bytes()).hexdigest()==source['sources']['sitito_template']['sha256']
review=json.loads((BASE/'visual_review.json').read_text(encoding='utf-8'))
digest=hashlib.sha256(DOC.read_bytes()).hexdigest()
assert review['reviewedDocxSha256']==digest,'The changed DOCX requires a new visual review'
assert review['layoutPassed'] and review['pagesInspected']==list(range(1,review['pages']+1))
report={'date':'2026-10-29','docxSha256':digest,'pages':review['pages'],'abstracts':abstracts,'scientificSources':27,'digitarinSources':2,'foreignJournalPapers2022to2026':len(recent),'recentForeignJournalKeys':recent,'scientificTables':5,'tableShading':False,'allScientificTableBorders':True,'emDashes':0,'independentNumericalChecksPassed':True,'sortingRowsChecked':5,'pedagogicalExperimentPerformed':False,'orcidKnown':False,'authorApprovalPending':True,'originalScientificExperimentsChanged':False,'visualQA':review}
(BASE/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
