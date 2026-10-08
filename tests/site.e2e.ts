import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

// Опубликованные коды закрывают все работы, поэтому тесты, которые открывают
// страницу работы напрямую, имитируют студента, введший код на этой неделе.
const accessStore = 'itpsis-lab-access:/2026-ITPSIS-lab/'

async function unlockAllWorks(page: Page) {
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000
  const store = JSON.stringify(Object.fromEntries(Array.from({ length: 12 }, (_, index) => [String(index + 1), expiresAt])))
  await page.addInitScript(([key, value]) => window.localStorage.setItem(key, value!), [accessStore, store] as [string, string])
}

test('главная страница показывает структуру курса и 12 карточек', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('От обращения')
  await expect(page.getByRole('heading', { name: 'От организации поддержки к устранению отказов' })).toBeVisible()
  await expect(page.locator('.hero')).toContainText('2 учебных блока · 12 лабораторных работ')
  await expect(page.locator('.hero')).toContainText('Белоусов Д. И.')
  await expect(page.locator('.block-card')).toHaveCount(2)
  await expect(page.locator('.block-card').nth(0)).toContainText('Блок 1')
  await expect(page.locator('.block-card').nth(0)).toContainText('регламенты, обращения, знания, изменения и резервирование')
  await expect(page.locator('.block-card').nth(1)).toContainText('Блок 2')
  await expect(page.locator('.lab-card')).toHaveCount(12)
  await expect(page.locator('.variant-picker')).toContainText('SA01 · Электронное расписание')
  await expect(page.locator('input[type="file"]')).toHaveCount(0)
  await expect(page.locator('footer')).toHaveCount(0)
})

test('на главной нет семестров, баллов, LMS и кнопок служебного доступа', async ({ page }) => {
  await page.goto('./')
  const body = page.locator('body')
  await expect(body).not.toContainText('семестр')
  await expect(body).not.toContainText('балл')
  await expect(body).not.toContainText('LMS')
  await expect(page.getByRole('button', { name: 'Настройка перед занятием' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: /Материалы/ })).toHaveCount(0)
  await expect(page.getByRole('link', { name: /Открыть LMS/ })).toHaveCount(0)
  await expect(page.locator('.card-download')).toHaveCount(0)
  await expect(page.locator('.lab-card-actions .button')).toHaveCount(12)
  await expect(page.locator('.lab-number').first()).toHaveText('МДК.06.02-ЛР01')
  await expect(page.locator('.lab-number').last()).toHaveText('МДК.06.02-ЛР12')
})

test('тёмный нижний блок объясняет сдачу преподавателю', async ({ page }) => {
  await page.goto('./')
  const section = page.locator('#submission')
  await expect(section.getByRole('heading', { level: 2 })).toHaveText('Одна работа — один документ Word')
  await expect(section).toContainText('Результаты каждой работы сдаются преподавателю')
  await expect(section).not.toContainText('Единственное место сдачи')
  await expect(section.locator('li')).toHaveCount(6)
  await expect(section.locator('li').nth(3)).toContainText('Оформите отчёт под нормоконтроль')
  await expect(section.locator('li').nth(4)).toContainText('Сохраните результат одним файлом .docx')
  await expect(section.locator('li').nth(5)).toContainText('Показать результаты работы преподавателю')
})

test('поиск и фильтры по блокам работают', async ({ page }) => {
  await page.goto('./')
  await page.getByPlaceholder('Номер, тема или практический результат').fill('соглашения об уровне обслуживания')
  await expect(page.locator('.lab-card')).toHaveCount(1)
  await expect(page.locator('.lab-card')).toContainText('соглашения об уровне обслуживания')
  await page.getByRole('button', { name: 'Блок 2' }).click()
  await expect(page.locator('.lab-card')).toHaveCount(0)
  await page.getByPlaceholder('Номер, тема или практический результат').fill('')
  await expect(page.locator('.lab-card')).toHaveCount(5)
  await page.getByRole('button', { name: 'Блок 1' }).click()
  await expect(page.locator('.lab-card')).toHaveCount(7)
})

test('карточка блока открывает работы своего блока', async ({ page }) => {
  await page.goto('./')
  await page.locator('.block-card').nth(1).getByRole('button', { name: /Показать работы/ }).click()
  await expect(page.getByRole('button', { name: 'Блок 2' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.lab-card')).toHaveCount(5)
})

test('все 12 прямых ссылок и DOCX доступны', async ({ page, request }) => {
  await unlockAllWorks(page)
  const labs = [
    ...Array.from({ length: 7 }, (_, index) => ({ number: index + 1, semester: 7, local: index + 1 })),
    ...Array.from({ length: 5 }, (_, index) => ({ number: index + 8, semester: 8, local: index + 1 })),
  ]
  for (const lab of labs) {
    const local = String(lab.local).padStart(2, '0')
    const slug = `${lab.semester}-${local}`
    await page.goto(`./#/lab/${slug}`)
    await expect(page.locator('.lab-hero')).toContainText(`Лабораторная работа ${lab.number}`)
    await expect(page.locator('.lab-hero')).not.toContainText('семестр')
    await expect(page.locator('.lab-breadcrumb')).toContainText(`МДК.06.02-ЛР${String(lab.number).padStart(2, '0')}`)
    await expect(page.locator('.lab-summary')).toContainText(`МДК.06.02-ЛР${String(lab.number).padStart(2, '0')}`)
    await expect(page.locator('.filename code')).toHaveText(`Фамилия_Группа_МДК0602_ЛР${String(lab.number).padStart(2, '0')}.docx`)
    const download = page.getByRole('link', { name: 'Скачать редактируемый DOCX', exact: true })
    await expect(download).toHaveAttribute('href', new RegExp(`reports/S${lab.semester}_LR${local}_template\\.docx$`))
    const response = await request.get(`./reports/S${lab.semester}_LR${local}_template.docx`)
    expect(response.ok()).toBeTruthy()
  }
})

test('на странице работы нет LMS и есть нормоконтроль', async ({ page }) => {
  await unlockAllWorks(page)
  await page.goto('./#/lab/7-01')
  await expect(page.getByRole('link', { name: /LMS/ })).toHaveCount(0)
  const section = page.locator('#report')
  await expect(section.locator('.checklist li')).toHaveCount(6)
  await expect(section.locator('.checklist')).toContainText('Удалите серые подсказки')
  await expect(section.locator('.checklist')).toContainText('Оформите под нормоконтроль')
  await expect(section.locator('.lms-steps li')).toHaveCount(4)
  await expect(section.locator('h2')).toHaveText('Требования к отчёту')
})

test('переход между работами живёт под карточкой и остаётся на виду', async ({ page }) => {
  await unlockAllWorks(page)
  await page.goto('./#/lab/7-01')
  const side = page.locator('.lab-side')
  const pager = page.locator('.lab-pager')
  await expect(side.locator('.lab-summary')).toBeVisible()
  await expect(pager).toBeVisible()
  await expect(side.locator('.lab-summary + .lab-pager')).toHaveCount(1)

  // Липкая колонка и удержание переходов на экране нужны только на широкой раскладке.
  if ((page.viewportSize()?.width ?? 0) > 1100) {
    await expect.poll(() => side.evaluate((node) => getComputedStyle(node).position)).toBe('sticky')
    await page.locator('#task').scrollIntoViewIfNeeded()
    await page.mouse.wheel(0, 1200)
    await expect(pager).toBeInViewport()
  }

  await expect(pager.locator('.lab-pager-prev')).toHaveCount(0)
  await expect(pager.locator('.lab-pager-next')).toContainText('Следующая работа')
  await expect(pager.locator('.lab-pager-next')).toContainText('МДК.06.02-ЛР02')
  await pager.locator('.lab-pager-next').click()
  await expect(page.locator('.lab-hero')).toContainText('Лабораторная работа 2')
  await expect(page.locator('.lab-pager-prev')).toContainText('МДК.06.02-ЛР01')
  await page.goto('./#/lab/8-05')
  await expect(page.locator('.lab-pager-prev')).toContainText('Предыдущая работа')
  await expect(page.locator('.lab-pager-next')).toHaveCount(0)
})

test('в блоке задания нет оценивания, а контрольный случай назван номером работы', async ({ page }) => {
  await unlockAllWorks(page)
  await page.goto('./#/lab/8-01')
  const task = page.locator('#task')
  await expect(task).toContainText('Последовательность действий')
  await expect(task).not.toContainText('Как оценивается результат')
  await expect(task.locator('h3', { hasText: 'оценивается результат' })).toHaveCount(0)
  await expect(task.locator('.task-protocol > li')).toHaveCount(6)

  const source = page.locator('#inputs')
  await expect(source).toContainText('Работа 8, вариант SA01')
  await expect(source).not.toContainText('Работа 8-01')
})

test('изображения загружены и страница не выходит за ширину экрана', async ({ page }) => {
  await page.goto('./')
  await expect.poll(() => page.evaluate(() => Array.from(document.images).every((image) => image.complete && image.naturalWidth > 0))).toBeTruthy()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(1)
})

test('клавиатурная навигация, задание и критерии доступны', async ({page})=>{
  await unlockAllWorks(page);
  await page.goto('./#/lab/7-01');await page.keyboard.press('Tab');await expect(page.locator('.skip-link')).toBeFocused();await page.locator('.skip-link').press('Enter');await expect(page.locator('#main-content')).toBeFocused();
  await expect(page.locator('.characteristic-card')).toHaveCount(5);await expect(page.locator('.task-protocol > li')).toHaveCount(6);
  await expect(page.locator('#theory')).toContainText('ITIL 4');await expect(page.locator('#task details summary')).toHaveText('Дополнительное задание');
  await expect(page.locator('#sequence')).toContainText('Результат этой лабораторной работы');
})

test('выбранная предметная область сохраняется, а её ZIP-пакет доступен', async ({ page, request }) => {
  await unlockAllWorks(page)
  await page.goto('./')
  await page.locator('.variant-picker:not(.compact) select').selectOption('6')
  await page.goto('./#/lab/7-01')
  await expect(page.locator('.variant-picker.compact select')).toHaveValue('6')
  await expect(page.locator('.lab-summary').getByRole('button', { name: 'Скачать лабораторную работу' })).toBeVisible()
  expect((await request.get('./inputs/subject-areas/packs/SA06.zip')).ok()).toBeTruthy()
  const lastPack = await request.get('./inputs/subject-areas/packs/SA29.zip')
  expect(lastPack.ok()).toBeTruthy()
  expect((await lastPack.body()).subarray(0, 2).toString()).toBe('PK')
  const beyondRange = await request.get('./inputs/subject-areas/packs/SA30.zip')
  expect((await beyondRange.body()).subarray(0, 2).toString()).not.toBe('PK')
})

test('опубликованные коды закрывают работы и принимают верный код', async ({ page }) => {
  await page.goto('./')
  const codes = await (await page.request.get('./access-codes.json')).json()
  expect(Object.keys(codes.labs)).toHaveLength(12)

  await expect(page.locator('.lab-card .code-pill')).toHaveCount(12)
  await page.goto('./#/lab/7-01')
  await expect(page.locator('.access-gate')).toBeVisible()
  await expect(page.locator('.lab-content')).toHaveCount(0)

  await page.locator('.access-field input').fill('НЕВЕРНЫЙ-КОД')
  await page.getByRole('button', { name: 'Открыть работу' }).click()
  await expect(page.locator('.access-gate')).toContainText('Код не подходит')
  await page.locator('.access-field input').fill('0000')
  await page.getByRole('button', { name: 'Открыть работу' }).click()
  await expect(page.locator('.access-gate')).toBeVisible()
})

test('верный код открывает работу, а доступ запоминается', async ({ page }) => {
  await page.route('**/access-codes.json', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      // SHA-256 от «LR01-TESTCODE9» после нормализации: регистр, пробелы и дефис отброшены.
      body: JSON.stringify({ schemaVersion: 1, courseId: '2026-ITPSIS-lab', labs: { '1': ['265de8828b4ccef471e3c710cf464b3e6f72ff1f31dd2da679c24d425acba75e'] } }),
    })
  })
  await page.goto('./#/lab/7-01')
  await expect(page.locator('.access-gate')).toBeVisible()
  await page.locator('.access-field input').fill(' lr01-testcode9 ')
  await page.getByRole('button', { name: 'Открыть работу' }).click()
  await expect(page.locator('.lab-content')).toBeVisible()
  await expect(page.locator('.lab-hero')).toContainText('Лабораторная работа 1')

  await page.goto('./#/lab/7-01')
  await expect(page.locator('.lab-content')).toBeVisible()

  // Работа, для которой код не задан, открывается свободно — так ведётся разработка.
  await page.goto('./#/lab/7-02')
  await expect(page.locator('.lab-content')).toBeVisible()
  await expect(page.locator('.access-gate')).toHaveCount(0)
})
