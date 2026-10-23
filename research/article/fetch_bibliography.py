from pathlib import Path
import urllib.request,urllib.parse,json,concurrent.futures,re
BASE=Path(__file__).parent
dois=['10.1145/3569576','10.1109/TLT.2024.3383325','10.1109/TKDE.2025.3552759','10.3390/electronics15010238','10.3390/electronics14020255','10.1016/j.ipm.2025.104393','10.31577/cai_2025_4_983','10.3390/educsci13070741','10.1111/ejed.12527','10.1016/j.lindif.2023.102274','10.1073/pnas.2422633122','10.1038/s41598-025-97652-6','10.1016/j.caeai.2023.100184','10.1007/BF01099821','10.1007/s11257-011-9106-8','10.1007/s11257-017-9193-2','10.1016/j.eswa.2024.124797','10.17513/spno.34235']
queries=['Hybrid Models for Knowledge Tracing A Systematic Literature Review','A survey of explainable knowledge tracing','Transfer of test enhanced learning Meta analytic review and synthesis','Адаптивное персонализированное обучение внедрение современных технологий в высшем образовании','Математическое моделирование индивидуальной образовательной траектории 2023 2024','Evidence centered assessment design Mislevy Almond Lukas']
def get(url):
    req=urllib.request.Request(url,headers={'User-Agent':'ResearchBibliography/1.0 (local scholarly metadata verification)'})
    with urllib.request.urlopen(req,timeout=35) as r:return json.load(r)['message']
def task(key):
    try:
        if key in dois:return key,get('https://api.crossref.org/works/'+urllib.parse.quote(key,safe=''))
        return key,get('https://api.crossref.org/works?query.bibliographic='+urllib.parse.quote(key)+'&rows=2')['items']
    except Exception as e:return key,{'error':str(e)}
results={}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:
    for key,value in ex.map(task,dois+queries):results[key]=value
(BASE/'bibliography_metadata.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
for key,m in results.items():
    arr=m if isinstance(m,list) else [m]
    for x in arr:
        print(json.dumps({'key':key,'doi':x.get('DOI'),'title':x.get('title'),'authors':[' '.join([a.get('given',''),a.get('family','')]) for a in x.get('author',[])][:8],'journal':x.get('container-title'),'year':x.get('published'),'volume':x.get('volume'),'issue':x.get('issue'),'pages':x.get('page') or x.get('article-number'),'abstract':re.sub('<[^>]+>',' ',x.get('abstract',''))[:1300],'error':x.get('error')},ensure_ascii=False))
