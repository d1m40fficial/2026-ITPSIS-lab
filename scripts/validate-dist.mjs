import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const dist = resolve(root, 'dist')
const errors = []
for (const relative of ['index.html', 'brand/synergy-logo.png', 'brand/itpsis-rhino.webp', 'fonts/raleway-cyrillic.woff2']) {
  const path = resolve(dist, relative)
  if (!existsSync(path) || statSync(path).size === 0) errors.push(`Нет собранного файла: ${relative}`)
}
const reports = resolve(dist, 'reports')
const reportFiles = existsSync(reports) ? readdirSync(reports).filter((name) => /^S[78]_LR\d{2}_template\.docx$/.test(name)) : []
if (reportFiles.length !== 12) errors.push(`В dist/reports найдено ${reportFiles.length} DOCX вместо 12.`)
const subjectPacks = resolve(dist, 'inputs/subject-areas/packs')
const subjectPackFiles = existsSync(subjectPacks) ? readdirSync(subjectPacks).filter((name) => /^SA\d{2}\.zip$/.test(name)) : []
if (subjectPackFiles.length !== 30) errors.push(`В dist найдено ${subjectPackFiles.length} ZIP-пакетов вместо 30.`)
const html = existsSync(resolve(dist, 'index.html')) ? readFileSync(resolve(dist, 'index.html'), 'utf8') : ''
for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  const link = match[1]
  if (/^(?:https?:|#|data:)/.test(link)) continue
  const relative = link.replace(/^\/2026-ITPSIS-lab\//, '').replace(/^\.\//, '')
  if (relative && !existsSync(resolve(dist, relative))) errors.push(`Битая ссылка в index.html: ${link}`)
}
if (errors.length) {
  console.error(errors.map((item) => `- ${item}`).join('\n'))
  process.exit(1)
}
console.log('OK: собранный сайт содержит все обязательные ресурсы, 12 шаблонов и 30 ZIP-пакетов.')
