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
  detail?: string // détail technique (statut HTTP, message), pour comprendre un échec
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

/** Échec réseau (aucune réponse du serveur) : l'envoi doit attendre le retour du réseau, pas échouer. */
export class NetworkError extends Error {}

export function isNetworkError(e: unknown): boolean {
  if (e instanceof NetworkError) return true
  // Erreur TUS : la requête est partie mais aucune réponse n'est revenue (coupure, 4G perdue, délai).
  return typeof e === 'object' && e !== null && 'originalRequest' in e && !(e as { originalResponse?: unknown }).originalResponse
}

/** `fetch` de supabase-js échoue sans code d'erreur de base quand le réseau tombe. */
export function isNetworkMessage(error: { message: string; code?: string }): boolean {
  return !error.code && /fetch|network|load failed/i.test(error.message)
}

/** Résumé court d'une erreur d'envoi : statut HTTP et corps de la réponse pour TUS, message sinon. */
function describe(e: unknown): string {
  const tusError = e as { originalResponse?: { getStatus(): number; getBody(): string } | null; message?: string }
  const res = tusError.originalResponse
  if (res) return `HTTP ${res.getStatus()} ${res.getBody().slice(0, 160)}`
  return (e instanceof Error ? e.message : String(e)).slice(0, 200)
}

// ---- envoi ----
let running = false
let retryTimer: ReturnType<typeof setTimeout> | undefined

/** Nouvelle tentative différée : couvre le cas « le navigateur se croit en ligne mais le réseau est mort ». */
function scheduleRetry(delayMs = 15000) {
  if (retryTimer) return
  retryTimer = setTimeout(() => {
    retryTimer = undefined
    void run()
  }, delayMs)
}

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
    if (error && isNetworkMessage(error)) throw new NetworkError(error.message) // fichier conservé côté serveur
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
    if (isNetworkError(e)) {
      // Pas de réseau : on reste dans la file, visible « en attente de réseau », et on réessaie seul.
      update(item.id, { status: 'queued', error: undefined, detail: undefined, progress: 0 })
      scheduleRetry()
      return
    }
    console.error('Envoi échoué', e)
    const key = e instanceof Error && ['limitReached', 'closed', 'authRequired'].includes(e.message) ? e.message : 'uploadFailed'
    update(item.id, { status: 'error', error: key, detail: describe(e) })
  }
}

/**
 * Traite les éléments en attente, un par un. Sans effet si une exécution est déjà en cours.
 * Tant qu'un élément attend le réseau, une nouvelle tentative est programmée : on ne dépend pas
 * du seul événement « online », qui peut arriver avant que le navigateur se juge de nouveau connecté.
 */
export async function run(): Promise<void> {
  if (running) return
  const waiting = () => items.some((i) => i.status === 'queued')
  if (!navigator.onLine) {
    if (waiting()) scheduleRetry(5000)
    return
  }
  running = true
  try {
    for (const item of items.filter((i) => i.status !== 'error')) await process(item)
  } finally {
    running = false
  }
  if (waiting()) scheduleRetry()
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
