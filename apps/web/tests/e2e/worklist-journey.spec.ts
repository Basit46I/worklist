import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'

const email = process.env.WORKLIST_E2E_EMAIL
const password = process.env.WORKLIST_E2E_PASSWORD

test('member can sign in, create, search, delete a task, and sign out', async ({ page }) => {
    test.skip(!email || !password, 'Set WORKLIST_E2E_EMAIL and WORKLIST_E2E_PASSWORD to a verified editor or owner account.')

    const title = `Browser journey ${randomUUID()}`
    await page.goto('/sign-in')
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
    await page.getByLabel('Email address').fill(email ?? '')
    await page.getByLabel('Password', { exact: true }).fill(password ?? '')
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page).toHaveURL(/\/dashboard\/?$/)
    await expect(page.getByLabel('Dashboard scope')).toBeVisible()
    await expect(page.getByText('What is open, what is slipping, and who has capacity — across your lists.')).toBeVisible()
    await page.getByRole('link', { name: 'Worklist', exact: true }).click()
    await expect(page).toHaveURL(/\/worklist\/?$/)

    const listSelector = page.getByRole('combobox', { name: 'Choose list' })
    await expect(listSelector).not.toHaveValue('')

    await page.getByRole('button', { name: 'New task' }).click()
    await page.getByLabel('Task title').fill(title)
    await page.getByRole('button', { name: 'Create task' }).click()

    const taskRow = page.getByRole('row').filter({ hasText: title })
    await expect(taskRow).toBeVisible()
    await page.getByRole('textbox', { name: 'Search tasks' }).fill(title)
    await expect(taskRow).toBeVisible()

    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: `Delete ${title}` }).click()
    await expect(page.getByRole('status')).toHaveText('Task deleted.')
    await expect(taskRow).toHaveCount(0)

    await page.locator('button[aria-haspopup="menu"]').first().click()
    await page.getByRole('menuitem', { name: 'Sign out' }).click()
    await expect(page).toHaveURL(/\/sign-in\/?$/)
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
})
