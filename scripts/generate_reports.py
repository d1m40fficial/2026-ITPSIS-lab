import json, zipfile, sys
from pathlib import Path
from copy import deepcopy
from lxml import etree
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import report_ooxml as g
labs=json.loads((ROOT/'src/data/labs.json').read_text(encoding='utf-8'))['labs']
forms=json.loads((ROOT/'inputs/report-forms.json').read_text(encoding='utf-8'))
for lab,form in zip(labs,forms):
 ref=ROOT/'inputs/report-reference'/lab['reportFile']
 with zipfile.ZipFile(ref) as z: xml=z.read('word/document.xml')
 tree=etree.fromstring(xml);body=tree.find('w:body',g.NS);sect=body.find(g.qn('w:sectPr'))
 cut=False
 for child in list(body):
  if 'Шаблон отчёта' == ''.join(child.xpath('.//w:t/text()',namespaces=g.NS)).strip():cut=True
  if cut and child is not sect:body.remove(child)
 # Apply the new template typography and page width to editable cover text.
 for rpr in body.xpath('.//w:rPr',namespaces=g.NS):
  for name in ['sz','szCs']:
   el=rpr.find(g.qn('w:'+name))
   if el is None:el=g.add(rpr,'w:'+name)
   el.set(g.qn('w:val'),'24')
 for mar in sect.findall(g.qn('w:pgMar')):
  for k,v in dict(left=1701,right=850,top=1134,bottom=1134).items():mar.set(g.qn('w:'+k),str(v))
 def insert(el):body.insert(body.index(sect),el)
 def p(s,**kw):insert(g.paragraph(s,size=24,after=110,**kw))
 def h(s,new=False):
  el=g.heading(s,level=1,page_break_before=new)
  for t in el.xpath('.//w:sz|.//w:szCs',namespaces=g.NS):t.set(g.qn('w:val'),'24')
  for c in el.xpath('.//w:color',namespaces=g.NS):c.set(g.qn('w:val'),'000000')
  insert(el)
 h(form['title'],True)
 p(f"МДК.06.02-ЛР{int(lab['number']):02d}")
 p(f"Рекомендуемое имя файла: {lab['recommendedFileName']}")
 p('Вариант SA____   Предметная область ____________________')
 p('Версия данных: '+lab['datasetVersion'])
 p('Назначение формы: '+lab['practicalResult']+'.')
 p('Заполняйте таблицы своими результатами, добавляя строки по числу исходных записей. Пустая ячейка не означает отсутствие факта: неизвестное обозначайте явно. Данные и подробное задание находятся в соседних файлах архива.')
 for pi,page in enumerate(form['pages']):
  if pi>0:h(form['title']+' — продолжение',True)
  for title,headers in page:
   h(title)
   p('Приведите конкретные ID, собственные решения и основания. Добавьте строки для всех записей, требуемых заданием.')
   rows=[['[Заполните]']*len(headers) for _ in range(3)]
   t=g.make_table(headers,rows,[3000,3000,3350],font_size=24)
   for rh in t.xpath('.//w:trHeight',namespaces=g.NS):rh.getparent().remove(rh)
   for border in t.xpath('.//w:tblBorders/*',namespaces=g.NS):border.set(g.qn('w:color'),'D9D9D9')
   insert(t)
 if lab['number'] in [1,4,10]:
  h('Схема процесса или проверки')
  p('Покажите состояния или ветви и условия переходов. Допустима редактируемая таблица переходов вместо изображения.')
  insert(g.hint_box('[Место для схемы при использовании изображения]',lines=2))
  p('Рисунок № — Название',align='center')
  p('Впишите номер и название рисунка самостоятельно.',align='center')
 h('Проверка на контрольном случае',True)
 p(lab['taskSteps'][5]['action'].split('. ')[-1])
 for title in ['Первичное решение и новые факты','Расчёт или различающая проверка','Пересмотр решения и оставшиеся ограничения']:
  h(title);p('[Запишите собственный результат с ID контрольного случая. Добавьте необходимое обоснование.]')
 h('Профессиональное заключение');p(lab['professionalChoice']);p('[Сформулируйте решение, основание и границу применимости.]')
 h('Оценивание');p(lab['assessment'])
 # All editable text, including hints, uses the specified font and size.
 for run in body.xpath('.//w:r',namespaces=g.NS):
  rp=run.find(g.qn('w:rPr'))
  if rp is None:rp=g.add(run,'w:rPr')
  for name in ['sz','szCs']:
   el=rp.find(g.qn('w:'+name))
   if el is None:el=g.add(rp,'w:'+name)
   el.set(g.qn('w:val'),'24')
 output=ROOT/'public/reports'/lab['reportFile']
 g.write_docx(ref,output,etree.tostring(tree,xml_declaration=True,encoding='UTF-8',standalone=True))
 g.verify_preservation(ref,output)
 print(output.name)
