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

  it('содержит 30 областей и шесть групп по пять вариантов', () => {
    expect(subjectPayload.subjectAreas).toHaveLength(30)
    expect(subjectPayload.profiles).toHaveLength(6)
    for (const profile of subjectPayload.profiles) {
      expect(profile.characteristics).toHaveLength(5)
      expect(subjectPayload.subjectAreas.filter((area) => area.profileId === profile.id)).toHaveLength(5)
    }
  })
})
