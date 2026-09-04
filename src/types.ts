export interface TheoryCard {
  label: string
  title: string
  text: string
}

export interface DataTable {
  title?: string
  columns: string[]
  rows: Array<Array<string | number>>
}

export interface DataSection {
  title: string
  content?: string[]
  table?: DataTable
}

export interface SourceData {
  intro: string
  sections: DataSection[]
}

export interface QualityCharacteristic {
  code: string
  name: string
  value: string
  example: string
}

export interface QualityProfile {
  id: number
  title: string
  variantRange: string
  characteristics: QualityCharacteristic[]
}

export interface SubjectArea {
  id: number
  code: string
  title: string
  systemCode: string
  description: string
  criticalFunction: string
  assets: string[]
  profileId: number
  pack: string
}

export interface Lab {
  number: number
  semesterLabNumber: number
  slug: string
  title: string
  block: number
  blockTitle: string
  semester: 7 | 8
  topicCode: string
  topicTitle: string
  points: number
  practicalResult: string
  sequenceInput: string
  sequenceOutput: string
  situation: string
  goal: string
  outcomes: string[]
  sourceData: SourceData
  tools: string[]
  theoryCards: TheoryCard[]
  task: string[]
  stages: string[]
  deliverables: string[]
  evidence: string[]
  selfCheck: string[]
  wordRequirements: string[]
  professionalChoice: string
  lmsSteps: string[]
  reportFile: string
  recommendedFileName: string
}
