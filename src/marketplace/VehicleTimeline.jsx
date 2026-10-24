import { useState } from 'react';
import { Badge, StatusBadge } from '../components/ui';
import { t } from '../i18n';
import { useResource, localTime } from './hooks';
import { Feedback } from './common';

export default function VehicleTimeline({ vehicleId, onSessionExpired }) {
  const resource = useResource(`/api/vehicles/${vehicleId}/care/history`, onSessionExpired);
  const [filter, setFilter] = useState('All records');
  const kinds = { 'All records': null, 'Services': 'Service', 'Partner bookings': 'Booking', 'Legacy appointments': 'Appointment', 'OBD / diagnostics': 'Diagnostic' };
  const items = Array.isArray(resource.data) ? resource.data.filter(item => !kinds[filter] || item.kind === kinds[filter]) : [];
  return <section className="panel service-timeline"><h2>{t('Vehicle history')}</h2><p>{t('Latest 200 records across services, bookings and archived diagnostics.')}</p>
    <label className="field">{t('Record type')}<select value={filter} onChange={e => setFilter(e.target.value)}>{Object.keys(kinds).map(label => <option key={label} value={label}>{t(label)}</option>)}</select></label>
    <Feedback resource={resource} />
    {!resource.loading && !resource.error && items.length === 0 && <p>{t('No records in this category')}</p>}
    {items.map(item => <article className="timeline-record" key={`${item.kind}-${item.id}`}>
      <Badge>{t(item.kind === 'Diagnostic' ? 'OBD / diagnostics' : item.kind === 'Service' ? 'Services' : item.kind === 'Booking' ? 'Partner bookings' : 'Legacy appointments')}</Badge>
      <h3>{t(item.title)}</h3><time dateTime={item.date}>{localTime(item.date)}</time>
      {item.status && <StatusBadge status={item.status} />}<p>{item.description}</p>
      {item.mileage != null && <p>{item.mileage} km</p>}{item.cost != null && <p>{item.cost} {item.currency}</p>}
      {item.notes && <p>{item.notes}</p>}
      {item.kind === 'Diagnostic' && <><p>RPM: {item.rpm ?? '—'} · °C: {item.coolantTemperature ?? '—'} · V: {item.batteryVoltage ?? '—'}</p><a href={`#/diagnostics/${vehicleId}`}>{t('Diagnostic archive')}</a></>}
      {item.kind === 'Booking' && <a href="#/bookings">{t('Booking')} #{item.id}</a>}
    </article>)}
  </section>;
}
