import { describe, expect, it } from 'vitest'
import { avatarColor, initials } from './avatar'

describe('initials', () => {
  it('prend la première lettre du prénom et du dernier nom', () => {
    expect(initials('Maëlys Joseph')).toBe('MJ')
    expect(initials('Jean-Michel Ako')).toBe('JA')
    expect(initials('Anne Marie Dupont')).toBe('AD')
  })
  it('gère un seul mot, les espaces et le vide', () => {
    expect(initials('didier')).toBe('D')
    expect(initials('  éric  ')).toBe('É')
    expect(initials('')).toBe('?')
  })
})

describe('avatarColor', () => {
  it('est stable pour un même nom', () => {
    expect(avatarColor('Alex')).toBe(avatarColor('Alex'))
  })
  it('renvoie une couleur de la palette', () => {
    expect(avatarColor('Nadège R.')).toMatch(/^#[0-9a-f]{6}$/)
  })
})
