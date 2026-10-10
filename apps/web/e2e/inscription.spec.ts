import { expect, test } from '@playwright/test'
import { OTP, PHONES, nationalFormat } from './support/env'
import { cleanOldTestEvents, clientFor, createTestEvent, deleteTestEvent } from './support/api'

let eventId = ''
let org: Awaited<ReturnType<typeof clientFor>>

test.beforeAll(async () => {
  org = await clientFor(PHONES.organizer)
  await cleanOldTestEvents(org)
  eventId = await createTestEvent(org, 'inscription')
})
test.afterAll(async () => { if (org && eventId) await deleteTestEvent(org, eventId) })

test('un visiteur voit l’événement, s’inscrit par SMS puis arrive sur son accueil', async ({ page }) => {
  // Appareil neuf : l'écran d'ouverture passe, mais la présentation en 3 étapes ne doit pas masquer l'inscription.
  await page.addInitScript(() => sessionStorage.setItem('cg-splash', '1'))
  await page.goto(`/e/${eventId}`)

  await expect(page.getByRole('heading', { name: /E2E · inscription/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Rejoindre le concours' })).toBeVisible()
  await expect(page.getByText('Règlement du concours')).toBeVisible()
  await expect(page.locator('.ob')).toHaveCount(0)

  // Numéro invalide : expliqué, sans appel au serveur.
  await page.getByLabel('Numéro de téléphone mobile').fill('12345')
  await page.getByRole('button', { name: 'Recevoir mon code' }).click()
  await expect(page.getByRole('alert')).toContainText('Numéro invalide')

  // Vrai envoi du code (numéro de test, code fixe), validé automatiquement à 6 chiffres.
  await page.getByLabel('Numéro de téléphone mobile').fill(nationalFormat(PHONES.participantB))
  for (let attempt = 0; attempt < 8; attempt++) {
    await page.getByRole('button', { name: /Recevoir mon code|Renvoyer/ }).click()
    const code = page.getByLabel('Code reçu par SMS')
    if (await code.isVisible({ timeout: 8000 }).catch(() => false)) break
    await page.waitForTimeout(15_000) // limite : 1 code par minute et par numéro
  }
  await page.getByLabel('Code reçu par SMS').fill(OTP)

  // Première connexion : nom et deux consentements obligatoires.
  await expect(page.getByLabel('Prénom et nom')).toBeVisible()
  await page.getByRole('button', { name: 'Commencer les défis' }).click()
  await expect(page.getByRole('alert')).toContainText('prénom et ton nom')
  await page.getByLabel('Prénom et nom').fill('Test Inscription')
  await page.getByRole('button', { name: 'Commencer les défis' }).click()
  await expect(page.getByRole('alert')).toContainText('Les deux cases')
  await page.getByRole('checkbox').nth(0).check()
  await page.getByRole('checkbox').nth(1).check()
  await page.getByRole('button', { name: 'Commencer les défis' }).click()

  // Accueil du participant, puis présentation en 3 étapes (une seule fois).
  await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('heading', { name: /Bonjour Test/ })).toBeVisible()

  // Les consentements sont horodatés côté serveur.
  const b = await clientFor(PHONES.participantB)
  const row = await b.from('participants').select('display_name, consent_rules_at, consent_image_at').eq('event_id', eventId).single()
  expect(row.data?.display_name).toBe('Test Inscription')
  expect(row.data?.consent_rules_at).toBeTruthy()
  expect(row.data?.consent_image_at).toBeTruthy()
})
