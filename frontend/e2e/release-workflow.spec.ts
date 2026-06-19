import { expect, test } from 'playwright/test'

test('demo release workflow exposes compliance, episode, billing, and survey readiness', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Patients' }).click()
  await expect(page.getByText('Patient Compliance Packet')).toBeVisible()
  await expect(page.getByText('Medication and Allergy Profile')).toBeVisible()

  await page.getByRole('button', { name: 'Episodes' }).click()
  await page.getByRole('button', { name: 'Review' }).click()
  await expect(page.getByText('Orders, Aide Supervision, and Event Controls')).toBeVisible()
  await expect(page.getByText('Payer Controls, Supplies, and Case Conference')).toBeVisible()

  await page.getByRole('button', { name: 'Billing' }).click()
  await expect(page.getByText('EDI and Remittance Ledger')).toBeVisible()

  await page.getByRole('button', { name: 'Admin' }).click()
  await expect(page.getByText('Survey Readiness Dashboard')).toBeVisible()
})
