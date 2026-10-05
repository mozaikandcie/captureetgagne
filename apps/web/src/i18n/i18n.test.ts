import { describe, expect, it } from 'vitest'
import fr from './fr.json'
import gp from './gp.json'
import mq from './mq.json'
import gf from './gf.json'
import re from './re.json'
import ht from './ht.json'
import { translate } from './index'

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
