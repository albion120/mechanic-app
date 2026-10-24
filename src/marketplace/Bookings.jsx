import { StatusBadge } from '../components/ui';
import { useState } from 'react';
import { apiRequest, handleRequestError } from '../api';
import { t } from '../i18n';
import { Feedback, Field, TextField, Button } from './common';
import { useResource, localTime, notifyChanged } from './hooks';

export default function Bookings({ user, onSessionExpired }) {
  const [page, setPage] = useState(1); const resource = useResource(`/api/bookings?page=${page}`, onSessionExpired);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const [completing, setCompleting] = useState(null);
  const update = async (b, status, completedService) => {
    if (busy) return; setBusy(true); setMessage('');
    try { await apiRequest(`/api/bookings/${b.id}/status`, { method: 'PATCH', body: { status, version: b.version, ...(completedService ? { completedService } : {}) } }); notifyChanged(); setCompleting(null); resource.reload(); }
    catch (error) { setMessage(handleRequestError(error, onSessionExpired, t('Request failed'))); resource.reload(); } finally { setBusy(false); }
  };
  return <section className="marketplace"><h1>{t('Partner bookings')}</h1><p>{t('Pending requests are not confirmed. Accepted bookings are confirmed by the partner.')}</p><a href="#/partners">{t('Find a partner')}</a><Feedback resource={resource} message={message} />
    {!resource.loading && resource.data?.length === 0 && <p>{t('No bookings yet')}</p>}
    <div className="market-grid">{resource.data?.map(b => {
      const own = Number(user?.id ?? user?.Id) === b.customerId;
      const manager = (user?.role ?? user?.Role)?.toLowerCase() === 'admin' || (!own && (user?.role ?? user?.Role)?.toLowerCase() === 'mechanic');
      const actions = manager ? ({ Pending: ['Accepted', 'Rejected'], Accepted: ['InProgress', 'Cancelled'], InProgress: ['Completed'] }[b.status] || []) : (own && ['Pending', 'Accepted'].includes(b.status) && new Date(b.requestedDateTime) > new Date() ? ['Cancelled'] : []);
      return <article className="panel booking-card" key={b.id}><h2>{t('Booking')} #{b.id}</h2><a href={`#/partners/${b.mechanicProfileId}`}>{t('View partner')}</a><p>{localTime(b.requestedDateTime)}</p><StatusBadge status={b.status} /><p>{b.description}</p><p>{t('Vehicle')} #{b.vehicleId}</p>
        <div className="market-actions">{actions.map(status => <Button key={status} disabled={busy} onClick={() => status === 'Completed' ? setCompleting(b.id) : update(b, status)}>{status}</Button>)}</div>
        {completing === b.id && <CompletionForm busy={busy} onCancel={() => setCompleting(null)} onSubmit={data => update(b, 'Completed', data)} />}
        {own && b.status === 'Completed' && <ReviewForm bookingId={b.id} onSessionExpired={onSessionExpired} />}
      </article>;
    })}</div><div className="market-actions"><Button disabled={page === 1 || busy} onClick={() => setPage(p => p - 1)}>Previous</Button><Button disabled={resource.data?.length !== 100 || busy} onClick={() => setPage(p => p + 1)}>Next</Button><Button disabled={busy} onClick={resource.reload}>Refresh</Button></div>
  </section>;
}
function ReviewForm({ bookingId, onSessionExpired }) {
  const existing = useResource(`/api/reviews/booking/${bookingId}`, onSessionExpired);
  const [rating, setRating] = useState(5); const [comment, setComment] = useState(''); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false); const [sent, setSent] = useState(false);
  if (existing.loading || existing.error) return <Feedback resource={existing} />;
  if (existing.data?.review) return <section><h3>{t('Your review')}</h3><p>{existing.data.review.rating}/5</p><p>{existing.data.review.comment}</p><small>{localTime(existing.data.review.createdAt)}</small></section>;
  return <section><h3>{t('Review your completed service')}</h3><Feedback message={message} />{!sent && <form onSubmit={async e => { e.preventDefault(); if (busy) return; setBusy(true); try { await apiRequest(`/api/reviews/booking/${bookingId}`, { method: 'POST', body: { rating: Number(rating), comment } }); setSent(true); setMessage(t('Review submitted')); } catch (error) { setMessage(handleRequestError(error, onSessionExpired, t('Request failed'))); } finally { setBusy(false); } }}><fieldset disabled={busy}><Field label="Rating (1–5)" type="number" min={1} max={5} required value={rating} onChange={setRating} /><TextField label="Review" value={comment} onChange={setComment} minLength={3} maxLength={2000} required /><Button>Submit review</Button></fieldset></form>}</section>;
}

function CompletionForm({ busy, onSubmit, onCancel }) {
  const [data, setData] = useState({ workPerformed: '', mileage: '', cost: '', currency: 'EUR', notes: '' });
  const set = (key, value) => setData(current => ({ ...current, [key]: value }));
  return <form onSubmit={e => { e.preventDefault(); onSubmit({ ...data, mileage: data.mileage === '' ? null : Number(data.mileage), cost: data.cost === '' ? null : Number(data.cost) }); }}><fieldset disabled={busy}>
    <h3>{t('Complete service')}</h3><TextField label="Work performed" required minLength={3} maxLength={3000} value={data.workPerformed} onChange={v => set('workPerformed', v)} />
    <Field label="Mileage (km)" type="number" min={0} max={10000000} value={data.mileage} onChange={v => set('mileage', v)} />
    <Field label="Final cost (optional)" type="number" min={0} max={1000000} step="0.01" value={data.cost} onChange={v => set('cost', v)} />
    <Field label="Currency" required pattern="[A-Z]{3}" maxLength={3} value={data.currency} onChange={v => set('currency', v.toUpperCase())} />
    <TextField label="Notes" maxLength={2000} value={data.notes} onChange={v => set('notes', v)} />
    <p>{t('These details will be saved in the vehicle history. This is not an invoice.')}</p>
    <Button>Confirm completion</Button><Button type="button" onClick={onCancel}>Cancel</Button>
  </fieldset></form>;
}
