import { expect, test, type Browser, type Page } from '@playwright/test'
import { PHONES } from './support/env'
import { browserSession, cleanOldTestEvents, clientFor, createTestEvent, deleteTestEvent, registerParticipant, TINY_JPEG } from './support/api'

// Un contenu fait tout le trajet : envoi par le participant, validation et notation par les jurés, classement chez l'organisateur.
test.describe.configure({ mode: 'serial' })

let eventId = ''
let org: Awaited<ReturnType<typeof clientFor>>

async function openAs(browser: Browser, phone: string, path: string): Promise<Page> {
  const { key, value } = await browserSession(phone)
  const context = await browser.newContext({ locale: 'fr-FR', viewport: { width: 1000, height: 900 } })
  await context.addInitScript(([k, v]) => {
    localStorage.setItem(k, v); localStorage.setItem('cg-onboarded', '1'); sessionStorage.setItem('cg-splash', '1')
  }, [key, value])
  const page = await context.newPage()
  await page.goto(path)
  return page
}

test.beforeAll(async () => {
  org = await clientFor(PHONES.organizer)
  await cleanOldTestEvents(org)
  eventId = await createTestEvent(org, 'parcours complet')
  await registerParticipant(await clientFor(PHONES.participantA), eventId, 'Testeuse Parcours')
})
test.afterAll(async () => { if (org && eventId) await deleteTestEvent(org, eventId) })

test('1. le participant envoie une photo et la voit « à modérer »', async ({ browser }) => {
  const page = await openAs(browser, PHONES.participantA, `/e/${eventId}/defis`)
  await expect(page.getByRole('heading', { name: 'Les défis' })).toBeVisible()
  await page.locator('.defi').first().locator('input[type=file]').setInputFiles({ name: 'photo.jpg', mimeType: 'image/jpeg', buffer: TINY_JPEG })
  await expect(page.locator('.tray')).toContainText('Envoyé', { timeout: 60_000 })
  await expect(page.locator('.defi').first()).toContainText('1 sur 2 envoyés')
  const mine = await (await clientFor(PHONES.participantA)).from('entries').select('status').eq('event_id', eventId)
  expect(mine.data).toEqual([{ status: 'pending' }])
  await page.context().close()
})

test('2. un juré valide le contenu puis le note', async ({ browser }) => {
  const page = await openAs(browser, PHONES.juror1, `/jury/${eventId}`)
  const card = page.locator('.grid .card').first()
  await expect(card).toContainText('À modérer', { timeout: 30_000 })
  await card.getByRole('button', { name: 'Valider' }).click()
  await expect(page.locator('.toast')).toContainText('validé')
  await expect(card).toContainText('Validé')
  await card.getByLabel('Respect du défi').fill('9')
  await card.getByLabel('Qualité, cadrage').fill('8')
  await card.getByLabel('Originalité').fill('7')
  await card.getByPlaceholder('Commentaire pour le participant').fill('Joli cadrage !')
  await card.getByRole('button', { name: 'Enregistrer ma note' }).click()
  await expect(page.locator('.toast')).toContainText('Note enregistrée')
  await expect(card.getByRole('button', { name: 'Modifier ma note' })).toBeVisible({ timeout: 15_000 })
  await page.context().close()
})

test('3. le second juré note par l’API, le classement devient définitif chez l’organisateur', async ({ browser }) => {
  const j2 = await clientFor(PHONES.juror2)
  const entry = (await org.from('entries').select('id').eq('event_id', eventId).single()).data!.id
  const me = (await j2.auth.getUser()).data.user!.id
  expect((await j2.from('scores').upsert({ entry_id: entry, juror_id: me, respect: 5, quality: 5, originality: 5 })).error).toBeNull()

  const page = await openAs(browser, PHONES.organizer, `/organisation/${eventId}`)
  await page.getByRole('tab', { name: 'Classement' }).click()
  await expect(page.getByText('Classement définitif')).toBeVisible({ timeout: 30_000 })
  const row = page.getByRole('row', { name: /Testeuse Parcours/ })
  await expect(row).toBeVisible()
  // Moyenne des deux jurés : (8 + 5) / 2 = 6,5 ; score = 30 × 1/5 + 70 × 0,65 = 51,5.
  await expect(row).toContainText('6,5')
  await expect(row).toContainText('51,5')
  await page.context().close()
})

test('4. le participant voit sa validation, la note du jury, le commentaire et son premier badge', async ({ browser }) => {
  const page = await openAs(browser, PHONES.participantA, `/e/${eventId}/moi`)
  const mine = page.locator('.mine li').first()
  await expect(mine).toContainText('Validé', { timeout: 30_000 })
  await expect(mine).toContainText('6,5/10')
  await expect(mine).toContainText('Joli cadrage !')
  await expect(page.locator('.badge2:not(.off)', { hasText: 'Premier envoi' })).toBeVisible()
  await page.context().close()
})
