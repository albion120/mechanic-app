import { test, expect } from '@playwright/test';

const vehicle = { id: 3, brand: 'BMW', model: '320d', year: 2019, licensePlate: 'TEST-123' };
const assessment = { id: 7, vehicleId: 3, diagnosticCode: 'P0301', summary: 'LongDiagnosticText'.repeat(60),
  possibleCauses: ['PossibleCause'.repeat(40)], safetyAdvice: 'Safety guidance.', recommendedAction: 'Arrange inspection.',
  urgency: 'Medium', needsMoreInfo: false, followUpQuestions: [], createdAt: '2026-10-01T12:00:00Z', userSymptoms: 'Observation'.repeat(120) };

async function noOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  const escaped = await page.locator('.field input, .field textarea, .field select').evaluateAll(inputs => inputs.filter(input => {
    const parent = input.closest('.field').getBoundingClientRect();
    const rect = input.getBoundingClientRect();
    return rect.left < parent.left - 1 || rect.right > parent.right + 1;
  }).map(input => input.outerHTML.slice(0, 150)));
  expect(escaped).toEqual([]);
  expect(await page.locator('.diagnosis-card, .safety-advice, .diagnostic-history-list, .panel').evaluateAll(cards => cards.filter(card => card.scrollWidth > card.clientWidth + 1).map(card => card.className))).toEqual([]);
}

for (const width of [320, 390, 768, 1280]) {
  test(`OBD history and typing stay contained at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => { localStorage.setItem('language', 'en'); localStorage.setItem('token', 'test-token'); localStorage.setItem('user', JSON.stringify({ role: 'Customer' })); });
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      const json = path === '/api/vehicles' ? [vehicle] : path === '/api/diagnostics/analyze' ? { ...assessment, needsMoreInfo: true, possibleCauses: [], followUpQuestions: ['Where is the noise?', 'Does it change with RPM?'] } : [assessment];
      return route.fulfill({ json });
    });
    await page.goto('/#/diagnostics');
    await page.getByRole('combobox', { name: 'Vehicle', exact: true }).selectOption('3');
    await expect(page.getByText(assessment.summary)).toBeVisible();
    await noOverflow(page);
    await page.getByLabel('Symptoms (optional)').fill('x'.repeat(1500));
    await page.getByLabel('Fault code *').fill('P0301');
    await page.getByLabel('RPM', { exact: true }).fill('850');
    await noOverflow(page);
    await page.getByRole('button', { name: 'Assess and save' }).click();
    await page.getByLabel('Your answers (one per line)').fill('y'.repeat(500));
    await noOverflow(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `test-results/obd-${width}.png`, fullPage: true });
  });
}

test('guest search, translation, languages and protected pages', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => { if (!localStorage.getItem('language')) localStorage.setItem('language', 'en'); });
  await page.route('**/api/mechanics/search-location?*', route => route.fulfill({ json: [{ displayName: 'Berlin, Germany', latitude: 52.52, longitude: 13.405 }] }));
  await page.route('**/api/mechanics/nearby', route => route.fulfill({ json: [{ id: 'node/1', name: 'Test fixture repair shop', latitude: 52.52, longitude: 13.406, distanceMeters: 90, openingHours: 'Mo-Fr 08:00-18:00', openStreetMapUrl: 'https://www.openstreetmap.org/node/1' }] }));
  await page.route('**/api/ai/translate', route => route.fulfill({ json: { text: 'Geräusch beim Bremsen.', targetLanguage: 'de' } }));
  await page.route(/https:\/\/.*(?:tile\.openstreetmap|arcgisonline).*$/, route => route.abort());
  await page.goto('/');
  await page.getByRole('button', { name: 'Find a mechanic without an account' }).first().click();
  await page.getByLabel('Repair shop name or address').fill('Berlin');
  await page.getByRole('button', { name: 'Search the map', exact: true }).click();
  await page.getByRole('button', { name: 'Berlin, Germany' }).click();
  await expect(page.getByRole('heading', { name: 'Test fixture repair shop' })).toBeVisible();
  await expect(page.getByText('Mo-Fr 08:00-18:00')).toBeVisible();
  await expect(page.getByRole('button', { name: /book|appointment/i })).toHaveCount(0);
  await page.getByLabel('Description for the mechanic').fill('Noise when braking.');
  await page.getByRole('button', { name: 'Translate', exact: true }).click();
  await expect(page.getByText('Geräusch beim Bremsen.')).toBeVisible();
  await noOverflow(page);
  await page.getByLabel('Language / Gjuha / Sprache').selectOption('de');
  await expect(page.getByRole('heading', { name: 'Werkstätten in deiner Nähe' })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Language / Gjuha / Sprache')).toHaveValue('de');
  await page.getByRole('link', { name: 'Fahrzeug', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Anmeldung erforderlich' })).toBeVisible();
  await noOverflow(page);
});
