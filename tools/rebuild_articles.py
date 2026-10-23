from pathlib import Path
import subprocess,sys,os
from finalize_manuscript import finalize
B=Path(__file__).resolve().parents[1]
scratch=B/'work/build';scratch.mkdir(parents=True,exist_ok=True)
env={**os.environ,'DOCTOR_PIT_OUTPUT_DIR':str(scratch),'PYTHONIOENCODING':'utf-8'}
def run(folder,file):subprocess.run([sys.executable,str(B/'research'/folder/file)],env=env,check=True)
for folder,builder in [('article','build_article.py'),('ejce','build_docx.py'),('injoit','build_article.py')]:
    run(folder,'manuscript.py');run(folder,builder)
run('diff_eq','build_draft.py');run('diff_eq','retarget_itvs.py')
spec=[('sitito','Статья_Никитин_Междисциплинарные_переходы_SITITO'),('ejce','Статья_EJCE_Междисциплинарные_траектории_русская'),('injoit','Статья_INJOIT_Численный_метод_выбора_действий'),('itvs','Статья_ИТВС_Идентификация_динамической_модели_подготовки')]
for journal,stem in spec:
    finalize(scratch/(stem+'.docx'),B/'articles'/(stem+'_редакция_2026-10-23.docx'),journal)
