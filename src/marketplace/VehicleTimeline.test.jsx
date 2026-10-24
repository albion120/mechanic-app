/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { apiRequest } from '../api';
import { setLanguage } from '../i18n';
import VehicleTimeline from './VehicleTimeline';

vi.mock('../api', () => ({ apiRequest: vi.fn(), handleRequestError: e => e.message }));
it('shows costs and OBD data and filters by record type in Albanian', async () => {
  setLanguage('sq');
  apiRequest.mockResolvedValue([
    { id: 1, kind: 'Service', date: '2026-10-01T10:00:00Z', title: 'Brakes', description: 'Changed pads', mileage: 123000, cost: 80, currency: 'EUR' },
    { id: 1, kind: 'Diagnostic', date: '2026-09-01T10:00:00Z', title: 'P0300', description: 'Archived symptoms', rpm: 900 }
  ]);
  render(<VehicleTimeline vehicleId={7} />);
  expect(await screen.findByText('80 EUR')).toBeTruthy();
  expect(screen.getByText(/RPM: 900/)).toBeTruthy();
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'OBD / diagnostics' } });
  expect(screen.queryByText('Changed pads')).toBeNull();
  expect(screen.getByText('P0300')).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Arkivi i diagnostikimeve' })).toHaveProperty('hash', '#/diagnostics/7');
  expect(apiRequest).toHaveBeenCalledWith('/api/vehicles/7/care/history');
});
