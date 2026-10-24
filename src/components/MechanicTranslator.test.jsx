/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import MechanicTranslator from './MechanicTranslator';
import { apiRequest } from '../api';

vi.mock('../api', () => ({ apiRequest: vi.fn(), handleRequestError: error => error.message }));
beforeEach(() => vi.clearAllMocks());
it.each(['   ', 'x'.repeat(4001)])('rejects an empty or oversized translation', async text => {
  apiRequest.mockResolvedValue({ text, targetLanguage: 'de' });
  render(<MechanicTranslator initialText="Noise at idle" />);
  fireEvent.click(screen.getByRole('button', { name: 'Përkthe', exact: true }));
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Përkthimi nuk është i vlefshëm.');
  expect(screen.queryByRole('button', { name: 'Kopjo tekstin' })).toBeNull();
});
it('translates the observed symptoms only, without a saved vehicle or appointment', async () => {
  apiRequest.mockResolvedValue({ text: 'Kein Rauch. Geräusch beim Bremsen.', targetLanguage: 'de' });
  render(<MechanicTranslator initialText="Nuk ka tym. Zhurmë kur frenoj." />);
  fireEvent.click(screen.getByRole('button', { name: 'Përkthe', exact: true }));
  expect(await screen.findByText('Kein Rauch. Geräusch beim Bremsen.')).toBeTruthy();
  expect(apiRequest).toHaveBeenCalledExactlyOnceWith('/api/ai/translate', { method: 'POST', body: { text: 'Nuk ka tym. Zhurmë kur frenoj.', targetLanguage: 'de' } });
});
it('does not show a stale translation after the source text changes', async () => {
  let resolve;
  apiRequest.mockReturnValue(new Promise(done => { resolve = done; }));
  render(<MechanicTranslator initialText="Noise at idle" />);
  fireEvent.click(screen.getByRole('button', { name: 'Përkthe', exact: true }));
  fireEvent.change(screen.getByLabelText('Përshkrimi për mekanikun'), { target: { value: 'New symptom' } });
  resolve({ text: 'Old translation', targetLanguage: 'de' });
  await screen.findByRole('button', { name: 'Përkthe', exact: true });
  expect(screen.queryByText('Old translation')).toBeNull();
});
it('shows a provider error and preserves input', async () => {
  apiRequest.mockRejectedValue(new Error('Provider unavailable'));
  render(<MechanicTranslator initialText="Noise at idle" />);
  fireEvent.click(screen.getByRole('button', { name: 'Përkthe', exact: true }));
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Provider unavailable');
  expect(screen.getByLabelText('Përshkrimi për mekanikun').value).toBe('Noise at idle');
});
