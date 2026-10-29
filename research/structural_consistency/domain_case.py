"""Documentary facts and AUTHOR-PROPOSED annotations remain explicitly distinct."""
from pathlib import Path
import json
from experiment import Rule,Index,closure,status
B=Path(__file__).resolve().parent
def main():
 rows=json.loads((B/'curriculum_fragment.json').read_text(encoding='utf8'))
 # Correct column is B (C contains the department abbreviation).
 for r in rows:r['name']=r['cells']['B'+str(r['row'])]
 (B/'curriculum_fragment.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8')
 seed_labels=['entry_assumption']+['scheduled_course_row_'+str(x['row']) for x in rows]
 outputs=[('MF-1_MF-1.1',1,'teach',1),('MF-1_MF-1.1',1,'assess',1),('PL-1_PL-1.1',1,'teach',1),('PL-1_PL-1.1',1,'assess',1),('PL-1_PL-1.1',2,'teach',2),('PL-1_PL-1.1',2,'assess',2),('BD-3_BD-3.1',2,'teach',4),('BD-3_BD-3.1',2,'assess',4),('ML-2_ML-2.2',2,'teach',4),('ML-2_ML-2.2',2,'assess',4)]
 rules=[Rule((1,2),7),Rule((7,),8),Rule((3,),9),Rule((9,),10),Rule((4,10),11),Rule((11,),12),Rule((5,12),13),Rule((13,),14),Rule((6,8,12),15),Rule((15,),16)]
 g=Index(17,rules);seeds=set(range(7));candidate=set(range(10));targets={8,12,14,16}
 low=closure(g,set(),seeds)[0];high=closure(g,candidate,seeds)[0]
 assert status(targets,low,high)=='undetermined'
 promoted=closure(g,candidate,seeds)[0];assert status(targets,promoted,promoted)=='ensured'
 removed=candidate-{7};counterfactual=closure(g,removed,seeds)[0]
 assert status(targets,counterfactual,counterfactual)=='not_ensured'
 assessments={1:'Применение математического метода с обоснованием предпосылок',3:'Поиск на Python с проверкой граничных случаев',5:'Сравнение сложности линейного и двоичного поиска',7:'Индексирование структурированных данных и проверка результата запроса',9:'Подготовка признаков без утечки между обучающей и контрольной выборками'}
 candidates=[]
 for i,r in enumerate(rules):
  rec={'id':i,'tail':r.tail,'head':r.head,'annotation_status':'author_proposed_not_in_source_documents','diagnostic_required':i in assessments}
  if i in assessments:rec.update(assessment_id=f'author_assessment_{i}',rubric_id=f'author_rubric_{i}_v1',planned_assessment=assessments[i],rubric_status='proposed_not_expert_approved')
  candidates.append(rec)
 data={'scope':'Illustrative compilation of six actual discipline rows, with ten author-proposed rules; not an expert audit of the programme.',
 'seed_facts':seed_labels,'atoms':[{'id':i+7,'indicator':a[0],'level':a[1],'kind':a[2],'semester':a[3],'version':'author_scenario_v1'} for i,a in enumerate(outputs)],
 'candidate_rules':candidates,
 'targets':sorted(targets),'lower_rule_count':0,'upper_rule_count':10,'lower_reached':len(low),'upper_reached':len(high),'actual_documentary_status':'undetermined',
 'target_statuses':{str(a):status({a},low,high) for a in sorted(targets)},
 'hypothetical_all_annotations_approved':'ensured','counterfactual_remove_database_diagnostic':'not_ensured'}
 (B/'domain_case.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps(data,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
