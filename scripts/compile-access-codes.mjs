// Сборка файла доступа из файла преподавателя.
// Читает config/access-codes.json (не публикуется) и пишет public/access-codes.json:
// в сборку попадают только SHA-256 хеши кодов.
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const { labs } = JSON.parse(await readFile(resolve(root, 'src/data/labs.json'), 'utf8'))
const normalize = (value) => String(value).trim().toUpperCase().replace(/[^0-9A-Z]/g, '')
const hash = (code) => createHash('sha256').update(normalize(code), 'utf8').digest('hex')

let source
try {
  source = JSON.parse(await readFile(resolve(root, 'config/access-codes.json'), 'utf8'))
} catch {
  console.log('ACCESS: config/access-codes.json не найден, работы открыты без кода.')
  process.exit(0)
}
if (!source || typeof source !== 'object' || !source.labs) throw Error('Некорректный config/access-codes.json')

const compiled = {}
let total = 0
const weak = []
for (const lab of labs) {
  const key = String(lab.number)
  const codes = Array.isArray(source.labs[key]) ? source.labs[key] : []
  const list = [...new Set(codes.map(normalize).filter(Boolean))]
  for (const code of list) if (code.length < 8) weak.push(`${key}: ${code}`)
  compiled[key] = list.map(hash)
  total += list.length
}
if (weak.length) throw Error('Код короче 8 символов, его можно подобрать: ' + weak.join(', '))

await writeFile(resolve(root, 'public/access-codes.json'), JSON.stringify({ schemaVersion: 1, courseId: '2026-ITPSIS-lab', labs: compiled }, null, 2) + '\n')
console.log(`ACCESS: ${total} кодов для ${Object.values(compiled).filter((list) => list.length).length} работ из ${labs.length}; в сборку попадают только SHA-256 хеши.`)
