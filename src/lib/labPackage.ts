import {strToU8,zipSync} from 'fflate'
import type {Lab,SubjectArea,QualityProfile} from '../types'
import {courseConfig} from '../config'
import {labCode} from './labId'
import {personalizeText} from './personalize'
import css from '../styles.css?inline'
import extraCss from '../template.css?inline'
const fetchBytes=async(path:string)=>{const r=await fetch(import.meta.env.BASE_URL+path);if(!r.ok)throw Error(`Не найден файл ${path}`);return new Uint8Array(await r.arrayBuffer())}
const csv=(rows:(string|number)[][])=>'\uFEFF'+rows.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(';')).join('\r\n')
export async function downloadBundle({labs,area,profile,renderPage}:{labs:Lab[];area:SubjectArea;profile:QualityProfile;renderPage:(lab:Lab)=>string}){
 if(!labs.length)throw Error('Нет работ в комплекте')
 const files:Record<string,Uint8Array>={};const font=await fetchBytes('fonts/raleway-cyrillic.woff2');
 files['assets/raleway.woff2']=font;files['assets/styles.css']=strToU8(css.replace(/url\([^)]*raleway[^)]*\)/g,"url('raleway.woff2')")+'\n'+extraCss+'\n.course-controls,.lab-side{display:none}.lab-page-grid{grid-template-columns:1fr}.variant-picker.compact{position:static}.lab-hero{display:block}');
 for(const lab of labs){const dir=`${area.code}/LR${lab.slug}/`;const code=`${courseConfig.code}-${labCode(lab.number)}`;const text=(s:string)=>personalizeText(s,lab.number,area);files[dir+'Шаблон_для_заполнения.docx']=await fetchBytes('reports/'+lab.reportFile);
  const doc=new DOMParser().parseFromString(renderPage(lab),'text/html');doc.querySelectorAll('select').forEach(select=>{const span=doc.createElement('strong');span.textContent=select.selectedOptions[0]?.textContent||`${area.code} · ${area.title}`;select.replaceWith(span)});doc.querySelectorAll('button,.lab-side,.submission-actions').forEach(el=>el.remove());doc.querySelectorAll('a').forEach(el=>{if(el.getAttribute('href')?.startsWith('#/'))el.remove()});
  const heading=doc.createElement('p');heading.className='offline-package-label';heading.textContent=`${code} · Вариант ${area.code} · ${area.title}. Шаблон и данные находятся в этой папке.`;doc.body.prepend(heading);
  files[dir+'Задание.html']=strToU8(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${code} · ${area.code}</title><link rel="stylesheet" href="../../assets/styles.css"></head><body>${doc.body.innerHTML}</body></html>`);
  let md=`# ${code}: ${lab.title}\n\nВариант ${area.code}: ${area.title}\n\n## Пояснение к задаче по предметной области\n${area.description}\n\n${text(lab.sourceData.intro)}\n\n`;for(const [i,section] of lab.sourceData.sections.entries()){md+=`## ${text(section.title)}\n\n${(section.content||[]).map(text).join('\n\n')}\n\n`;if(section.table){const rows=[section.table.columns,...section.table.rows].map(row=>row.map(x=>typeof x==='string'?text(x):x));const name=`Данные_${String(i+1).padStart(2,'0')}.csv`;files[dir+'Данные/'+name]=strToU8(csv(rows));md+=`Таблица: ${name}\n\n`}}
  files[dir+'Данные/Пояснение.md']=strToU8(md);files[dir+'Данные/Условия_варианта.csv']=strToU8(csv([['Вариант','Область','Система','Условие','Значение','Пример'],...profile.characteristics.map(x=>[area.code,area.title,area.systemCode,x.name,x.value,x.example.replaceAll('{system}',area.title)])]));
  files[dir+'Начните_здесь.md']=strToU8(`# ${code} · ${area.code}\n\n1. Откройте Задание.html в браузере без подключения к интернету.\n2. Используйте только файлы папки Данные этой работы. CSV: UTF-8, разделитель — точка с запятой.\n3. Заполните Шаблон_для_заполнения.docx. Укажите вариант ${area.code}, ФИО и группу.\n4. Оформите отчёт под нормоконтроль и сохраните результат одним файлом ${lab.recommendedFileName}.\n5. Сохраните результат: он пригодится в следующих работах.\n\nВсе значения — учебные.\n`);
 }
 files['Состав_комплекта.md']=strToU8(`# Комплект варианта ${area.code} — ${area.title}\n\n${labs.map(l=>`- ${courseConfig.code}-${labCode(l.number)}: ${l.title}`).join('\n')}\n\nРаспакуйте весь архив, чтобы сохранить оформление HTML. Каждая папка ЛР содержит только материалы соответствующей работы.\n`);
 files['manifest.json']=strToU8(JSON.stringify({schemaVersion:3,datasetVersion:labs[0].datasetVersion,variant:area.code,labs:labs.map(l=>({code:`${courseConfig.code}-${labCode(l.number)}`,id:l.slug,block:l.block,reportFile:l.reportFile,recommendedFileName:l.recommendedFileName})),files:Object.keys(files)},null,2));
 const zip=zipSync(files,{level:6});const href=URL.createObjectURL(new Blob([zip],{type:'application/zip'}));const a=document.createElement('a');a.href=href;a.download=`${area.code}_${labs.length===1?`${courseConfig.code}-${labCode(labs[0].number)}`:new Set(labs.map(l=>l.block)).size===1?`Блок${labs[0].block}`:'все_работы'}.zip`;a.click();setTimeout(()=>URL.revokeObjectURL(href),10000)
}
