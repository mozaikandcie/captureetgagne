import { describe, expect, it } from 'vitest'
import { eventLink, isLocalAddress, publicBase } from './publicUrl'

describe('isLocalAddress', () => {
  it('reconnaît les adresses de test inutilisables sur un autre téléphone', () => {
    for (const u of ['http://localhost:5173/e/1', 'http://127.0.0.1:5173', 'http://192.168.0.26:5173', 'http://10.0.0.4', 'http://172.20.1.1', 'http://mon-mac.local:5173']) {
      expect(isLocalAddress(u), u).toBe(true)
    }
  })
  it('accepte une adresse publique', () => {
    for (const u of ['https://capture.vercel.app', 'https://capture.ambyans.fr/e/1', 'http://172.15.0.1', 'http://172.32.0.1']) {
      expect(isLocalAddress(u), u).toBe(false)
    }
  })
  it('refuse une adresse illisible', () => {
    expect(isLocalAddress('pas une adresse')).toBe(true)
  })
})

describe('publicBase', () => {
  it('préfère l’adresse publique configurée à celle de la page', () => {
    expect(publicBase('http://localhost:5173', 'https://capture.vercel.app/')).toBe('https://capture.vercel.app')
  })
  it('retombe sur l’adresse de la page sans configuration', () => {
    expect(publicBase('https://site.fr', '')).toBe('https://site.fr')
  })
  it('construit le lien d’inscription', () => {
    expect(eventLink('abc', 'https://site.fr')).toBe('https://site.fr/e/abc')
  })
})
