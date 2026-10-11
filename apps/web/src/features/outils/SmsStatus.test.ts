import { describe, expect, it } from 'vitest'
import { smsLevel } from './SmsStatus'

describe('smsLevel', () => {
  it('inconnu quand Brevo ne répond pas', () => expect(smsLevel(null)).toBe('unknown'))
  it('critique sous 50', () => { expect(smsLevel(0)).toBe('critical'); expect(smsLevel(49)).toBe('critical') })
  it('bas entre 50 et 299', () => { expect(smsLevel(50)).toBe('low'); expect(smsLevel(299)).toBe('low') })
  it('suffisant à partir de 300', () => expect(smsLevel(300)).toBe('ok'))
})
