/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { apiRequest } from '../api';
import { setLanguage } from '../i18n';
import DiagnosticReportActions from './DiagnosticReportActions';

vi.mock('../api', () => ({ apiRequest: vi.fn(), handleRequestError: e => e.message }));
beforeEach(() => { vi.clearAllMocks(); setLanguage('en'); });
const report = { id: 7, source: 'Manual', version: 2, userSymptoms: 'Noise', summary: 'Check brakes', diagnosticCode: '', recommendedAction: 'Inspection' };

it('prefills and updates the selected report', async () => {
  apiRequest.mockResolvedValue({});
  const changed = vi.fn();
  render(<DiagnosticReportActions report={report} vehicleId="3" onChanged={changed} />);
  fireEvent.click(screen.getByRole('button', { name: /Edit report/ }));
  expect(screen.getByLabelText('Recorded symptoms').value).toBe('Noise');
  fireEvent.change(screen.getByLabelText('Inspection findings'), { target: { value: 'Pads worn' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save report' }));
  await waitFor(() => expect(changed).toHaveBeenCalledOnce());
  expect(apiRequest).toHaveBeenCalledWith('/api/diagnostics/7', { method: 'PATCH', body: { version: 2, symptoms: 'Noise', summary: 'Pads worn', diagnosticCode: null, recommendedAction: 'Inspection' } });
});

it('requires confirmation, allows cancel and retries failed deletion', async () => {
  apiRequest.mockRejectedValueOnce(new Error('Unavailable')).mockResolvedValueOnce(null);
  const changed = vi.fn();
  render(<DiagnosticReportActions report={report} vehicleId="3" onChanged={changed} />);
  fireEvent.click(screen.getByRole('button', { name: /Delete report/ }));
  expect(apiRequest).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(apiRequest).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /Delete report/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm deletion' }));
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(changed).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm deletion' }));
  await waitFor(() => expect(changed).toHaveBeenCalledOnce());
  expect(apiRequest).toHaveBeenLastCalledWith('/api/diagnostics/7', { method: 'DELETE' });
});

it('keeps previous automatic reports immutable and can start a booking from any report', () => {
  const book = vi.fn();
  render(<DiagnosticReportActions report={{ ...report, source: 'AI', diagnosticCode: 'P0300' }} vehicleId="3" onChanged={vi.fn()} onBookService={book} />);
  expect(screen.queryByRole('button', { name: /Edit report/ })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /Plan service for this report/ }));
  expect(book).toHaveBeenCalledWith(3, 'Inspection', 7);
});
