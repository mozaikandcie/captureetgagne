import { describe, expect, it } from 'vitest'
import fr from './fr.json'
import gp from './gp.json'
import mq from './mq.json'
import gf from './gf.json'
import re from './re.json'
import ht from './ht.json'
import { translate } from './index'

describe('pluriel', () => {
  it('utilise le singulier pour 0 et 1, le pluriel au-delà', () => {
    expect(translate('fr', 'toModerate', { n: 1 })).toBe('1 contenu à modérer')
    expect(translate('fr', 'toModerate', { n: 0 })).toBe('0 contenu à modérer')
    expect(translate('fr', 'toModerate', { n: 3 })).toBe('3 contenus à modérer')
  })
  it('accorde « 1re » pour le premier rang', () => {
    expect(translate('fr', 'nRang', { rank: 1, total: 4, score: 48, count: 1 })).toBe('Tu es 1re sur 4 avec 48 points.')
    expect(translate('fr', 'nRang', { rank: 2, total: 4, score: 40, count: 2 })).toBe('Tu es 2e sur 4 avec 40 points.')
  })
  it('une langue sans singulier garde sa traduction de base, jamais la phrase française', () => {
    expect(translate('gp', 'go', { n: 1 })).not.toBe(translate('fr', 'go'))
  })
})

describe('i18n', () => {
  it('remplace les variables', () => {
    expect(translate('fr', 'codeSent', { phone: '06' })).toBe('Code envoyé au 06')
  })
  it('retombe sur le français quand la traduction manque', () => {
    expect(translate('gp', 'codeSent', { phone: '06' })).toBe('Code envoyé au 06')
  })
  it('retombe sur la clé si elle est inconnue', () => {
    expect(translate('fr', 'nope')).toBe('nope')
  })
  it('chaque langue ne définit que des clés connues du français', () => {
    for (const d of [gp, mq, gf, re, ht]) {
      for (const k of Object.keys(d)) expect(Object.keys(fr)).toContain(k)
    }
  })
})
