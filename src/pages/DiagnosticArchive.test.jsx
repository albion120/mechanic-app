/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { apiRequest } from '../api';
import { setLanguage } from '../i18n';
import DiagnosticArchive from './DiagnosticArchive';

vi.mock('../api', () => ({ apiRequest: vi.fn(), handleRequestError: e => e.message }));
const archived = [
  { id: 1, source: 'Manual', version: 0, diagnosticCode: 'P0300', summary: 'Engine vibration', createdAt: '2026-10-01T12:00:00Z' },
  { id: 2, source: 'Manual', version: 0, diagnosticCode: 'P0420', summary: 'Exhaust inspection', createdAt: '2026-10-20T12:00:00Z' },
];
async function openArchive() {
  apiRequest.mockImplementation(url => Promise.resolve(url === '/api/vehicles'
    ? [{ id: 3, brand: 'BMW' }, { id: 4, brand: 'Audi' }]
    : url.endsWith('/care') ? { records: [] } : archived));
  render(<DiagnosticArchive />);
  await screen.findByRole('option', { name: /BMW/ });
  fireEvent.change(screen.getByLabelText('Vehicle'), { target: { value: '3' } });
  await screen.findByText('Engine vibration');
}

it('searches reports, clears no matches and sorts by date', async () => {
  await openArchive();
  const titles = () => screen.getAllByRole('heading', { level: 2 }).map(el => el.textContent).filter(text => /^P\d/.test(text));
  expect(titles()).toEqual(['P0420', 'P0300']);
  fireEvent.change(screen.getByLabelText('Report order'), { target: { value: 'oldest' } });
  expect(titles()).toEqual(['P0300', 'P0420']);
  fireEvent.change(screen.getByLabelText('Search reports'), { target: { value: '  ENGINE  ' } });
  expect(titles()).toEqual(['P0300']);
  expect(screen.getByText('Showing 1 of 2 reports')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Search reports'), { target: { value: 'unmatched' } });
  expect(screen.getByText('No matching reports')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
  expect(titles()).toHaveLength(2);
});

it('preselects a vehicle from the archive route', async () => {
  apiRequest.mockImplementation(url => Promise.resolve(url === '/api/vehicles'
    ? [{ id: 3, brand: 'BMW' }, { id: 4, brand: 'Audi' }]
    : url.endsWith('/care') ? { records: [] } : []));
  render(<DiagnosticArchive initialVehicleId="4" />);
  await waitFor(() => expect(screen.getByLabelText('Vehicle').value).toBe('4'));
  expect(apiRequest).toHaveBeenCalledWith('/api/diagnostics/vehicles/4');
});

it('protects a new draft when changing vehicle or filtering', async () => {
  await openArchive();
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  fireEvent.click(screen.getByRole('button', { name: 'Add manual report' }));
  fireEvent.change(screen.getByLabelText('Recorded symptoms'), { target: { value: 'Unsaved noise' } });
  expect(screen.getByLabelText('Search reports').disabled).toBe(true);
  expect(screen.getAllByRole('button', { name: /Edit report/ }).every(button => button.disabled)).toBe(true);
  fireEvent.change(screen.getByLabelText('Vehicle'), { target: { value: '4' } });
  expect(screen.getByLabelText('Vehicle').value).toBe('3');
  expect(screen.getByLabelText('Recorded symptoms').value).toBe('Unsaved noise');
  confirm.mockReturnValue(true);
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.getByLabelText('Search reports').disabled).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: 'Add manual report' }));
  fireEvent.change(screen.getByLabelText('Recorded symptoms'), { target: { value: 'Another draft' } });
  fireEvent.change(screen.getByLabelText('Vehicle'), { target: { value: '4' } });
  expect(screen.queryByLabelText('Recorded symptoms')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Add manual report' }));
  expect(screen.getByLabelText('Recorded symptoms').value).toBe('');
  confirm.mockRestore();
});
beforeEach(() => { vi.clearAllMocks(); setLanguage('en'); });
it('explains how to proceed without a vehicle', async () => {
  apiRequest.mockResolvedValue([]);
  render(<DiagnosticArchive />);
  expect(await screen.findByText('Add a vehicle to view its diagnostic archive.')).toBeTruthy();
  expect(apiRequest).toHaveBeenCalledTimes(1);
});
it('preserves clarification questions without offering new AI analysis', async () => {
  apiRequest.mockImplementation(url => Promise.resolve(url === '/api/vehicles' ? [{ id: 3, brand: 'BMW', model: '320d', year: 2019 }] : [{ id: 1, diagnosticCode: 'P0300', createdAt: '2026-10-01T12:00:00Z', needsMoreInfo: true, followUpQuestions: ['When does it happen?'], possibleCauses: [], rpm: 0 }]));
  render(<DiagnosticArchive />);
  await screen.findByRole('option', { name: /BMW 320d/ });
  fireEvent.change(screen.getByRole('combobox', { name: 'Vehicle' }), { target: { value: '3' } });
  expect(await screen.findByText('When does it happen?')).toBeTruthy();
  expect(screen.getByText('This archived report was incomplete and requested more information.')).toBeTruthy();
  expect(screen.getByText(/RPM: 0/)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Add manual report' })).toBeTruthy();
  expect(apiRequest).toHaveBeenCalledWith('/api/diagnostics/vehicles/3');
});
it('shows a history failure and does not call it an empty archive', async () => {
  apiRequest.mockImplementation(url => url === '/api/vehicles' ? Promise.resolve([{ id: 3, brand: 'BMW' }]) : Promise.reject(new Error('Service unavailable')));
  render(<DiagnosticArchive />);
  await waitFor(() => expect(screen.getByRole('combobox', { name: 'Vehicle' }).options).toHaveLength(2));
  fireEvent.change(screen.getByRole('combobox', { name: 'Vehicle' }), { target: { value: '3' } });
  expect((await screen.findByRole('alert')).textContent).toContain('Service unavailable');
  expect(screen.queryByText('No archived reports')).toBeNull();
});
it('shows vehicle details and dated mileage without offering disabled AI analysis', async () => {
  apiRequest.mockImplementation(url => Promise.resolve(url === '/api/vehicles' ? [{ id: 3, brand: 'BMW', model: '320d', year: 2019, licensePlate: '01-123-AB' }] : url.endsWith('/care') ? { records: [{ mileage: 120000, serviceDate: '2026-10-01T12:00:00Z' }], reminders: [] } : []));
  render(<DiagnosticArchive />);
  await screen.findByRole('option', { name: /01-123-AB/ });
  fireEvent.change(screen.getByRole('combobox', { name: 'Vehicle' }), { target: { value: '3' } });
  expect(await screen.findByText(/120,000 km/)).toBeTruthy();
  expect(screen.queryByRole('link', { name: 'New assessment for this vehicle' })).toBeNull();
  expect(screen.getByText(/Vehicle details reflect the current profile/)).toBeTruthy();
  expect(apiRequest.mock.calls.every(([, options]) => !options?.method)).toBe(true);
});
