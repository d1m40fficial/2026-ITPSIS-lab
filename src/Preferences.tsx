import {useEffect,useState} from 'react'
import {CircleHelp,Moon,Sun,Maximize,Minimize} from 'lucide-react'

const key='lab-template:'+import.meta.env.BASE_URL
const readTheme=():string=>{try{return JSON.parse(localStorage.getItem(key+':theme')||'"light"')as string}catch{return 'light'}}

export function SiteControls(){
  const [theme,setTheme]=useState(readTheme)
  const [full,setFull]=useState(false)
  const [error,setError]=useState('')
  useEffect(()=>{document.documentElement.dataset.theme=theme;localStorage.setItem(key+':theme',JSON.stringify(theme))},[theme])
  useEffect(()=>{const update=()=>setFull(!!document.fullscreenElement);document.addEventListener('fullscreenchange',update);return()=>document.removeEventListener('fullscreenchange',update)},[])
  const toggleFullscreen=async()=>{try{if(full)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{setError('Полноэкранный режим недоступен в этом окне браузера.')}}
  return <><div className="course-controls"><button className="icon-button" aria-label={theme==='light'?'Включить тёмную тему':'Включить светлую тему'} onClick={()=>setTheme(theme==='light'?'dark':'light')}>{theme==='light'?<Moon size={18}/>:<Sun size={18}/>}</button><a className="icon-button" href={`${import.meta.env.BASE_URL}guide.html`} target="_blank" rel="noopener noreferrer" title="Как пользоваться сайтом" aria-label="Как пользоваться сайтом"><CircleHelp size={18}/></a><button className="icon-button" aria-label="Полноэкранный режим" onClick={toggleFullscreen}>{full?<Minimize size={18}/>:<Maximize size={18}/>}</button></div>{error&&<p className="package-error" role="alert">{error}</p>}</>
}
