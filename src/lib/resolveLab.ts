import variants from '../data/variant-data.json'
import type {Lab,SubjectArea,SourceData} from '../types'
const data=variants as Record<string,Record<string,{sourceData:SourceData}>>
export function resolveLab(lab:Lab,area:SubjectArea):Lab {
 const override=data[area.code]?.[lab.slug]
 if(!override)throw new Error(`Набор ${area.code}/${lab.slug} отсутствует`)
 return {...lab,...override}
}
