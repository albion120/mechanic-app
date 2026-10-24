import { test, expect } from '@playwright/test';

for (const width of [320, 390, 430, 768, 1024, 1440]) {
  test(`home and emergency controls work at ${width}px in every language`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => localStorage.setItem('language', 'en'));
    await page.route(/https:\/\/.*(?:tile|arcgisonline)/, route => route.abort());
    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.locator('.skip-link')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('main')).toBeFocused();
    for (const language of ['sq', 'de', 'en']) {
      await page.getByLabel('Language / Gjuha / Sprache').selectOption(language);
      await expect(page.locator('.home-action')).toHaveCount(4);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      expect(await page.locator('.home-action,.help-cta').evaluateAll(links => links.every(a => a.getBoundingClientRect().height >= 44))).toBe(true);
    }
    await page.locator('h1').click();
    await page.locator('main').evaluate(element => element.blur());
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: `test-results/home-${width}.png`, fullPage: true });
    await page.getByRole('link', { name: 'I need help now', exact: true }).click();
    await expect(page.locator('.emergency-action')).toHaveCount(8);
    await expect(page.locator('.leaflet-container')).toHaveCount(0);
    await page.getByRole('button', { name: 'Flat tire', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Flat tire', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Choose a location', exact: true }).click();
    await expect(page.getByLabel('Repair shop name or address')).toBeVisible();
    await expect(page).toHaveURL(/#\/roadside$/);
    for (const language of ['sq', 'de', 'en']) {
      await page.getByLabel('Language / Gjuha / Sprache').selectOption(language);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    }
    if (width <= 768) {
      await page.getByRole('button', { name: 'Menu', exact: true }).click();
      await expect(page.locator('#app-navigation')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await page.getByRole('button', { name: 'Menu', exact: true }).click();
    }
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: `test-results/roadside-${width}.png`, fullPage: true });
  });
}

test('public map filters use actual contact fields and preserve location selection', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('language', 'en'));
  await page.route(/https:\/\/.*(?:tile|arcgisonline)/, route => route.abort());
  await page.route('**/api/mechanics/search-location?*', r => r.fulfill({ json: [{ displayName: 'Berlin', latitude: 52, longitude: 13 }] }));
  await page.route('**/api/mechanics/nearby', r => r.fulfill({ json: [
    { id: '1', name: 'Phone workshop', phone: '+491234', latitude: 52, longitude: 13, distanceMeters: 100 },
    { id: '2', name: 'Web workshop', website: 'https://example.com', latitude: 52, longitude: 13, distanceMeters: 200 },
  ] }));
  await page.goto('/#/mechanics');
  await page.getByLabel('Repair shop name or address').fill('Berlin');
  await page.getByRole('button', { name: 'Search the map', exact: true }).click();
  await page.getByRole('button', { name: 'Berlin', exact: true }).click();
  await expect(page.locator('.mechanic-card')).toHaveCount(2);
  await page.getByRole('button', { name: 'Phone available', exact: true }).click();
  await expect(page.locator('.mechanic-card')).toHaveCount(1);
  await expect(page.locator('.mechanic-card h3')).toHaveText('Phone workshop');
  await page.getByRole('button', { name: 'Website available', exact: true }).click();
  await expect(page.locator('.mechanic-card h3')).toHaveText('Web workshop');
  await page.getByRole('button', { name: 'All workshops', exact: true }).click();
  await expect(page.locator('.mechanic-card')).toHaveCount(2);
});
