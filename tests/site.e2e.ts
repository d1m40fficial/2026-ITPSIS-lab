import { expect, test } from '@playwright/test'

test('главная страница показывает структуру курса и 12 карточек', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Поддержка системы')
  await expect(page.getByRole('heading', { name: 'Два профессиональных контура' })).toBeVisible()
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
    await expect(page.locator('.lab-hero')).toContainText(`лабораторная работа ${lab.local}`)
    const download = page.locator('.lab-summary').getByRole('link', { name: 'Скачать DOCX', exact: true })
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

test('клавиатурный переход и ссылка LMS доступны, критериев оценивания нет', async ({ page }) => {
  await page.goto('./#/lab/7-01')
  await page.keyboard.press('Tab')
  await expect(page.locator('.skip-link')).toBeFocused()
  await page.locator('.skip-link').press('Enter')
  await expect(page.locator('#main-content')).toBeFocused()
  await expect(page.locator('#main-content')).toBeInViewport()
  await expect(page.locator('.lab-action-stack')).toHaveCount(0)
  const lmsLink = page.locator('.lab-summary').getByRole('link', { name: 'Открыть LMS' })
  await expect(lmsLink).toHaveAttribute('href', 'https://lms.synergy.ru/')
  await expect(page.locator('#lms-submit')).toContainText('Один заполненный редактируемый DOCX-файл')
  await expect(page.getByRole('heading', { name: 'Пять характеристик сопровождения' })).toBeVisible()
  await expect(page.locator('.characteristic-card')).toHaveCount(5)
  await expect(page.getByRole('heading', { name: 'Маршрут выполнения' })).toHaveCount(0)
  await expect(page.locator('#result .result-banner')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Критерии оценивания' })).toHaveCount(0)
  await expect(page.locator('body')).not.toContainText(/Moodle/i)
  await expect(page.locator('body')).not.toContainText(/(?:ОК|ПК)\s*\d/i)
  await expect(page.locator('#goal')).toContainText('Место в последовательности')
})

test('выбранная предметная область сохраняется, а её ZIP-пакет доступен', async ({ page, request }) => {
  await page.goto('./')
  await page.locator('.variant-picker:not(.compact) select').selectOption('6')
  await page.goto('./#/lab/7-01')
  await expect(page.locator('.variant-picker.compact select')).toHaveValue('6')
  await expect(page.locator('.variant-source-note')).toContainText('SA06')
  const packLink = page.locator('.lab-summary').getByRole('link', { name: 'Набор SA06' })
  await expect(packLink).toHaveAttribute('href', /inputs\/subject-areas\/packs\/SA06\.zip$/)
  expect((await request.get('./inputs/subject-areas/packs/SA06.zip')).ok()).toBeTruthy()
})
