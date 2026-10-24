/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { apiRequest } from '../api';
import { setLanguage } from '../i18n';
import { Partners, PartnerProfile } from './Partners';
import Bookings from './Bookings';
import Notifications from './Notifications';

vi.mock('../api', () => ({ apiRequest: vi.fn(), handleRequestError: error => error.message }));
beforeEach(() => { vi.clearAllMocks(); setLanguage('en'); });
const profile = { id: 2, businessName: 'Partner Garage', address: 'Berlin', latitude: 52, longitude: 13, isVerified: true, supportsBooking: true };
const slot = { id: 9, startUtc: '2027-01-20T10:00:00Z', endUtc: '2027-01-20T11:00:00Z' };

it('lets the customer retry loading partners after a temporary failure', async () => {
  apiRequest.mockRejectedValueOnce(new Error('Connection interrupted')).mockResolvedValueOnce([]);
  render(<Partners />);
  expect(await screen.findByRole('alert')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Refresh', exact: true }));
  expect(await screen.findByText('No partners found. Public map results are still available.')).toBeTruthy();
  expect(screen.queryByRole('alert')).toBeNull();
  expect(apiRequest).toHaveBeenCalledTimes(2);
});

it('shows real partner metadata and books only the explicitly selected slot', async () => {
  apiRequest.mockImplementation((url, options) => {
    if (options?.method === 'POST') return Promise.resolve({ id: 3, status: 'Pending' });
    if (url === '/api/partners/2') return Promise.resolve({ profile, services: [{ id: 4, name: 'Brake inspection', estimatedDurationMinutes: 60, estimatedPriceFrom: 20, estimatedPriceTo: 40, currency: 'EUR' }] });
    if (url.includes('/slots?')) return Promise.resolve([slot]);
    if (url === '/api/vehicles') return Promise.resolve([{ id: 1, brand: 'BMW', model: '320', licensePlate: 'TEST' }]);
    return Promise.resolve({ count: 0, averageRating: null, reviews: [] });
  });
  const onBooked = vi.fn();
  render(<PartnerProfile id={2} session={{ user: { id: 1 } }} draft={{ vehicleId: 1, description: 'Noise when braking', diagnosticId: 7 }} onBooked={onBooked} />);
  await screen.findByText('Partner Garage');
  expect(screen.getByText('Verified partner')).toBeTruthy();
  expect(screen.getByText('No reviews yet')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Service'), { target: { value: '4' } });
  fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2027-01-20' } });
  await screen.findByRole('group', { name: 'Available slots' });
  await waitFor(() => expect(screen.getByRole('group', { name: 'Available slots' }).querySelector('button')).toBeTruthy());
  expect(screen.getByRole('button', { name: 'Confirm booking request' }).disabled).toBe(true);
  fireEvent.click(screen.getByRole('group', { name: 'Available slots' }).querySelector('button'));
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm booking request' }));
  await waitFor(() => expect(onBooked).toHaveBeenCalledOnce());
  expect(apiRequest).toHaveBeenCalledWith('/api/bookings', { method: 'POST', body: { vehicleId: 1, slotId: 9, mechanicServiceId: 4, diagnosticId: 7, description: 'Noise when braking' } });
});
it('requires login for guest booking and never invents a rating', async () => {
  apiRequest.mockImplementation(url => Promise.resolve(url.includes('reviews') ? { count: 0, reviews: [], averageRating: null } : { profile, services: [] }));
  render(<PartnerProfile id={2} onLogin={vi.fn()} />);
  expect(await screen.findByRole('button', { name: 'Sign in to request a booking' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Confirm booking request' })).toBeNull();
});
it('allows the mechanic to accept a pending booking with its version', async () => {
  apiRequest.mockResolvedValue([{ id: 3, customerId: 1, mechanicProfileId: 2, vehicleId: 7, description: 'Noise', status: 'Pending', version: 2, requestedDateTime: slot.startUtc }]);
  render(<Bookings user={{ id: 9, role: 'Mechanic' }} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Accepted', exact: true }));
  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/api/bookings/3/status', { method: 'PATCH', body: { status: 'Accepted', version: 2 } }));
});
it.each(['Accepted', 'Rejected'])('displays %s as the actual server state', async status => {
  apiRequest.mockResolvedValue([{ id: 3, customerId: 1, mechanicProfileId: 2, status, description: 'Noise', requestedDateTime: slot.startUtc }]);
  render(<Bookings user={{ id: 1, role: 'Customer' }} />);
  expect(await screen.findByText(status, { selector: 'strong' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Accepted', exact: true })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Submit review' })).toBeNull();
});
it('shows reviews only on completed customer bookings', async () => {
  apiRequest.mockResolvedValue([{ id: 3, customerId: 1, mechanicProfileId: 2, status: 'Completed', description: 'Noise', requestedDateTime: slot.startUtc }]);
  render(<Bookings user={{ id: 1, role: 'Customer' }} />);
  fireEvent.change(await screen.findByLabelText('Review'), { target: { value: 'Helpful service' } });
  fireEvent.click(screen.getByRole('button', { name: 'Submit review' }));
  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/api/reviews/booking/3', { method: 'POST', body: { rating: 5, comment: 'Helpful service' } }));
});
it('shows unread count and marks a notification read', async () => {
  apiRequest.mockResolvedValue({ unreadCount: 1, items: [{ id: 5, title: 'Accepted', message: 'Booking #3', type: 'BookingAccepted', isRead: false, createdAt: slot.startUtc }] });
  render(<Notifications />);
  fireEvent.click(await screen.findByRole('button', { name: 'Mark as read' }));
  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/api/notifications/5/read', { method: 'PATCH' }));
});
it('keeps an existing review visible after returning to bookings', async () => {
  apiRequest.mockImplementation(url => Promise.resolve(url.startsWith('/api/reviews/booking/')
    ? { review: { rating: 4, comment: 'Helpful workshop', createdAt: slot.startUtc } }
    : [{ id: 3, customerId: 1, mechanicProfileId: 2, status: 'Completed', description: 'Noise', requestedDateTime: slot.startUtc }]));
  render(<Bookings user={{ id: 1, role: 'Customer' }} />);
  expect(await screen.findByText('Helpful workshop')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Submit review' })).toBeNull();
});
it('requires completed work before submitting service completion details', async () => {
  apiRequest.mockResolvedValue([{ id: 3, customerId: 1, mechanicProfileId: 2, status: 'InProgress', description: 'Noise', version: 2, requestedDateTime: slot.startUtc }]);
  render(<Bookings user={{ id: 9, role: 'Mechanic' }} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Completed', exact: true }));
  expect(screen.getByLabelText('Work performed').required).toBe(true);
  fireEvent.change(screen.getByLabelText('Work performed'), { target: { value: 'Replaced brake pads' } });
  fireEvent.change(screen.getByLabelText('Final cost (optional)'), { target: { value: '80' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirm completion' }));
  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/api/bookings/3/status', { method: 'PATCH', body: { status: 'Completed', version: 2, completedService: { workPerformed: 'Replaced brake pads', mileage: null, cost: 80, currency: 'EUR', notes: '' } } }));
});
