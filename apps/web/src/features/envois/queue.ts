// File d'attente d'envois : stockée dans IndexedDB (survit au rechargement), envoi TUS reprenable,
// reprise automatique au retour du réseau. Une erreur reste visible tant qu'elle n'est pas traitée.
import * as tus from 'tus-js-client'
import { supabase } from '../../lib/supabase'

export type QueueStatus = 'queued' | 'uploading' | 'error'

export interface QueueItem {
  id: string // = entries.id
  eventId: string
  participantId: string
  challengeId: string
  kind: 'photo' | 'video'
  path: string // event_id/participant_id/entry_id.ext
  contentType: string
  blob: Blob
  status: QueueStatus
  progress: number // 0..1
  error?: string // clé de traduction
}

const DB_NAME = 'cg-queue'
const STORE = 'items'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const req = run(db.transaction(STORE, mode).objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

const putItem = (item: QueueItem) => tx('readwrite', (s) => s.put(item))
const deleteItem = (id: string) => tx('readwrite', (s) => s.delete(id))
const allItems = () => tx<QueueItem[]>('readonly', (s) => s.getAll())

// ---- état observable (useSyncExternalStore) ----
let items: QueueItem[] = []
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
export const getSnapshot = () => items

function update(id: string, patch: Partial<QueueItem>) {
  items = items.map((i) => (i.id === id ? { ...i, ...patch } : i))
  emit()
  const item = items.find((i) => i.id === id)
  // La progression n'est pas persistée à chaque octet.
  if (item && patch.progress === undefined) void putItem(item)
}

// ---- envoi ----
let running = false

async function uploadBlob(item: QueueItem): Promise<void> {
  const { data } = await supabase.auth.getSession()
  if (!data.session) throw new Error('authRequired')
  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(item.blob, {
      endpoint: `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: { 'x-upsert': 'true' },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: 6 * 1024 * 1024,
      metadata: {
        bucketName: 'media',
        objectName: item.path,
        contentType: item.contentType,
        cacheControl: '3600',
      },
      // Jeton relu à chaque requête : il peut être renouvelé pendant un long envoi.
      onBeforeRequest: async (req) => {
        const { data } = await supabase.auth.getSession()
        req.setHeader('Authorization', `Bearer ${data.session?.access_token ?? ''}`)
        req.setHeader('apikey', import.meta.env.VITE_SUPABASE_ANON_KEY)
      },
      onProgress: (sent, total) => update(item.id, { progress: sent / total }),
      onError: reject,
      onSuccess: () => resolve(),
    })
    void upload.findPreviousUploads().then((prev) => {
      if (prev.length) upload.resumeFromPreviousUpload(prev[0])
      upload.start()
    })
  })
}

async function process(item: QueueItem): Promise<void> {
  update(item.id, { status: 'uploading', error: undefined, progress: 0 })
  try {
    await uploadBlob(item)
    const { error } = await supabase.from('entries').insert({
      id: item.id,
      event_id: item.eventId,
      challenge_id: item.challengeId,
      participant_id: item.participantId,
      kind: item.kind,
      storage_path: item.path,
    })
    if (error) {
      // Refus par le serveur (2 envois max, concours terminé) : le fichier orphelin est supprimé.
      await supabase.storage.from('media').remove([item.path])
      throw new Error(error.message.includes('maximum') ? 'limitReached' : error.message.includes('fermés') ? 'closed' : 'uploadFailed')
    }
    await deleteItem(item.id)
    items = items.filter((i) => i.id !== item.id)
    emit()
    window.dispatchEvent(new Event('cg-entry-sent'))
  } catch (e) {
    const key = e instanceof Error && ['limitReached', 'closed', 'authRequired'].includes(e.message) ? e.message : 'uploadFailed'
    update(item.id, { status: 'error', error: key })
  }
}

/** Traite les éléments en attente, un par un. Sans effet si une exécution est déjà en cours. */
export async function run(): Promise<void> {
  if (running || !navigator.onLine) return
  running = true
  try {
    for (const item of items.filter((i) => i.status !== 'error')) await process(item)
  } finally {
    running = false
  }
}

export async function enqueue(item: Omit<QueueItem, 'status' | 'progress'>): Promise<void> {
  const full: QueueItem = { ...item, status: 'queued', progress: 0 }
  await putItem(full) // si l'écriture échoue, l'appelant le voit : jamais d'échec silencieux
  items = [...items, full]
  emit()
  void run()
}

export function retry(id: string): void {
  update(id, { status: 'queued', error: undefined })
  void run()
}

export async function discard(id: string): Promise<void> {
  await deleteItem(id)
  items = items.filter((i) => i.id !== id)
  emit()
}

/** À appeler une fois au démarrage : recharge la file et branche la reprise au retour du réseau. */
export async function initQueue(): Promise<void> {
  const saved = await allItems()
  // Un envoi interrompu par la fermeture de l'app repart de zéro dans la file (TUS reprend le fichier).
  items = saved.map((i) => (i.status === 'uploading' ? { ...i, status: 'queued' as const } : i))
  emit()
  window.addEventListener('online', () => void run())
  void run()
}
