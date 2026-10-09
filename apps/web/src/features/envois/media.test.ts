import { describe, expect, it } from 'vitest'
import { checkVideo, fitWithin } from './media'

describe('fitWithin', () => {
  it('réduit le plus grand côté à 2048 px', () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 2048, height: 1536 })
    expect(fitWithin(3000, 4000)).toEqual({ width: 1536, height: 2048 })
  })
  it("n'agrandit jamais", () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 })
  })
})

describe('checkVideo', () => {
  it('accepte 30 s et 200 Mo', () => {
    expect(checkVideo(30, 200 * 1024 * 1024)).toBeNull()
  })
  it('refuse au-delà de 30 s', () => {
    expect(checkVideo(30.5, 1000)).toBe('videoTooLong')
  })
  it('refuse au-delà de 200 Mo', () => {
    expect(checkVideo(10, 200 * 1024 * 1024 + 1)).toBe('videoTooBig')
  })
  it('refuse une durée illisible', () => {
    expect(checkVideo(NaN, 1000)).toBe('videoUnreadable')
    expect(checkVideo(Infinity, 1000)).toBe('videoUnreadable')
  })
})
