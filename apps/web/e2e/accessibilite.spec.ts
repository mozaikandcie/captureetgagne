import { expect, test, type Page } from '@playwright/test'
import { PHONES } from './support/env'
import { TINY_JPEG, cleanOldTestEvents, clientFor, createTestEvent, deleteTestEvent } from './support/api'

let eventId = ''
let org: Awaited<ReturnType<typeof clientFor>>

test.beforeAll(async () => {
  org = await clientFor(PHONES.organizer)
  await cleanOldTestEvents(org)
  eventId = await createTestEvent(org, 'accessibilité')
  const path = `${eventId}/affiche-test.jpg`
  await org.storage.from('posters').upload(path, TINY_JPEG, { contentType: 'image/jpeg' })
  await org.from('events').update({
    poster_path: path, prizes: '50', place: 'Lormont',
    ends_at: new Date(Date.now() + 70 * 24 * 3600_000).toISOString(), // dans 70 jours
  }).eq('id', eventId)
})
test.afterAll(async () => {
  if (org && eventId) { await org.storage.from('posters').remove([`${eventId}/affiche-test.jpg`]); await deleteTestEvent(org, eventId) }
})

/** Le focus est-il à l'intérieur de la fenêtre de dialogue ? */
const focusInside = (page: Page, selector: string) => page.evaluate((sel) => !!document.activeElement?.closest(sel), selector)

async function checkDialog(page: Page, opener: ReturnType<Page['getByRole']>, dialogSelector: string) {
  await opener.focus()
  await opener.press('Enter')
  const dialog = page.locator(dialogSelector)
  await expect(dialog).toBeVisible()
  expect(await focusInside(page, dialogSelector), 'le focus entre dans la fenêtre').toBe(true)
  for (let i = 0; i < 12; i++) { await page.keyboard.press('Tab'); expect(await focusInside(page, dialogSelector), `Tab n°${i + 1} reste dans la fenêtre`).toBe(true) }
  for (let i = 0; i < 12; i++) { await page.keyboard.press('Shift+Tab'); expect(await focusInside(page, dialogSelector), `Maj+Tab n°${i + 1} reste dans la fenêtre`).toBe(true) }
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(opener, 'le focus retourne au bouton d’origine').toBeFocused()
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('cg-splash', '1'))
  await page.goto(`/e/${eventId}`)
  await expect(page.getByRole('heading', { name: /E2E · accessibilité/ })).toBeVisible()
})

test('la présentation en 3 étapes se parcourt au clavier', async ({ page }) => {
  await checkDialog(page, page.getByRole('button', { name: 'Revoir la présentation' }), '.ob-card')
})

test('l’agrandissement de l’affiche se parcourt au clavier', async ({ page }) => {
  await checkDialog(page, page.getByRole('button', { name: 'Agrandir' }), '.lb-in')
})

test('le décompte se lit en jours et le lot comme une somme', async ({ page }) => {
  const card = page.locator('.evt')
  await expect(card).toContainText(/Fin dans \d+ j \d{2} h/)
  await expect(card).not.toContainText(/\d{3,} h/) // plus de « 1680 h »
  await expect(card).toContainText('50 €')
  await expect(card).toContainText('Lormont')
})
