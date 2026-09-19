import { expect, test } from '@playwright/test'

test('главная страница показывает структуру курса и 12 карточек', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('От обращения')
  await expect(page.getByRole('heading', { name: 'От организации поддержки к устранению отказов' })).toBeVisible()
  await expect(page.locator('.hero')).toContainText('100 баллов')
  await expect(page.locator('.block-card')).toHaveCount(2)
  await expect(page.locator('.block-card').nth(0)).toContainText('50 баллов')
  await expect(page.locator('.block-card').nth(1)).toContainText('50 баллов')
  await expect(page.locator('.lab-card')).toHaveCount(12)
  await expect(page.locator('.variant-picker')).toContainText('SA01 · Электронное расписание')
  await expect(page.locator('input[type="file"]')).toHaveCount(0)
  await expect(page.locator('footer')).toHaveCount(0)
})

test('поиск и фильтры работают', async ({ page }) => {
  await page.goto('./')
  await page.getByPlaceholder('Номер, тема или практический результат').fill('соглашения об уровне обслуживания')
  await expect(page.locator('.lab-card')).toHaveCount(1)
  await expect(page.locator('.lab-card')).toContainText('соглашения об уровне обслуживания')
  await page.getByRole('button', { name: '8 семестр' }).click()
  await expect(page.locator('.lab-card')).toHaveCount(0)
  await page.getByPlaceholder('Номер, тема или практический результат').fill('')
  await expect(page.locator('.lab-card')).toHaveCount(5)
})

test('все 12 прямых ссылок и DOCX доступны', async ({ page, request }) => {
  const labs = [
    ...Array.from({ length: 7 }, (_, index) => ({ semester: 7, local: index + 1 })),
    ...Array.from({ length: 5 }, (_, index) => ({ semester: 8, local: index + 1 })),
  ]
  for (const lab of labs) {
    const local = String(lab.local).padStart(2, '0')
    const slug = `${lab.semester}-${local}`
    await page.goto(`./#/lab/${slug}`)
    await expect(page.locator('.lab-hero')).toContainText(`Лабораторная работа ${lab.local}`)
    const download = page.getByRole('link', { name: 'Скачать редактируемый DOCX', exact: true })
    await expect(download).toHaveAttribute('href', new RegExp(`reports/S${lab.semester}_LR${local}_template\\.docx$`))
    const response = await request.get(`./reports/S${lab.semester}_LR${local}_template.docx`)
    expect(response.ok()).toBeTruthy()
  }
})

test('изображения загружены и страница не выходит за ширину экрана', async ({ page }) => {
  await page.goto('./')
  await expect.poll(() => page.evaluate(() => Array.from(document.images).every((image) => image.complete && image.naturalWidth > 0))).toBeTruthy()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(1)
})

test('клавиатурная навигация, задание и критерии доступны', async ({page})=>{
 await page.goto('./#/lab/7-01');await page.keyboard.press('Tab');await expect(page.locator('.skip-link')).toBeFocused();await page.locator('.skip-link').press('Enter');await expect(page.locator('#main-content')).toBeFocused();
 await expect(page.getByRole('link',{name:'Перейти в LMS'})).toHaveAttribute('href','https://lms.synergy.ru/');
 await expect(page.locator('.characteristic-card')).toHaveCount(5);await expect(page.locator('.task-protocol > li')).toHaveCount(6);
 await expect(page.locator('#theory')).toContainText('ITIL 4');await expect(page.locator('#task')).toContainText('Как оценивается результат');
 await expect(page.locator('#sequence')).toContainText('Результат этой лабораторной работы');
})

test('выбранная предметная область сохраняется, а её ZIP-пакет доступен', async ({ page, request }) => {
  await page.goto('./')
  await page.locator('.variant-picker:not(.compact) select').selectOption('6')
  await page.goto('./#/lab/7-01')
  await expect(page.locator('.variant-picker.compact select')).toHaveValue('6')
  await expect(page.locator('.variant-source-note')).toContainText('SA06')
  await expect(page.locator('.lab-summary').getByRole('button', { name: 'Скачать лабораторную работу' })).toBeVisible()
  expect((await request.get('./inputs/subject-areas/packs/SA06.zip')).ok()).toBeTruthy()
})

test('преподаватель скачивает полные архивы по семестрам', async ({ page, request }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Настройка перед занятием' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('все 30 вариантов')
  await expect(dialog.getByRole('link', { name: '7 семестр' })).toHaveAttribute('href', /teacher-packs\/semester-7-all\.zip$/)
  await expect(dialog.getByRole('link', { name: '8 семестр' })).toHaveAttribute('href', /teacher-packs\/semester-8-all\.zip$/)
  await expect(dialog.getByRole('link', { name: 'Все семестры' })).toHaveAttribute('href', /teacher-packs\/all-semesters\.zip$/)
  for (const archive of ['semester-7-all.zip', 'semester-8-all.zip', 'all-semesters.zip']) {
    const response = await request.get(`./teacher-packs/${archive}`)
    expect(response.ok()).toBeTruthy()
  }
})
