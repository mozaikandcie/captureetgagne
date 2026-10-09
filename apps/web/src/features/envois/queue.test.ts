import { describe, expect, it } from 'vitest'
import { isNetworkError, isNetworkMessage, NetworkError } from './queue'

describe('isNetworkError', () => {
  it('reconnaît une coupure TUS (requête partie, pas de réponse)', () => {
    expect(isNetworkError(Object.assign(new Error('tus: failed to upload chunk'), { originalRequest: {}, originalResponse: null }))).toBe(true)
  })
  it('ne traite pas un refus du serveur comme une coupure', () => {
    const res = { getStatus: () => 413 }
    expect(isNetworkError(Object.assign(new Error('tus: unexpected response'), { originalRequest: {}, originalResponse: res }))).toBe(false)
  })
  it('reconnaît NetworkError et ignore les autres erreurs', () => {
    expect(isNetworkError(new NetworkError('x'))).toBe(true)
    expect(isNetworkError(new Error('authRequired'))).toBe(false)
    expect(isNetworkError(null)).toBe(false)
  })
})

describe('isNetworkMessage', () => {
  it('distingue une coupure d’une erreur de base de données', () => {
    expect(isNetworkMessage({ message: 'TypeError: Failed to fetch' })).toBe(true)
    expect(isNetworkMessage({ message: 'Load failed' })).toBe(true)
    expect(isNetworkMessage({ message: '2 envois maximum par défi', code: 'P0001' })).toBe(false)
  })
})
