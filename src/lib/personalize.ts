import type {SubjectArea} from '../types'
export const personalizeText=(s:string,_n:number,a:SubjectArea)=>s.replaceAll('{system}',a.systemCode).replaceAll('{area}',a.title).replaceAll('{function}',a.criticalFunction)
