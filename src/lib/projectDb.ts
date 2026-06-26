import type { SaveProjectArgs } from './projectApi'

export type StoredProject = {
  id: string
  createdAt: number
  interpretation: string
  prompt: string
  originalBlob: Blob
  generatedBlob: Blob
  thumbOriginal: string
  thumbGenerated: string
}

const DB_NAME = 'panarama-db'
const DB_VERSION = 1
const STORE = 'projects'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('createdAt', 'createdAt')
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function makeThumbnail(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      const size = 64
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(url)
        reject(new Error('Canvas unavailable'))
        return
      }
      ctx.drawImage(img, 0, 0, size, size)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.6))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read image for thumbnail'))
    }
    img.src = url
  })
}

export async function dbSaveProject(args: SaveProjectArgs): Promise<string> {
  const id = crypto.randomUUID()
  const [thumbOriginal, thumbGenerated] = await Promise.all([
    makeThumbnail(args.original),
    makeThumbnail(args.generated),
  ])
  const record: StoredProject = {
    id,
    createdAt: Date.now(),
    interpretation: args.interpretation,
    prompt: args.prompt,
    originalBlob: args.original,
    generatedBlob: args.generated,
    thumbOriginal,
    thumbGenerated,
  }
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(record)
    tx.oncomplete = () => {
      db.close()
      resolve(id)
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

export async function dbListProjects(): Promise<StoredProject[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).index('createdAt').openCursor(null, 'prev')
    const results: StoredProject[] = []
    req.onsuccess = () => {
      const cursor = req.result
      if (cursor) {
        results.push(cursor.value as StoredProject)
        cursor.continue()
      } else {
        db.close()
        resolve(results)
      }
    }
    req.onerror = () => {
      db.close()
      reject(req.error)
    }
  })
}

export async function dbDeleteProject(id: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}
