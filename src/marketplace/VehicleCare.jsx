import VehicleTimeline from './VehicleTimeline';
import { useState } from 'react';
import { apiRequest, handleRequestError } from '../api';
import { t } from '../i18n';
import { Feedback, Field, TextField, Button } from './common';
import { useResource, localTime, asUtc } from './hooks';

export default function VehicleCare({ onSessionExpired }) {
  const vehicles = useResource('/api/vehicles', onSessionExpired); const [id, setId] = useState('');
  return <section className="marketplace"><h1>{t('Service history and reminders')}</h1><Feedback resource={vehicles} /><label className="field">{t('Vehicle')}<select value={id} onChange={e => setId(e.target.value)}><option value="">{t('Choose vehicle')}</option>{vehicles.data?.map(v => <option key={v.id} value={v.id}>{v.brand} {v.model} ({v.licensePlate})</option>)}</select></label>{id && <CareDetails key={id} id={id} onSessionExpired={onSessionExpired} />}</section>;
}
function CareDetails({ id, onSessionExpired }) {
  const resource = useResource(`/api/vehicles/${id}/care`, onSessionExpired); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false); const [revision, setRevision] = useState(0);
  const initial = { serviceType: '', description: '', mileage: '', cost: '', currency: 'EUR', serviceDate: '', notes: '' };
  const [record, setRecord] = useState(initial); const [reminder, setReminder] = useState({ title: '', dueDate: '', dueMileage: '' });
  const save = async (path, body, method = 'POST') => {
    if (busy) return; setBusy(true); setMessage('');
    try { await apiRequest(`/api/vehicles/${id}/care/${path}`, { method, body }); resource.reload(); setRevision(n => n + 1); setMessage(t('Saved')); if (path === 'records') setRecord(initial); if (path === 'reminders') setReminder({ title: '', dueDate: '', dueMileage: '' }); }
    catch (error) { setMessage(handleRequestError(error, onSessionExpired, t('Request failed'))); } finally { setBusy(false); }
  };
  return <><Feedback resource={resource} message={message} /><VehicleTimeline key={revision} vehicleId={id} onSessionExpired={onSessionExpired} /><div className="market-grid"><section className="panel"><h2>{t('Add service record')}</h2><form onSubmit={e => { e.preventDefault(); save('records', { ...record, mileage: record.mileage === '' ? null : Number(record.mileage), cost: record.cost === '' ? null : Number(record.cost), serviceDate: asUtc(record.serviceDate) }); }}><fieldset disabled={busy}>
    <Field label="Service type" value={record.serviceType} onChange={v => setRecord({ ...record, serviceType: v })} required maxLength={150} /><TextField label="Description" value={record.description} onChange={v => setRecord({ ...record, description: v })} required maxLength={3000} />
    <Field label="Mileage (km)" type="number" min={0} max={10000000} value={record.mileage} onChange={v => setRecord({ ...record, mileage: v })} /><Field label="Cost" type="number" min={0} max={1000000} step="0.01" value={record.cost} onChange={v => setRecord({ ...record, cost: v })} /><Field label="Currency" value={record.currency} onChange={v => setRecord({ ...record, currency: v.toUpperCase() })} pattern="[A-Z]{3}" required />
    <Field label="Service date" type="datetime-local" required value={record.serviceDate} onChange={v => setRecord({ ...record, serviceDate: v })} /><TextField label="Notes" value={record.notes} onChange={v => setRecord({ ...record, notes: v })} maxLength={2000} /><Button>Save record</Button>
  </fieldset></form></section><section className="panel"><h2>{t('Add maintenance reminder')}</h2><p>{t('Choose your own date or mileage. Mileage reminders use the mileage in your service records, not a live odometer.')}</p><form onSubmit={e => { e.preventDefault(); save('reminders', { title: reminder.title, dueDate: reminder.dueDate ? asUtc(reminder.dueDate) : null, dueMileage: reminder.dueMileage === '' ? null : Number(reminder.dueMileage) }); }}><fieldset disabled={busy}>
    <Field label="Reminder title" required maxLength={150} value={reminder.title} onChange={v => setReminder({ ...reminder, title: v })} /><Field label="Due date" type="datetime-local" value={reminder.dueDate} onChange={v => setReminder({ ...reminder, dueDate: v })} required={reminder.dueMileage === ''} /><Field label="Due mileage (km)" type="number" min={0} max={10000000} value={reminder.dueMileage} onChange={v => setReminder({ ...reminder, dueMileage: v })} /><Button>Save reminder</Button>
  </fieldset></form></section></div>
  <section className="panel"><h2>{t('Maintenance reminders')}</h2>{resource.data?.reminders.length === 0 && <p>{t('No reminders')}</p>}{resource.data?.reminders.map(r => <article key={r.id}><h3>{r.title}</h3><p>{r.dueDate ? localTime(r.dueDate) : ''} {r.dueMileage != null ? `${r.dueMileage} km` : ''}</p>{r.isCompleted ? <p>{t('Completed')}</p> : <Button disabled={busy} onClick={() => save(`reminders/${r.id}/complete`, undefined, 'PATCH')}>Mark completed</Button>}</article>)}</section>
  </>;
}
