import { describe, expect, it } from 'vitest'
import { checkVideo, fitWithin, mvhdDuration, readMp4Duration } from './media'

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
  it('accepte 30 s et 50 Mo', () => {
    expect(checkVideo(30, 50 * 1024 * 1024)).toBeNull()
  })
  it('refuse au-delà de 30 s', () => {
    expect(checkVideo(30.5, 1000)).toBe('videoTooLong')
  })
  it('refuse au-delà de 50 Mo', () => {
    expect(checkVideo(10, 50 * 1024 * 1024 + 1)).toBe('videoTooBig')
  })
  it('refuse une durée illisible', () => {
    expect(checkVideo(NaN, 1000)).toBe('videoUnreadable')
    expect(checkVideo(Infinity, 1000)).toBe('videoUnreadable')
  })
})

// --- MP4 synthétique : boîtes size(4) + type(4) + contenu ---
const box = (type: string, payload: Uint8Array = new Uint8Array()) => {
  const out = new Uint8Array(8 + payload.length)
  new DataView(out.buffer).setUint32(0, out.length)
  out.set([...type].map((c) => c.charCodeAt(0)), 4)
  out.set(payload, 8)
  return out
}
const cat = (...parts: Uint8Array[]) => Uint8Array.from(parts.flatMap((p) => [...p]))
const mvhd = (version: 0 | 1, timescale: number, duration: number) => {
  const body = new Uint8Array(version === 1 ? 32 : 20)
  const v = new DataView(body.buffer)
  body[0] = version
  if (version === 1) { v.setUint32(20, timescale); v.setBigUint64(24, BigInt(duration)) }
  else { v.setUint32(12, timescale); v.setUint32(16, duration) }
  return box('mvhd', body)
}

describe('mvhdDuration', () => {
  it('lit la durée (version 0)', () => {
    expect(mvhdDuration(mvhd(0, 1000, 12500).buffer as ArrayBuffer)).toBe(12.5)
  })
  it('lit la durée (version 1, 64 bits)', () => {
    expect(mvhdDuration(mvhd(1, 600, 18000).buffer as ArrayBuffer)).toBe(30)
  })
  it('renvoie null sans mvhd ou avec une échelle de temps nulle', () => {
    expect(mvhdDuration(box('trak').buffer as ArrayBuffer)).toBeNull()
    expect(mvhdDuration(mvhd(0, 0, 100).buffer as ArrayBuffer)).toBeNull()
  })
})

describe('readMp4Duration', () => {
  const ftyp = box('ftyp', new Uint8Array(8))
  const mdat = box('mdat', new Uint8Array(5000))
  const moov = box('moov', mvhd(0, 1000, 7000))
  it('trouve le moov au début du fichier (iPhone)', async () => {
    expect(await readMp4Duration(new Blob([cat(ftyp, moov, mdat)]))).toBe(7)
  })
  it('trouve le moov après le mdat (Android)', async () => {
    expect(await readMp4Duration(new Blob([cat(ftyp, mdat, moov)]))).toBe(7)
  })
  it('renvoie NaN pour un fichier qui n’est pas un MP4', async () => {
    expect(await readMp4Duration(new Blob([new Uint8Array(100).fill(1)]))).toBeNaN()
    expect(await readMp4Duration(new Blob([]))).toBeNaN()
  })
})
