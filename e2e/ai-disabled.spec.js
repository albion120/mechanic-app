import { test, expect } from '@playwright/test';

test('disabled AI is hidden and old links do not generate requests', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('language', 'en'));
  const generation = [];
  page.on('request', r => {
    if (r.method() === 'POST' && /\/api\/(ai\/|diagnostics\/analyze)/.test(r.url())) generation.push(r.url());
  });
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Open AI assistant', exact: true })).toHaveCount(0);
  await expect(page.locator('a[href="#/ai"]')).toHaveCount(0);
  await page.goto('/#/ai');
  await expect(page.getByRole('heading', { name: 'Automatic analysis is disabled' })).toBeVisible();
  await expect(page.locator('textarea')).toHaveCount(0);
  await page.getByRole('link', { name: 'Find a partner', exact: true }).click();
  await expect(page).toHaveURL(/#\/partners$/);
  expect(generation).toEqual([]);
});
