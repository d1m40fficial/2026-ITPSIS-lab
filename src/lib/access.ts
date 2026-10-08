import { useEffect, useState } from 'react'
import { labKey } from './labId'

export { labCode, labKey } from './labId'

export interface AccessFile {
  schemaVersion: number
  courseId: string
  labs: Record<string, string[]>
}

const WEEK = 7 * 24 * 60 * 60 * 1000
const storeKey = 'itpsis-lab-access:' + import.meta.env.BASE_URL
let file: AccessFile | undefined
let loaded = false

const normalize = (value: string) => value.trim().toUpperCase().replace(/[^0-9A-Z]/g, '')

const sha256 = async (value: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

const readStore = (): Record<string, number> => {
  try {
    return JSON.parse(localStorage.getItem(storeKey) || '{}') as Record<string, number>
  } catch {
    return {}
  }
}

const prune = (store: Record<string, number>) => {
  const now = Date.now()
  for (const [key, expiresAt] of Object.entries(store)) if (expiresAt <= now) delete store[key]
  return store
}

export async function loadAccess(): Promise<AccessFile | undefined> {
  if (loaded) return file
  loaded = true
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}access-codes.json`, { cache: 'no-cache' })
    if (!response.ok) throw new Error(String(response.status))
    file = (await response.json()) as AccessFile
  } catch {
    file = undefined
  }
  return file
}

export function useAccessFile() {
  const [access, setAccess] = useState<AccessFile | undefined>()
  useEffect(() => {
    let alive = true
    void loadAccess().then((value) => {
      if (alive) setAccess(value)
    })
    return () => {
      alive = false
    }
  }, [])
  return access
}

export function isUnlocked(key: string) {
  const store = prune(readStore())
  localStorage.setItem(storeKey, JSON.stringify(store))
  return (store[key] ?? 0) > Date.now()
}

export function unlock(key: string) {
  const store = prune(readStore())
  store[key] = Date.now() + WEEK
  localStorage.setItem(storeKey, JSON.stringify(store))
}

export function needsCode(access: AccessFile | undefined, number: number) {
  return Boolean(access?.labs?.[labKey(number)]?.length) && !isUnlocked(labKey(number))
}

export async function tryCode(number: number, code: string) {
  const access = await loadAccess()
  const hashes = access?.labs?.[labKey(number)]
  if (!hashes?.length) return true
  return hashes.includes(await sha256(normalize(code)))
}
