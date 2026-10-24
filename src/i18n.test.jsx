/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import App from './App';
import resources from './locales/translations.json';
import marketplace from './locales/marketplace.json';

it('changes UI language without reloading and saves the manual preference', () => {
  localStorage.removeItem('token');
  render(<App />);
  fireEvent.change(screen.getByLabelText('Language / Gjuha / Sprache'), { target: { value: 'de' } });
  expect(screen.getByRole('heading', { name: 'Fahrzeugpflege leicht gemacht.' })).toBeTruthy();
  expect(localStorage.getItem('language')).toBe('de');
  fireEvent.change(screen.getByLabelText('Language / Gjuha / Sprache'), { target: { value: 'en' } });
  expect(screen.getByRole('heading', { name: 'Vehicle care made simpler.' })).toBeTruthy();
});
it('has complete resources for all three supported interface languages', () => {
  for (const entry of Object.values(resources)) for (const language of ['sq','en','de']) expect(entry[language]?.trim()).toBeTruthy();
});
it('has Albanian and German translations for the English marketplace keys', () => {
  for (const [english, entry] of Object.entries(marketplace)) {
    expect(english.trim()).toBeTruthy();
    for (const language of ['sq', 'de']) expect(entry[language]?.trim()).toBeTruthy();
  }
});
it('explains why a guest needs an account for vehicle history', () => {
  localStorage.removeItem('token');
  window.location.hash = '/diagnostics';
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Kyçja kërkohet' })).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Gjej mekanikë pa llogari' })).toHaveProperty('hash', '#/mechanics');
  expect(screen.queryByText('OBD-II · HISTORIKU I VETURËS')).toBeNull();
});
