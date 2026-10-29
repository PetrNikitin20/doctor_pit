"""Retrieve primary DOI registration metadata; selection still requires review."""
from concurrent.futures import ThreadPoolExecutor
from urllib.request import Request, urlopen
from urllib.parse import urlencode
from pathlib import Path
import json,time

QUERIES = [
("qian","Students' Misconceptions and Other Difficulties in Introductory Programming: A Literature Review"),
("robins","Learning and Teaching Programming: A Review and Discussion"),
("sorva","Notional Machines and Introductory Programming Education"),
("biggs","Enhancing teaching through constructive alignment"),
("smale","Differentiated Instruction in Secondary Education: A Systematic Review of Research Evidence"),
("deunk","Effective differentiation Practices: A systematic review and meta-analysis of studies on the cognitive effects of differentiation practices in primary education"),
("shute","Focus on Formative Feedback"),
("scaffolding","Scaffolding in Teacher Student Interaction: A Decade of Research"),
("visual","A Meta-Study of Algorithm Visualization Effectiveness"),
("shaffer","Algorithm Visualization: The State of the Field"),
("calderon","Active Learning Methodologies for Teaching Programming in Undergraduate Courses: A Systematic Mapping Study"),
("primm","Teaching computer programming with PRIMM: a sociocultural perspective"),
("kazemi","Studying the effect of AI Code Generators on Supporting Novice Learners in Introductory Programming"),
("gap","The Widening Gap: The Benefits and Harms of Generative AI for Novice Programmers"),
("codeaid","CodeAid: Evaluating a Classroom Deployment of an LLM-based Programming Assistant that Balances Student and Educator Needs"),
("copilot","Conversing with Copilot: Exploring Prompt Engineering for Solving CS1 Problems Using Natural Language"),
("prompt","Prompt Problems: A New Programming Exercise for the Generative AI Era"),
("hard","Programming Is Hard Or at Least It Used to Be: Educational Opportunities and Challenges of AI Code Generation"),
("robots","The Robots Are Here: Navigating the Generative AI Revolution in Computing Education"),
("zawacki","Systematic review of research on artificial intelligence applications in higher education"),
("messer","Automated Grading and Feedback Tools for Programming Education: A Systematic Review"),
("navigate","Navigating the Landscape of Automated Feedback Generation Techniques for Programming Exercises"),
("formal","Formal Autograding in a Classroom Extended Version"),
("ouyang","Artificial intelligence in online higher education: A systematic review of empirical research from 2011 to 2020"),
("crompton","Artificial intelligence in higher education: the state of the field"),
("kasneci","ChatGPT for good? On opportunities and challenges of large language models for education"),
("yan","Practical and ethical challenges of large language models in education: A systematic scoping review"),
("khosravi","Explainable Artificial Intelligence in education"),
("lo","What Is the Impact of ChatGPT on Education? A Rapid Review of the Literature")
]
def fetch(pair):
    key,title=pair
    url="https://api.crossref.org/works?"+urlencode({"query.title":title,"rows":2})
    time.sleep(1.2)
    for attempt in range(3):
        try:
            with urlopen(Request(url,headers={"User-Agent":"Mozilla/5.0"}),timeout=20) as response:
                items=json.load(response)["message"]["items"]
            break
        except Exception:
            if attempt==2:return key,[{"error":"Metadata lookup unavailable","requestedTitle":title}]
            time.sleep(3*(attempt+1))
    fields=["DOI","title","subtitle","author","container-title","published","issued","volume","issue","page","article-number","URL","type"]
    return key,[{k:i[k] for k in fields if k in i} for i in items]
if __name__=="__main__":
    target=Path(__file__).parent/"bibliography_candidates.json"
    result=json.loads(target.read_text(encoding="utf-8")) if target.exists() else {}
    with ThreadPoolExecutor(max_workers=1) as pool:result.update(dict(pool.map(fetch,[p for p in QUERIES if p[0] not in result])))
    target.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    for key,items in result.items():
        for i,item in enumerate(items):
            print(key,i,item.get("DOI"),item.get("published",item.get("issued")),item.get("title",[item.get("error")])[0])
