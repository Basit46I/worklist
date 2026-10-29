import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'

const email = process.env.WORKLIST_E2E_EMAIL
const password = process.env.WORKLIST_E2E_PASSWORD

test('member can sign in, create, search, delete a task, and sign out', async ({ page }) => {
    test.setTimeout(60_000)
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

    const csvExport = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export filtered CSV' }).click()
    const csvDownload = await csvExport
    expect(csvDownload.suggestedFilename()).toMatch(/\.csv$/)
    const csvPath = await csvDownload.path()
    expect(csvPath).not.toBeNull()
    expect(await readFile(csvPath ?? '', 'utf8')).toContain(title)
    const jsonExport = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download list backup' }).click()
    const jsonDownload = await jsonExport
    expect(jsonDownload.suggestedFilename()).toMatch(/\.json$/)
    const jsonPath = await jsonDownload.path()
    expect(jsonPath).not.toBeNull()
    expect(await readFile(jsonPath ?? '', 'utf8')).toContain(title)

    await page.getByRole('textbox', { name: 'Search tasks' }).fill('')
    const csvTitle = `CSV import ${randomUUID()}`
    const csv = `Task,Description,Status,Priority,Assignee,Due date,Labels\r\n"${csvTitle}","Imported from CSV",To do,Medium,Unassigned,2030-01-02,imported`
    await page.locator('input[type="file"][accept=".csv,text/csv"]').setInputFiles({ name: 'worklist-import.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) })
    const csvRow = page.getByRole('row').filter({ hasText: csvTitle })
    await expect(csvRow).toBeVisible()

    const restoredTitle = `Backup restore ${randomUUID()}`
    const backup = JSON.stringify({
        format: 'worklist-task-backup', version: 1, exportedAt: new Date().toISOString(),
        items: [{ id: `source-${randomUUID()}`, listId: 'source-list', parentId: null, title: restoredTitle, description: 'Restored from JSON', status: 'To do', priority: 'Medium', assignee: 'Unassigned', startDate: '2030-01-01', dueDate: '2030-01-02', checklist: [], dependsOn: [], recurrence: null, tags: ['restored'], clientRequest: null, approvalStatus: 'not_requested', approvalFeedback: '', timeSpentMinutes: 0 }]
    })
    page.once('dialog', (dialog) => dialog.accept())
    await page.locator('input[type="file"][accept=".json,application/json"]').setInputFiles({ name: 'worklist-backup.json', mimeType: 'application/json', buffer: Buffer.from(backup) })
    const restoredRow = page.getByRole('row').filter({ hasText: restoredTitle })
    await expect(restoredRow).toBeVisible()

    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: `Delete ${csvTitle}` }).click()
    await expect(csvRow).toHaveCount(0)
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: `Delete ${restoredTitle}` }).click()
    await expect(restoredRow).toHaveCount(0)
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: `Delete ${title}` }).click()
    await expect(page.getByRole('status')).toHaveText('Task deleted.')
    await expect(taskRow).toHaveCount(0)

    await page.locator('button[aria-haspopup="menu"]').first().click()
    await page.getByRole('menuitem', { name: 'Sign out' }).click()
    await expect(page).toHaveURL(/\/sign-in\/?$/)
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
})
