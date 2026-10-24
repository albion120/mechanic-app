import { test, expect } from '@playwright/test';
const longText = 'LongUnbrokenWorkshopText'.repeat(30);
const profile = { id: 2, businessName: longText, description: longText, address: longText, latitude: 52, longitude: 13, isVerified: true, isActive: true, supportsBooking: true, languages: 'sq,en,de', openingHours: longText };
const service = { id: 4, name: 'Inspection', description: longText, estimatedDurationMinutes: 60, estimatedPriceFrom: 20, estimatedPriceTo: 50, currency: 'EUR', isActive: true };
const time = new Date(Date.now() + 3 * 86400000).toISOString();
const slot = { id: 7, startUtc: time, endUtc: new Date(Date.now() + 3 * 86400000 + 3600000).toISOString(), isBlocked: false, occupied: false };

for (const width of [320, 390, 430, 768, 1024, 1440]) {
  test(`marketplace pages stay contained at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    await page.addInitScript(() => { localStorage.setItem('language', 'en'); localStorage.setItem('token', 'fixture'); localStorage.setItem('user', JSON.stringify({ id: 9, role: 'Mechanic' })); });
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      let json = [];
      if (path === '/api/partners' || path === '/api/partners/managed') json = [profile];
      else if (path === '/api/partners/2') json = { profile, services: [service] };
      else if (path.includes('/services/managed')) json = [service];
      else if (path.includes('/slots')) json = [slot];
      else if (path === '/api/vehicles') json = [{ id: 1, brand: 'BMW', model: '320d', licensePlate: 'TEST' }];
      else if (path === '/api/bookings') json = [{ id: 1, customerId: 9, vehicleId: 1, mechanicProfileId: 2, description: longText, status: 'Completed', version: 3, requestedDateTime: time }];
      else if (path === '/api/notifications') json = { unreadCount: 1, items: [{ id: 1, title: 'Accepted', message: longText, createdAt: time, isRead: false }] };
      else if (path.startsWith('/api/reviews/partner/')) json = { count: 1, averageRating: 5, reviews: [{ id: 1, rating: 5, comment: longText, createdAt: time }] };
      else if (path.endsWith('/care/history')) json = [{ id: 1, kind: 'Service', title: 'Inspection', description: longText, notes: longText, date: time, mileage: 120000, cost: 80, currency: 'EUR' }, { id: 1, kind: 'Diagnostic', title: 'P0300', description: longText, date: time, rpm: 900 }];
      else if (path.endsWith('/care')) json = { records: [{ id: 1, serviceType: 'Inspection', description: longText, serviceDate: time }], reminders: [{ id: 2, title: longText, dueDate: time, isCompleted: false }] };
      return route.fulfill({ json });
    });
    await page.route(/https:\/\/.*(?:tile|arcgisonline)/, route => route.abort());
    for (const path of ['partners', 'partners/2', 'partner-console', 'bookings', 'notifications', 'care', 'roadside']) {
      await page.goto(`/#/${path}`);
      await expect(page.locator('main h1').first()).toBeVisible();
      if (path === 'partner-console') {
        await page.getByRole('combobox', { name: 'Partner', exact: true }).selectOption('2');
        await expect(page.getByRole('button', { name: 'Publish slots' })).toBeVisible();
      }
      if (path === 'partners/2') {
        await page.getByLabel('Date', { exact: true }).fill(time.slice(0, 10));
        await expect(page.getByRole('group', { name: 'Available slots' }).getByRole('button')).toHaveCount(1);
      }
      if (path === 'care') {
        await page.getByRole('combobox', { name: 'Vehicle', exact: true }).selectOption('1');
        await expect(page.getByRole('heading', { name: 'Vehicle history', exact: true })).toBeVisible();
      }
      await expect(page.locator('main').getByText('Loading...', { exact: true })).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), path).toBe(true);
      expect(await page.locator('.marketplace input:not([type=checkbox]), .marketplace select, .marketplace textarea').evaluateAll(fields => fields.every(field => field.getBoundingClientRect().right <= innerWidth + 1)), path).toBe(true);
      if (width === 390 && path === 'partners/2') await page.screenshot({ path: 'test-results/partner-profile-mobile.png', fullPage: true });
    }
    await page.screenshot({ path: `test-results/marketplace-${width}.png`, fullPage: true });
  });
}
