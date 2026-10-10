import { describe, expect, it } from 'vitest'
import { summarizeQueue } from './summary'

const it_ = (status: 'queued' | 'uploading' | 'error', progress = 0, stalled = false) => ({ status, progress, stalled })

describe('summarizeQueue', () => {
  it('est au repos quand la file est vide', () => {
    expect(summarizeQueue([])).toMatchObject({ state: 'idle', waiting: 0, uploading: 0, failed: 0 })
  })
  it('signale les fichiers en attente de réseau', () => {
    expect(summarizeQueue([it_('queued'), it_('queued')])).toMatchObject({ state: 'waiting', waiting: 2 })
  })
  it('donne l’avancement moyen des envois en cours', () => {
    expect(summarizeQueue([it_('uploading', 0.2), it_('uploading', 0.6), it_('queued')])).toMatchObject({ state: 'uploading', uploading: 2, waiting: 1, percent: 40 })
  })
  it('signale un envoi qui n’avance plus (réseau instable)', () => {
    expect(summarizeQueue([it_('uploading', 0.3, true), it_('uploading', 0.5)])).toMatchObject({ state: 'stalled', stalled: 1, uploading: 2 })
  })
  it('met l’échec en premier, car il demande une action', () => {
    expect(summarizeQueue([it_('uploading', 0.5), it_('error'), it_('queued')])).toMatchObject({ state: 'failed', failed: 1, uploading: 1, waiting: 1 })
  })
})
