import { describe, expect, it } from 'vitest'
import payload from '../src/data/labs.json'
import subjectPayload from '../src/data/subject-areas.json'

describe('карта лабораторных работ', () => {
  it('содержит 12 уникальных последовательных работ на 100 баллов', () => {
    expect(payload.labs).toHaveLength(12)
    expect(new Set(payload.labs.map((lab) => lab.number)).size).toBe(12)
    expect(payload.labs.reduce((sum, lab) => sum + lab.points, 0)).toBe(100)
    for (const lab of payload.labs) {
      expect(lab.previousResults.length).toBeGreaterThan(20)
      expect(lab.inputMaterials.length).toBeGreaterThan(20)
      expect(lab.sequenceOutput.length).toBeGreaterThan(20)
      expect(lab.taskSteps).toHaveLength(6)
      for (const step of lab.taskSteps) {
        expect(step.action.length).toBeGreaterThan(20)
        expect(step.sources.length).toBeGreaterThan(20)
        expect(step.result.length).toBeGreaterThan(20)
        expect(step.check.length).toBeGreaterThan(20)
      }
      expect(lab.workedExample.source).toContain('DEMO')
      expect(lab.reportSections.length).toBeGreaterThanOrEqual(3)
      expect(lab).not.toHaveProperty('durationHours')
      expect(lab).not.toHaveProperty('hours')
      expect(lab).not.toHaveProperty('task')
      expect(lab).not.toHaveProperty('stages')
    }
  })

  it('сохраняет по 50 баллов в каждом семестре', () => {
    const semester7 = payload.labs.filter((lab) => lab.semester === 7)
    const semester8 = payload.labs.filter((lab) => lab.semester === 8)
    expect(semester7).toHaveLength(7)
    expect(semester8).toHaveLength(5)
    expect(semester7.reduce((sum, lab) => sum + lab.points, 0)).toBe(50)
    expect(semester8.reduce((sum, lab) => sum + lab.points, 0)).toBe(50)
  })

  it('содержит 29 областей и шесть непустых групп вариантов', () => {
    expect(subjectPayload.subjectAreas).toHaveLength(29)
    expect(subjectPayload.profiles).toHaveLength(6)
    const codes = subjectPayload.subjectAreas.map((area) => area.code)
    expect(new Set(codes).size).toBe(29)
    expect(codes[0]).toBe('SA01')
    expect(codes[codes.length - 1]).toBe('SA29')
    for (const profile of subjectPayload.profiles) {
      expect(profile.characteristics).toHaveLength(5)
      const areasInProfile = subjectPayload.subjectAreas.filter((area) => area.profileId === profile.id)
      expect(areasInProfile.length).toBeGreaterThan(0)
      const padded = (value: number) => String(value).padStart(2, '0')
      expect(profile.variantRange).toBe(`${padded(areasInProfile[0].id)}–${padded(areasInProfile[areasInProfile.length - 1].id)}`)
    }
  })

  it('рекомендует имя файла по сквозному номеру работы и не требует LMS', () => {
    for (const lab of payload.labs) {
      expect(lab.recommendedFileName).toBe(`Фамилия_Группа_МДК0602_ЛР${String(lab.number).padStart(2, '0')}.docx`)
      expect(lab.lmsSteps).toHaveLength(4)
      expect(lab.wordRequirements).toHaveLength(6)
      expect(lab.wordRequirements).toContain('Оформите под нормоконтроль')
      expect(lab.wordRequirements.join(' ')).toContain('Удалите серые подсказки')
      expect(lab.lmsSteps.join(' ')).not.toMatch(/LMS/iu)
    }
  })
})
