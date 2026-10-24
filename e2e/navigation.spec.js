import { test, expect } from '@playwright/test';

test('green mobile selection follows navigation and respects reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem('language', 'en'));
  await page.route(/https:\/\/.*(?:tile|arcgisonline)/, route => route.abort());
  await page.goto('/#/roadside');
  const nav = page.locator('.mobile-quicknav');
  await expect(nav.locator('[aria-current="page"]')).toHaveAttribute('href', '#/roadside');
  await nav.getByRole('link', { name: 'Find a mechanic' }).click();
  await expect(page).toHaveURL(/#\/mechanics$/);
  await expect(nav.locator('[aria-current="page"]')).toHaveAttribute('href', '#/mechanics');
  await expect(nav.getByRole('link', { name: 'I need help now' })).not.toHaveAttribute('aria-current', 'page');
  await nav.getByRole('link', { name: 'My vehicle' }).click();
  await expect(page.getByRole('heading', { name: 'Sign in required' })).toBeVisible();
  await expect(nav.locator('[aria-current="page"]')).toHaveAttribute('href', '#/vehicles');
  await page.goBack();
  await expect(nav.locator('[aria-current="page"]')).toHaveAttribute('href', '#/mechanics');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await nav.getByRole('link', { name: 'I need help now' }).click();
  await expect(page.locator('main')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('#app-navigation a[aria-current="page"]')).toHaveAttribute('href', '#/roadside');
});
