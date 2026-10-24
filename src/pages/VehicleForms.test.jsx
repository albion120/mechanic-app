/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { apiRequest } from '../api';
import Vehicles from './Vehicles';
import Appointments from './Appointments';

vi.mock('../api', () => ({ apiRequest: vi.fn(), handleRequestError: error => error.message }));
const vehicle = { id: 7, brand: 'BMW', model: '320d', year: 2019, licensePlate: 'TEST-7' };
const appointment = { id: 3, vehicleId: 7, description: 'Inspection', appointmentDate: '2027-01-20T10:00:00Z', status: 'Pending' };
beforeEach(() => {
  vi.clearAllMocks();
  apiRequest.mockImplementation(path => Promise.resolve(path === '/api/vehicles' ? [vehicle] : [appointment]));
});

it.each([['vehicles', Vehicles], ['appointments', Appointments]])('keeps refresh failures visible after saving in %s', async (_name, Component) => {
  let saved = false;
  apiRequest.mockImplementation((path, options) => {
    if (options?.method === 'POST') { saved = true; return Promise.resolve({ id: 8 }); }
    if (saved) return Promise.reject(new Error('Saved, but the list could not be refreshed'));
    return Promise.resolve(path === '/api/vehicles' ? [vehicle] : [appointment]);
  });
  const { container } = render(<Component />);
  await screen.findByRole('button', { name: 'Ndrysho' });
  if (Component === Appointments) {
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText('Data dhe ora'), { target: { value: '2027-01-20T10:00' } });
    fireEvent.change(screen.getByPlaceholderText('p.sh. Kontroll periodik i veturës'), { target: { value: 'Inspection' } });
  } else {
    fireEvent.change(screen.getByLabelText('Marka'), { target: { value: 'BMW' } });
    fireEvent.change(screen.getByLabelText('Modeli'), { target: { value: '320d' } });
    fireEvent.change(screen.getByLabelText('Viti'), { target: { value: '2019' } });
    fireEvent.change(screen.getByLabelText('Targat'), { target: { value: 'TEST-8' } });
  }
  fireEvent.submit(container.querySelector('form'));
  await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Saved, but the list could not be refreshed'));
});

it('preserves the vehicle ID when editing an appointment without a nested vehicle', async () => {
  render(<Appointments />);
  fireEvent.click(await screen.findByRole('button', { name: 'Ndrysho' }));
  expect(screen.getByRole('combobox').value).toBe('7');
});

it('shows initial appointment loading errors even when no vehicle data was received', async () => {
  apiRequest.mockRejectedValue(new Error('Backend unavailable'));
  render(<Appointments />);
  expect((await screen.findByRole('status')).textContent).toBe('Backend unavailable');
  expect(screen.queryByText('Shto së pari një veturë që të mund të caktosh termin.')).toBeNull();
});

it('resets editing when the edited appointment is deleted', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  render(<Appointments />);
  fireEvent.click(await screen.findByRole('button', { name: 'Ndrysho' }));
  fireEvent.click(screen.getByRole('button', { name: 'Fshij' }));
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Ruaj ndryshimet' })).toBeNull());
  expect(screen.getByRole('combobox').value).toBe('');
  vi.restoreAllMocks();
});
