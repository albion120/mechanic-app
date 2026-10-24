import { PartnerCard, Badge, SectionHeader, EmptyState } from '../components/ui';
import { useState } from 'react';
import { apiRequest, handleRequestError } from '../api';
import { t } from '../i18n';
import { Feedback, Field, TextField, Button } from './common';
import { useResource, localTime, timezone, notifyChanged } from './hooks';

export function Partners() {
  const [query, setQuery] = useState(''); const [search, setSearch] = useState('');
  const resource = useResource(`/api/partners?query=${encodeURIComponent(search)}`);
  return <section className="marketplace"><SectionHeader title="MechanicApp Partners" eyebrow="FIND YOUR WORKSHOP" description="Partner bookings are confirmed only when the mechanic accepts." />
    <form className="market-form panel" onSubmit={e => { e.preventDefault(); setSearch(query); }}><Field label="Business or city" value={query} onChange={setQuery} maxLength={150} /><Button>Search partners</Button></form>
    <Feedback resource={resource} />
    {resource.data?.length === 0 && <EmptyState title="No partners found. Public map results are still available." />}
    <div className="market-grid">{resource.data?.map(p => <PartnerCard partner={p} key={p.id} />)}</div>
    <a href="#/mechanics">{t('Browse public OpenStreetMap mechanics')}</a>
  </section>;
}

export function PartnerProfile({ id, session, draft, onSessionExpired, onBooked, onLogin }) {
  const detail = useResource(`/api/partners/${id}`); const reviews = useResource(`/api/reviews/partner/${id}`);
  const vehicles = useResource(session ? '/api/vehicles' : null, onSessionExpired);
  const [serviceId, setServiceId] = useState(''); const [date, setDate] = useState(''); const [slotId, setSlotId] = useState('');
  const [vehicleId, setVehicleId] = useState(String(draft?.vehicleId || '')); const [description, setDescription] = useState(draft?.description || '');
  const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  const day = date ? new Date(`${date}T00:00:00`) : null;
  const end = day ? new Date(day) : null; if (end) end.setDate(end.getDate() + 1);
  const slots = useResource(day ? `/api/partners/${id}/slots?from=${encodeURIComponent(day.toISOString())}&to=${encodeURIComponent(end.toISOString())}${serviceId ? `&serviceId=${serviceId}` : ''}` : null);
  const p = detail.data?.profile;
  const submit = async e => {
    e.preventDefault(); if (busy || !slots.data?.some(s => String(s.id) === slotId)) return;
    setBusy(true); setMessage('');
    try {
      await apiRequest('/api/bookings', { method: 'POST', body: { vehicleId: Number(vehicleId), slotId: Number(slotId), mechanicServiceId: serviceId ? Number(serviceId) : null, diagnosticId: String(draft?.vehicleId) === vehicleId ? draft?.diagnosticId || null : null, description } });
      notifyChanged(); onBooked();
    } catch (error) { setMessage(handleRequestError(error, onSessionExpired, t('Booking failed'))); setSlotId(''); slots.reload(); }
    finally { setBusy(false); }
  };
  return <section className="marketplace"><a href="#/partners">{t('All partners')}</a><Feedback resource={detail} />
    {p && <><article className="panel partner-profile-header"><h1>{p.businessName}</h1><Badge tone={p.isVerified ? 'green' : 'neutral'}>{t(p.isVerified ? 'Verified partner' : 'Not verified')}</Badge><p>{p.description}</p><p>{p.address}</p><p>{p.languages || t('Not provided')}</p><p>{p.openingHours || t('Not provided')}</p>
      <div className="market-actions">{p.phone && <a href={`tel:${p.phone.replace(/[^+0-9]/g, '')}`}>{p.phone}</a>}{/^https?:\/\//i.test(p.website || '') && <a href={p.website} target="_blank" rel="noreferrer">{t('Website')}</a>}<a href={`https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}`} target="_blank" rel="noreferrer">{t('Directions')}</a></div>
    </article><section className="panel"><h2>{t('Services and estimated prices')}</h2><p>{t('Estimates are not final prices. Confirm the scope and price with the mechanic.')}</p>
      {detail.data.services.length === 0 && <p>{t('No services listed')}</p>}
      {detail.data.services.map(s => <article className="service-line" key={s.id}><h3>{s.name}</h3><p>{s.description}</p><p>{s.estimatedDurationMinutes} min · {s.estimatedPriceFrom ?? '—'}–{s.estimatedPriceTo ?? '—'} {s.currency} ({t('Estimate')})</p></article>)}
    </section>
    {p.supportsBooking ? <section className="panel"><h2>{t('Request a booking')}</h2><p>{t('Times shown in')} {timezone()}</p>
      <form className="form-stack" onSubmit={submit}><fieldset disabled={busy}>
        <label className="field">{t('Service')}<select value={serviceId} onChange={e => { setServiceId(e.target.value); setSlotId(''); }}><option value="">{t('General inspection')}</option>{detail.data.services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <Field label="Date" type="date" value={date} onChange={v => { setDate(v); setSlotId(''); }} required />
        <Feedback resource={slots} />{slots.data?.length === 0 && <p>{t('No available slots on this date')}</p>}
        <div className="slot-grid" role="group" aria-label={t('Available slots')}>{slots.data?.map(s => <button type="button" className={`button ${slotId === String(s.id) ? 'button-primary' : 'button-quiet'}`} aria-pressed={slotId === String(s.id)} key={s.id} onClick={() => setSlotId(String(s.id))}>{localTime(s.startUtc)} – {new Date(s.endUtc).toLocaleTimeString()}</button>)}</div>
        {session ? <><Feedback resource={vehicles} /><label className="field">{t('Vehicle')}<select value={vehicleId} onChange={e => setVehicleId(e.target.value)} required><option value="">{t('Choose vehicle')}</option>{vehicles.data?.map(v => <option key={v.id} value={v.id}>{v.brand} {v.model} ({v.licensePlate})</option>)}</select></label>{vehicles.data?.length === 0 && <a href="#/vehicles">{t('Add a vehicle first')}</a>}
        <TextField label="Problem description" value={description} onChange={setDescription} required minLength={3} maxLength={5000} />
        {slotId && <p>{t('Selected time')}: {localTime(slots.data?.find(s => String(s.id) === slotId)?.startUtc)}</p>}
        <label className="market-check"><input type="checkbox" required />{t('I confirm the vehicle, time and description. This request awaits acceptance.')}</label>
        <Button disabled={!slotId || !vehicleId || slots.loading || !!slots.error}>{busy ? 'Submitting...' : 'Confirm booking request'}</Button></> : <Button type="button" onClick={onLogin}>Sign in to request a booking</Button>}
      </fieldset></form><Feedback message={message} />
    </section> : <p className="notice">{t('Booking is unavailable until this partner is verified.')}</p>}
    <section className="panel"><h2>{t('Customer reviews')}</h2><Feedback resource={reviews} />{reviews.data && <><p>{reviews.data.count ? `${Number(reviews.data.averageRating).toFixed(1)} / 5 · ${reviews.data.count}` : t('No reviews yet')}</p>{reviews.data.reviews.map(r => <article key={r.id}><strong>{r.rating}/5</strong><p>{r.comment}</p><small>{localTime(r.createdAt)}</small></article>)}</>}</section></>}
  </section>;
}
