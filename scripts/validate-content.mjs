import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const { labs } = JSON.parse(readFileSync(resolve(root, 'src/data/labs.json'), 'utf8'))
const { subjectAreas, profiles } = JSON.parse(readFileSync(resolve(root, 'src/data/subject-areas.json'), 'utf8'))
const errors = []
const variants = JSON.parse(readFileSync(resolve(root, 'src/data/variant-data.json'), 'utf8'))
for (const area of subjectAreas) {
  for (const lab of labs) {
    const data = variants[area.code]?.[lab.slug]?.sourceData?.sections
    if (!Array.isArray(data) || !data.length) {
      errors.push(`${area.code}/${lab.slug}: отсутствуют вариантные данные.`)
      continue
    }
    for (const section of data) {
      if (section.table && section.table.rows.some(row => row.length !== section.table.columns.length)) {
        errors.push(`${area.code}/${lab.slug}: нарушена структура таблицы.`)
      }
    }
  }
}
const officialTitles = [
  'Разработка регламента работы службы поддержки информационной системы',
  'Разработка соглашения об уровне обслуживания с показателями и приоритетами',
  'Обработка потока обращений пользователей: регистрация, классификация, назначение приоритета и исполнителя',
  'Воспроизведение проблемы по описанию пользователя и составление сценария воспроизведения',
  'Разработка статей базы знаний по типовым обращениям пользователей',
  'Разработка регламента обновления системы с порядком отката и проведение учебного обновления',
  'Разработка регламента резервного копирования и восстановления информационной системы',
  'Отработка порядка действий при отказе информационной системы по заданному сценарию',
  'Организация сбора сведений об ошибках: настройка ведения журнала приложения и разбор записей',
  'Локализация отказа по слоям: определение неисправного слоя по заданным признакам',
  'Разбор отказа: восстановление хронологии по журналам, определение причины, оформление отчёта',
  'Составление плана технического обслуживания аппаратных средств и ведение учёта состояния оборудования',
]
const points = [6, 6, 8, 7, 8, 8, 7, 10, 10, 10, 10, 10]
const requiredArrays = ['outcomes', 'tools', 'theoryCards', 'taskSteps', 'deliverables', 'evidence', 'sourceReferences', 'selfCheck', 'wordRequirements', 'reportSections', 'lmsSteps']
const requiredStrings = ['slug', 'title', 'blockTitle', 'topicCode', 'topicTitle', 'practicalResult', 'previousResults', 'inputMaterials', 'sequenceOutput', 'situation', 'goal', 'professionalChoice', 'reportFile', 'recommendedFileName']
const normalize = (value) => String(value).trim().toLocaleLowerCase('ru-RU').replace(/[.!?;,:—–\s]+/gu, ' ')
const stepFields = ['action', 'sources', 'result', 'check']
const vagueAction = /^(?:изучите материал|ознакомьтесь с|проведите анализ|сделайте вывод|оформите результат)\b/iu

if (!Array.isArray(labs)) errors.push('Поле labs должно быть массивом.')
if (labs.length !== 12) errors.push(`Ожидалось 12 работ, найдено ${labs.length}.`)

const seenNumbers = new Set()
const seenSlugs = new Set()
for (const lab of labs) {
  const prefix = `ЛР ${lab.number ?? '?'}`
  if (!Number.isInteger(lab.number) || lab.number < 1 || lab.number > 12) errors.push(`${prefix}: неверный сквозной номер.`)
  if (seenNumbers.has(lab.number)) errors.push(`${prefix}: повтор номера.`)
  seenNumbers.add(lab.number)

  const expectedSemester = lab.number <= 7 ? 7 : 8
  const expectedLocalNumber = lab.number <= 7 ? lab.number : lab.number - 7
  const expectedBlock = expectedSemester === 7 ? 1 : 2
  const expectedSlug = `${expectedSemester}-${String(expectedLocalNumber).padStart(2, '0')}`
  if (lab.semester !== expectedSemester) errors.push(`${prefix}: неверный семестр.`)
  if (lab.semesterLabNumber !== expectedLocalNumber) errors.push(`${prefix}: неверный номер внутри семестра.`)
  if (lab.block !== expectedBlock) errors.push(`${prefix}: неверный блок.`)
  if (lab.slug !== expectedSlug) errors.push(`${prefix}: slug должен быть ${expectedSlug}.`)
  if (seenSlugs.has(lab.slug)) errors.push(`${prefix}: повтор slug ${lab.slug}.`)
  seenSlugs.add(lab.slug)
  if (lab.title !== officialTitles[lab.number - 1]) errors.push(`${prefix}: официальное название изменено.`)
  if (lab.points !== points[lab.number - 1]) errors.push(`${prefix}: ожидалось ${points[lab.number - 1]} баллов.`)
  if ('competencies' in lab) errors.push(`${prefix}: подписи ОК/ПК должны быть удалены.`)
  if ('durationHours' in lab || 'hours' in lab || 'estimatedTime' in lab) errors.push(`${prefix}: часы выполнения не должны публиковаться.`)

  for (const key of requiredStrings) if (typeof lab[key] !== 'string' || !lab[key].trim()) errors.push(`${prefix}: пустое поле ${key}.`)
  for (const key of requiredArrays) if (!Array.isArray(lab[key]) || !lab[key].length) errors.push(`${prefix}: пустой массив ${key}.`)
  for (const key of ['deliverables', 'evidence', 'sourceReferences', 'selfCheck', 'reportSections']) {
    const values = (lab[key] ?? []).map(normalize)
    if (new Set(values).size !== values.length) errors.push(`${prefix}: повторы в блоке ${key}.`)
  }
  if ('task' in lab || 'stages' in lab || 'sequenceInput' in lab) errors.push(`${prefix}: в публичных данных осталась устаревшая структура задания или последовательности.`)
  if (lab.taskSteps?.length !== 6) errors.push(`${prefix}: должно быть ровно 6 обязательных шагов.`)
  const actions = []
  for (const [index, step] of (lab.taskSteps ?? []).entries()) {
    for (const field of stepFields) {
      if (typeof step?.[field] !== 'string' || step[field].trim().length < 20) errors.push(`${prefix}, шаг ${index + 1}: поле ${field} должно быть конкретным и проверяемым.`)
    }
    if (vagueAction.test(step?.action ?? '')) errors.push(`${prefix}, шаг ${index + 1}: расплывчатая формулировка действия.`)
    actions.push(normalize(step?.action ?? ''))
  }
  if (new Set(actions).size !== actions.length) errors.push(`${prefix}: обязательные шаги повторяются.`)
  for (const field of stepFields) {
    if (typeof lab.optionalTask?.[field] !== 'string' || lab.optionalTask[field].trim().length < 20) errors.push(`${prefix}: дополнительное задание не содержит поле ${field}.`)
  }
  for (const field of ['source', 'method', 'result', 'check']) {
    if (typeof lab.workedExample?.[field] !== 'string' || lab.workedExample[field].trim().length < 30) errors.push(`${prefix}: разобранный пример не содержит поле ${field}.`)
  }
  if (!/DEMO/iu.test(JSON.stringify(lab.workedExample))) errors.push(`${prefix}: пример должен использовать отдельные демонстрационные данные.`)
  const deliverableValues = new Set((lab.deliverables ?? []).map(normalize))
  if ((lab.evidence ?? []).some((item) => deliverableValues.has(normalize(item)))) errors.push(`${prefix}: точный дубль между результатами и доказательствами.`)
  if (!lab.sourceData?.intro?.trim() || !Array.isArray(lab.sourceData.sections) || !lab.sourceData.sections.length) errors.push(`${prefix}: недостаточно исходных данных.`)
  if (lab.theoryCards?.length < 3 || lab.theoryCards?.length > 7) errors.push(`${prefix}: должно быть 3–7 карточек теории.`)
  if (lab.selfCheck?.length !== 6) errors.push(`${prefix}: должно быть ровно 6 однозначных пунктов самопроверки.`)
  if (lab.sourceReferences?.length < 4) errors.push(`${prefix}: недостаточно обязательных ссылок на исходные данные.`)
  if (lab.reportSections?.length < 3) errors.push(`${prefix}: форма должна содержать предметный результат, основания и контроль.`)
  if (lab.lmsSteps?.length !== 4) errors.push(`${prefix}: должно быть 4 шага подготовки отчёта.`)
  if (lab.wordRequirements?.length !== 6) errors.push(`${prefix}: должно быть 6 требований к Word-файлу.`)
  if (!lab.wordRequirements?.some((item) => item.startsWith('Удалите серые подсказки'))) errors.push(`${prefix}: нет требования удалить серые подсказки.`)
  if (!lab.wordRequirements?.some((item) => item === 'Оформите под нормоконтроль')) errors.push(`${prefix}: нет требования оформить отчёт под нормоконтроль.`)

  const expectedReport = `S${expectedSemester}_LR${String(expectedLocalNumber).padStart(2, '0')}_template.docx`
  if (lab.reportFile !== expectedReport) errors.push(`${prefix}: имя шаблона должно быть ${expectedReport}.`)
  const expectedStudentFile = `Фамилия_Группа_МДК0602_ЛР${String(lab.number).padStart(2, '0')}.docx`
  if (lab.recommendedFileName !== expectedStudentFile) errors.push(`${prefix}: неверное рекомендуемое имя файла.`)
  const reportPath = resolve(root, 'public/reports', expectedReport)
  if (!existsSync(reportPath)) errors.push(`${prefix}: отсутствует ${expectedReport}.`)
  else if (statSync(reportPath).size < 20_000) errors.push(`${prefix}: ${expectedReport} подозрительно мал.`)

  const serialized = JSON.stringify(lab)
  if (/\b(?:ОК|ПК)\s*\d/iu.test(serialized)) errors.push(`${prefix}: осталась подпись ОК/ПК.`)
  if (/Moodle/iu.test(serialized)) errors.push(`${prefix}: обозначение Moodle должно быть заменено на LMS.`)
  if ('course' in lab || 'rubric' in lab) errors.push(`${prefix}: опубликовано лишнее служебное поле.`)
}

const totalPoints = labs.reduce((sum, lab) => sum + Number(lab.points || 0), 0)
const allTaskActions = labs.flatMap((lab) => (lab.taskSteps ?? []).map((step) => normalize(step.action)))
if (new Set(allTaskActions).size !== allTaskActions.length) errors.push('Обязательные действия разных работ не должны повторяться дословно.')
if (totalPoints !== 100) errors.push(`Сумма баллов ${totalPoints}, ожидалось 100.`)
if (labs.filter((lab) => lab.semester === 7).length !== 7) errors.push('В 7 семестре должно быть 7 работ.')
if (labs.filter((lab) => lab.semester === 8).length !== 5) errors.push('В 8 семестре должно быть 5 работ.')
for (const semester of [7, 8]) {
  const semesterPoints = labs.filter((lab) => lab.semester === semester).reduce((sum, lab) => sum + lab.points, 0)
  if (semesterPoints !== 50) errors.push(`В ${semester} семестре ${semesterPoints} баллов, ожидалось 50.`)
}

if (!Array.isArray(subjectAreas) || subjectAreas.length !== 29) errors.push(`Ожидалось 29 предметных областей, найдено ${subjectAreas?.length ?? 0}.`)
if (!Array.isArray(profiles) || profiles.length !== 6) errors.push(`Ожидалось 6 групп вариантов, найдено ${profiles?.length ?? 0}.`)
if (new Set(subjectAreas?.map((area) => area.title)).size !== 29) errors.push('Названия 29 предметных областей должны быть уникальны.')
for (const profile of profiles ?? []) {
  if (profile.characteristics?.length !== 5) errors.push(`Группа ${profile.id}: ожидалось 5 характеристик.`)
  const areasInProfile = subjectAreas.filter((area) => area.profileId === profile.id)
  if (!areasInProfile.length) errors.push(`Группа ${profile.id}: нет ни одной предметной области.`)
  else {
    const padded = (value) => String(value).padStart(2, '0')
    const expectedRange = `${padded(areasInProfile[0].id)}–${padded(areasInProfile[areasInProfile.length - 1].id)}`
    if (profile.variantRange !== expectedRange) errors.push(`Группа ${profile.id}: диапазон вариантов должен быть ${expectedRange}.`)
  }
}
for (const area of subjectAreas ?? []) {
  const expectedCode = `SA${String(area.id).padStart(2, '0')}`
  if (area.code !== expectedCode) errors.push(`Вариант ${area.id}: ожидался код ${expectedCode}.`)
  if (area.systemCode !== `ITPSIS-${expectedCode}`) errors.push(`${expectedCode}: неверный системный код.`)
  const packPath = resolve(root, 'public', area.pack)
  if (!existsSync(packPath) || statSync(packPath).size < 10_000) errors.push(`${expectedCode}: нет полного ZIP-пакета.`)
  const labSources = resolve(root, 'inputs/subject-areas/sources', expectedCode, 'labs')
  const sourceCount = existsSync(labSources) ? readdirSync(labSources).filter((name) => /^S[78]_LR\d{2}\.md$/.test(name)).length : 0
  if (sourceCount !== 12) errors.push(`${expectedCode}: ожидалось 12 файлов исходных данных, найдено ${sourceCount}.`)
}
const packNames = existsSync(resolve(root, 'public/inputs/subject-areas/packs'))
  ? readdirSync(resolve(root, 'public/inputs/subject-areas/packs')).filter((name) => /^SA\d{2}\.zip$/.test(name))
  : []
if (packNames.length !== 29) errors.push(`Ожидалось 29 ZIP-пакетов, найдено ${packNames.length}.`)

for (const [semester, labCount] of [[7, 7], [8, 5]]) {
  const semesterRoot = resolve(root, `inputs/subject-areas/semester-${semester}`)
  for (let labNumber = 1; labNumber <= labCount; labNumber += 1) {
    const labDirectory = resolve(semesterRoot, `LR${String(labNumber).padStart(2, '0')}`)
    const variantFiles = existsSync(labDirectory)
      ? readdirSync(labDirectory).filter((name) => /^variant-\d{2}-SA\d{2}\.md$/.test(name))
      : []
    if (variantFiles.length !== 29) errors.push(`${semester} семестр, ЛР ${labNumber}: ожидалось 29 вариантов, найдено ${variantFiles.length}.`)
  }
}
for (const archiveName of ['semester-7-all.zip', 'semester-8-all.zip', 'all-semesters.zip']) {
  const archivePath = resolve(root, 'public/teacher-packs', archiveName)
  if (!existsSync(archivePath) || statSync(archivePath).size < 100_000) errors.push(`Нет полного преподавательского архива ${archiveName}.`)
}

const publicText = JSON.stringify({ labs, subjectAreas, profiles })
if (/\b(?:ОК|ПК)\s*\d/iu.test(publicText)) errors.push('В публичных данных остались подписи ОК/ПК.')

if (errors.length) {
  console.error(errors.map((message) => `- ${message}`).join('\n'))
  process.exit(1)
}
console.log(`OK: ${labs.length} методически структурированных последовательных работ, ${totalPoints} баллов, ${subjectAreas.length} предметных областей, ${packNames.length} ZIP-пакетов и 12 DOCX-шаблонов.`)
