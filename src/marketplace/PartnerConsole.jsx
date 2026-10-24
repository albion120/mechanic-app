import { useState } from 'react';
import { apiRequest, handleRequestError } from '../api';
import { t } from '../i18n';
import { Feedback, Field, TextField, Button } from './common';
import { useResource, localTime, timezone, asUtc } from './hooks';

const emptyProfile = { businessName: '', description: '', address: '', latitude: 0, longitude: 0, phone: '', website: '', languages: '', openingHours: '' };
function ProfileFields({ value, set }) {
  return <>{[['businessName', 'Business name', 150], ['address', 'Address', 300], ['phone', 'Phone', 60], ['website', 'Website', 500], ['languages', 'Languages', 300], ['openingHours', 'Opening hours', 500]].map(([key, label, maxLength]) => <Field key={key} label={label} value={value[key]} onChange={v => set({ ...value, [key]: v })} required={['businessName', 'address'].includes(key)} maxLength={maxLength} />)}
    <TextField label="Description" value={value.description} onChange={v => set({ ...value, description: v })} maxLength={2000} />
    <Field label="Latitude" type="number" min={-90} max={90} step="any" required value={value.latitude} onChange={v => set({ ...value, latitude: v })} />
    <Field label="Longitude" type="number" min={-180} max={180} step="any" required value={value.longitude} onChange={v => set({ ...value, longitude: v })} /></>;
}
export default function PartnerConsole({ isAdmin, onSessionExpired }) {
  const profiles = useResource('/api/partners/managed', onSessionExpired);
  const [id, setId] = useState(''); const [create, setCreate] = useState({ ...emptyProfile, email: '' }); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  const profile = profiles.data?.find(p => String(p.id) === id);
  const provision = async e => {
    e.preventDefault(); if (busy) return; setBusy(true); setMessage('');
    try { await apiRequest('/api/partners', { method: 'POST', body: { ...create, latitude: Number(create.latitude), longitude: Number(create.longitude) } }); setCreate({ ...emptyProfile, email: '' }); profiles.reload(); setMessage(t('Partner created. The owner must sign in again to receive mechanic access.')); }
    catch (error) { setMessage(handleRequestError(error, onSessionExpired, t('Request failed'))); } finally { setBusy(false); }
  };
  return <section className="marketplace"><h1>{t('Partner management')}</h1><Feedback resource={profiles} message={message} />
    {profiles.data?.length === 0 && <p>{t('No partner profile is assigned to this account.')}</p>}
    <label className="field">{t('Partner')}<select value={id} onChange={e => setId(e.target.value)}><option value="">{t('Choose partner')}</option>{profiles.data?.map(p => <option value={p.id} key={p.id}>{p.businessName}</option>)}</select></label>
    {profile && <PartnerEditor key={profile.id} profile={profile} isAdmin={isAdmin} onSessionExpired={onSessionExpired} onSaved={profiles.reload} />}
    {isAdmin && <details className="panel"><summary>{t('Provision a mechanic account')}</summary><p>{t('Use an existing customer email. Public registration never grants mechanic access.')}</p><form className="market-form" onSubmit={provision}><fieldset disabled={busy}><Field label="Customer email" type="email" value={create.email} onChange={v => setCreate({ ...create, email: v })} required /><ProfileFields value={create} set={setCreate} /><Button>Create partner</Button></fieldset></form></details>}
  </section>;
}
function PartnerEditor({ profile, isAdmin, onSessionExpired, onSaved }) {
  const [form, setForm] = useState(profile); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  const services = useResource(`/api/partners/${profile.id}/services/managed`, onSessionExpired);
  const closures = useResource(`/api/partners/${profile.id}/closures`, onSessionExpired);
  const [closure, setClosure] = useState({ from: "", to: "", reason: "" });
  const slots = useResource(`/api/partners/${profile.id}/slots/managed`, onSessionExpired);
  const emptyService = { name: '', description: '', estimatedPriceFrom: '', estimatedPriceTo: '', currency: 'EUR', estimatedDurationMinutes: 60, isActive: true };
  const [service, setService] = useState(emptyService);
  const [period, setPeriod] = useState({ from: '', to: '', blocked: true });
  const [window, setWindow] = useState({ startUtc: '', endUtc: '', slotDurationMinutes: 60, repeatWeeks: 0 });
  const perform = async (path, method, body, done) => {
    if (busy) return; setBusy(true); setMessage('');
    try { await apiRequest(path, { method, body }); setMessage(t('Saved')); done?.(); }
    catch (error) { setMessage(handleRequestError(error, onSessionExpired, t('Request failed'))); } finally { setBusy(false); }
  };
  const base = `/api/partners/${profile.id}`;
  return <><Feedback message={message} /><section className="panel"><h2>{t('Business profile')}</h2><p>{t('Changing business name, address or coordinates requires renewed verification.')}</p>
    <form onSubmit={e => { e.preventDefault(); perform(base, 'PUT', { ...form, latitude: Number(form.latitude), longitude: Number(form.longitude) }, onSaved); }}><fieldset disabled={busy}><ProfileFields value={form} set={setForm} /><Button>Save profile</Button></fieldset></form>
    {isAdmin && <div className="market-actions"><Button disabled={busy} onClick={() => perform(`${base}/approval`, 'PATCH', { isVerified: !profile.isVerified, isActive: profile.isActive }, onSaved)}>{profile.isVerified ? 'Remove verification' : 'Verify partner'}</Button><Button disabled={busy} onClick={() => perform(`${base}/approval`, 'PATCH', { isVerified: profile.isVerified, isActive: !profile.isActive }, onSaved)}>{profile.isActive ? 'Deactivate partner' : 'Activate partner'}</Button></div>}
  </section><section className="panel"><h2>{t('Service catalog')}</h2><Feedback resource={services} />
    {services.data?.map(s => <div key={s.id} className="market-actions"><span>{s.name} · {t(s.isActive ? 'Active' : 'Inactive')}</span><Button disabled={busy} onClick={() => setService(s)}>Edit service</Button></div>)}
    <form onSubmit={e => { e.preventDefault(); perform(`${base}/services${service.id ? `/${service.id}` : ''}`, service.id ? 'PUT' : 'POST', { ...service, estimatedDurationMinutes: Number(service.estimatedDurationMinutes), estimatedPriceFrom: service.estimatedPriceFrom === '' || service.estimatedPriceFrom == null ? null : Number(service.estimatedPriceFrom), estimatedPriceTo: service.estimatedPriceTo === '' || service.estimatedPriceTo == null ? null : Number(service.estimatedPriceTo) }, () => { setService(emptyService); services.reload(); }); }}><fieldset disabled={busy}>
      <Field label="Service name" value={service.name} onChange={v => setService({ ...service, name: v })} required maxLength={150} /><TextField label="Description" value={service.description} onChange={v => setService({ ...service, description: v })} maxLength={1500} />
      {[['estimatedPriceFrom', 'Estimate from'], ['estimatedPriceTo', 'Estimate to'], ['estimatedDurationMinutes', 'Duration in minutes']].map(([key, label]) => <Field key={key} label={label} type="number" min={key === 'estimatedDurationMinutes' ? 15 : 0} max={key === 'estimatedDurationMinutes' ? 480 : 1000000} step={key === 'estimatedDurationMinutes' ? 1 : '0.01'} value={service[key]} onChange={v => setService({ ...service, [key]: v })} required={key === 'estimatedDurationMinutes'} />)}
      <Field label="Currency" value={service.currency} onChange={v => setService({ ...service, currency: v.toUpperCase() })} required pattern="[A-Z]{3}" maxLength={3} /><label className="market-check"><input type="checkbox" checked={service.isActive} onChange={e => setService({ ...service, isActive: e.target.checked })} />{t('Active')}</label><Button>Save service</Button><button type="button" className="button button-quiet" onClick={() => setService(emptyService)}>{t('New service')}</button>
    </fieldset></form>
  </section><section className="panel"><h2>{t('Availability')}</h2><p>{t('Times shown in')} {timezone()}</p><p>{t('Publish one working interval at a time. Block slots for breaks or unavailable periods. Each slot holds one vehicle.')}</p>
    <form onSubmit={e => { e.preventDefault(); perform(`${base}/slots`, 'POST', { startUtc: asUtc(window.startUtc), endUtc: asUtc(window.endUtc), slotDurationMinutes: Number(window.slotDurationMinutes), repeatWeeks: Number(window.repeatWeeks) }, slots.reload); }}><fieldset disabled={busy}>
      <Field label="Start" type="datetime-local" required value={window.startUtc} onChange={v => setWindow({ ...window, startUtc: v })} /><Field label="End" type="datetime-local" required value={window.endUtc} onChange={v => setWindow({ ...window, endUtc: v })} />
      <Field label="Slot duration in minutes" type="number" min={15} max={480} required value={window.slotDurationMinutes} onChange={v => setWindow({ ...window, slotDurationMinutes: v })} /><Field label="Repeat for additional weeks" type="number" min={0} max={12} required value={window.repeatWeeks} onChange={v => setWindow({ ...window, repeatWeeks: v })} />
      <p>{t('Weekly repetition uses UTC. Check local times when daylight saving time changes.')}</p><Button>Publish slots</Button>
    </fieldset></form>
    <details className="panel"><summary>{t('Block published slots by date')}</summary><p>{t('Applies only to already published slots. Reserved slots prevent the entire change. New slots published later are not affected.')}</p>
    <form onSubmit={e => { e.preventDefault(); const end = new Date(period.to + 'T00:00:00'); end.setDate(end.getDate() + 1); perform(base + '/slots/period', 'PATCH', { startUtc: asUtc(period.from + 'T00:00:00'), endUtc: end.toISOString(), isBlocked: period.blocked }, slots.reload); }}><fieldset disabled={busy}>
    <Field label="From date" type="date" required value={period.from} onChange={v => setPeriod({ ...period, from: v })} />
    <Field label="Through date" type="date" required min={period.from} value={period.to} onChange={v => setPeriod({ ...period, to: v })} />
    <label className="market-check"><input type="checkbox" checked={period.blocked} onChange={e => setPeriod({ ...period, blocked: e.target.checked })} />{t('Block slots (uncheck to reopen)')}</label><Button>Apply to published slots</Button>
    </fieldset></form></details><Feedback resource={slots} />
    <section className="panel"><h3>{t('Workshop holidays and closures')}</h3><p>{t('Closures prevent bookings and new slots. Existing manual blocks remain when a closure is removed.')}</p><Feedback resource={closures} />
    <form onSubmit={e => { e.preventDefault(); const end = new Date(closure.to + 'T00:00:00'); end.setDate(end.getDate() + 1); perform(base + '/closures', 'POST', { startUtc: asUtc(closure.from + 'T00:00:00'), endUtc: end.toISOString(), reason: closure.reason }, () => { closures.reload(); slots.reload(); }); }}><fieldset disabled={busy}>
      <Field label="Closure starts" type="date" required value={closure.from} onChange={v => setClosure({ ...closure, from: v })} />
      <Field label="Closure through" type="date" required min={closure.from} value={closure.to} onChange={v => setClosure({ ...closure, to: v })} />
      <Field label="Closure reason" maxLength={200} value={closure.reason} onChange={v => setClosure({ ...closure, reason: v })} /><Button>Save closure</Button>
    </fieldset></form>
    {closures.data?.map(c => <article key={c.id}><p>{localTime(c.startUtc)} – {localTime(c.endUtc)}</p><p>{c.reason}</p><Button disabled={busy} onClick={() => perform(base + '/closures/' + c.id, 'DELETE', undefined, () => { closures.reload(); slots.reload(); })}>Remove closure</Button></article>)}
    </section>
    <div className="slot-grid">{slots.data?.map(s => <article className="slot-card" key={s.id}><p>{localTime(s.startUtc)} – {localTime(s.endUtc)}</p><p>{t(s.occupied ? 'Reserved' : s.isClosed ? 'Workshop closed' : s.isBlocked ? 'Blocked' : 'Available')}</p><Button disabled={busy || s.occupied || s.isClosed} onClick={() => perform(`${base}/slots/${s.id}`, 'PATCH', { isBlocked: !s.isBlocked }, slots.reload)}>{s.isBlocked ? 'Unblock' : 'Block'}</Button></article>)}</div>
  </section></>;
}
