/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { apiRequest } from '../api';
import { setLanguage } from '../i18n';
import ManualDiagnosticForm from './ManualDiagnosticForm';

vi.mock('../api', () => ({ apiRequest: vi.fn(), handleRequestError: e => e.message }));
beforeEach(() => { vi.clearAllMocks(); setLanguage('en'); });
function fill() {
  fireEvent.change(screen.getByLabelText('Recorded symptoms'), { target: { value: 'Noise' } });
  fireEvent.change(screen.getByLabelText('Inspection findings'), { target: { value: 'Inspection needed' } });
}
it('identifies and focuses the first required field when the form is empty', () => {
  render(<ManualDiagnosticForm vehicleId="3" onSaved={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Save report' }));
  const symptoms = screen.getByLabelText('Recorded symptoms');
  expect(document.activeElement).toBe(symptoms);
  expect(symptoms.getAttribute('aria-invalid')).toBe('true');
  expect(apiRequest).not.toHaveBeenCalled();
});
it('rejects and focuses an invalid optional OBD code before sending it', () => {
  render(<ManualDiagnosticForm vehicleId="3" onSaved={vi.fn()} />);
  fill();
  fireEvent.change(screen.getByLabelText('OBD code (optional)'), { target: { value: 'x1234' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save report' }));
  const obdCode = screen.getByLabelText('OBD code (optional)');
  expect(document.activeElement).toBe(obdCode);
  expect(obdCode.getAttribute('aria-invalid')).toBe('true');
  expect(screen.getByRole('alert').textContent).toBe('Enter a valid OBD code, for example P0301.');
  expect(apiRequest).not.toHaveBeenCalled();
});
it('warns before closing a dirty form and removes the warning after saving', async () => {
  apiRequest.mockResolvedValue({ id: 1 });
  render(<ManualDiagnosticForm vehicleId="3" onSaved={vi.fn()} />);
  fill();
  const beforeSave = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(beforeSave);
  expect(beforeSave.defaultPrevented).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Save report' }));
  await screen.findByText('Report saved in the archive.');
  const afterSave = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(afterSave);
  expect(afterSave.defaultPrevented).toBe(false);
});

it('confirms cancellation of edits and normalizes OBD codes', () => {
  const cancel = vi.fn();
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  render(<ManualDiagnosticForm vehicleId="3" report={{ id: 1, summary: 'Original' }} onSaved={vi.fn()} onCancel={cancel} />);
  fireEvent.change(screen.getByLabelText('OBD code (optional)'), { target: { value: 'p0301' } });
  expect(screen.getByLabelText('OBD code (optional)').value).toBe('P0301');
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(cancel).not.toHaveBeenCalled();
  confirm.mockReturnValue(true);
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(cancel).toHaveBeenCalledOnce();
  confirm.mockRestore();
});
it('saves without AI or an OBD code and refreshes the archive', async () => {
  apiRequest.mockResolvedValue({ id: 1 });
  const onSaved = vi.fn();
  render(<ManualDiagnosticForm vehicleId="3" onSaved={onSaved} />);
  fill();
  fireEvent.click(screen.getByRole('button', { name: 'Save report' }));
  expect(await screen.findByText('Report saved in the archive.')).toBeTruthy();
  expect(apiRequest).toHaveBeenCalledWith('/api/diagnostics/manual', { method: 'POST', body: { vehicleId: 3, symptoms: 'Noise', summary: 'Inspection needed', diagnosticCode: null, recommendedAction: '' } });
  expect(onSaved).toHaveBeenCalledOnce();
  expect(screen.getByLabelText('Recorded symptoms').value).toBe('');
});
it('keeps the draft after a save error and allows retry', async () => {
  apiRequest.mockRejectedValueOnce(new Error('Unavailable')).mockResolvedValueOnce({ id: 1 });
  render(<ManualDiagnosticForm vehicleId="3" onSaved={vi.fn()} />);
  fill();
  fireEvent.click(screen.getByRole('button', { name: 'Save report' }));
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(screen.getByLabelText('Recorded symptoms').value).toBe('Noise');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Save report' }).disabled).toBe(false));
  fireEvent.click(screen.getByRole('button', { name: 'Save report' }));
  expect(await screen.findByText('Report saved in the archive.')).toBeTruthy();
});
