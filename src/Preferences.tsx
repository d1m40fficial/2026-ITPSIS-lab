import {createContext,useContext,useEffect,useRef,useState} from 'react'
import type {ReactNode} from 'react'
import {CircleHelp,UserRound,Moon,Sun,Maximize,Minimize,X,Download} from 'lucide-react'
import {courseConfig} from './config'

type Profile={name:string;position:string;department:string}
const key='lab-template:'+import.meta.env.BASE_URL
const read=<T,>(k:string,f:T):T=>{try{return JSON.parse(localStorage.getItem(key+k)||'null')??f}catch{return f}}
const Context=createContext({materials:'',profile:{name:'',position:'',department:''},openSettings:()=>{}})
export const usePreferences=()=>useContext(Context)

export function PreferencesProvider({children}:{children:ReactNode}){
 const [profile,setProfile]=useState<Profile>(()=>read(':profile',{name:'',position:'',department:''}))
 const [materials,setMaterials]=useState(()=>read(':materials',courseConfig.materialsUrl))
 const [open,setOpen]=useState(false)
 useEffect(()=>{document.documentElement.dataset.theme=read(':theme','light')},[])
 return <Context.Provider value={{materials,profile,openSettings:()=>setOpen(true)}}>{children}{open&&<Settings profile={profile} materials={materials} close={()=>setOpen(false)} save={(p,m)=>{setProfile(p);setMaterials(m);localStorage.setItem(key+':profile',JSON.stringify(p));localStorage.setItem(key+':materials',JSON.stringify(m));setOpen(false)}}/>}</Context.Provider>
}

export function SiteControls(){
 const p=usePreferences()
 const [theme,setTheme]=useState(()=>read(':theme','light'))
 const [full,setFull]=useState(false)
 const [error,setError]=useState('')
 useEffect(()=>{document.documentElement.dataset.theme=theme;localStorage.setItem(key+':theme',JSON.stringify(theme))},[theme])
 useEffect(()=>{const update=()=>setFull(!!document.fullscreenElement);document.addEventListener('fullscreenchange',update);return()=>document.removeEventListener('fullscreenchange',update)},[])
 const toggleFullscreen=async()=>{try{if(full)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{setError('Полноэкранный режим недоступен в этом окне браузера.')}}
 return <><div className="course-controls"><span>{p.profile.name||'Лабораторный практикум'}{p.profile.position&&' · '+p.profile.position}{p.profile.department&&' · '+p.profile.department}</span><button className="button secondary" onClick={p.openSettings}><UserRound size={18}/>Настройка перед занятием</button><button className="icon-button" aria-label={theme==='light'?'Включить тёмную тему':'Включить светлую тему'} onClick={()=>setTheme(theme==='light'?'dark':'light')}>{theme==='light'?<Moon size={18}/>:<Sun size={18}/>}</button><a className="icon-button" href={`${import.meta.env.BASE_URL}guide.html`} target="_blank" rel="noopener noreferrer" title="Как пользоваться сайтом" aria-label="Как пользоваться сайтом"><CircleHelp size={18}/></a><button className="icon-button" aria-label="Полноэкранный режим" onClick={toggleFullscreen}>{full?<Minimize size={18}/>:<Maximize size={18}/>}</button></div>{error&&<p className="package-error" role="alert">{error}</p>}</>
}

function Settings({profile,materials,save,close}:{profile:Profile;materials:string;save:(p:Profile,m:string)=>void;close:()=>void}){
 const [p,setP]=useState(profile)
 const [m,setM]=useState(materials)
 const dialog=useRef<HTMLDialogElement>(null)
 useEffect(()=>{dialog.current?.showModal()},[])
 const pack=(name:string)=>`${import.meta.env.BASE_URL}teacher-packs/${name}`
 return <dialog className="settings-dialog" ref={dialog} onCancel={close}><div className="settings-heading"><h2>Настройка перед занятием</h2><button className="icon-button" aria-label="Закрыть настройки" onClick={close}><X/></button></div><form onSubmit={e=>{e.preventDefault();if(m&&!/^https?:\/\//i.test(m)){e.currentTarget.querySelector('input[type=url]')?.setAttribute('aria-invalid','true');return}save(p,m)}}>{(['name','position','department'] as const).map((k,i)=><label key={k}>{['ФИО преподавателя','Должность','Кафедра или лаборатория'][i]}<input value={p[k]} onChange={e=>setP({...p,[k]:e.target.value})}/></label>)}<label>Ссылка на материалы<input type="url" placeholder="https://…" value={m} onChange={e=>setM(e.target.value)}/></label><p>Данные сохраняются в этом браузере. Ниже доступны полные преподавательские комплекты.</p><section className="semester-downloads"><h3>Скачать лабораторные работы</h3><p>Каждый архив содержит все работы семестра, все 30 вариантов, шаблоны и данные.</p><a className="button secondary" href={pack('semester-7-all.zip')} download><Download size={17}/>7 семестр</a><a className="button secondary" href={pack('semester-8-all.zip')} download><Download size={17}/>8 семестр</a><a className="button secondary" href={pack('all-semesters.zip')} download><Download size={17}/>Все семестры</a></section><button className="button primary" type="submit">Сохранить</button></form></dialog>
}
