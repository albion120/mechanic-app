import { useCallback, useState } from 'react';
import { AI_ENABLED } from '../features';
import { dateLocale, t } from '../i18n';
import { useResource, localTime } from '../marketplace/hooks';
import { Feedback } from '../marketplace/common';
import { Badge, EmptyState, SectionHeader } from '../components/ui';
import ManualDiagnosticForm from '../components/ManualDiagnosticForm';
import DiagnosticReportActions from '../components/DiagnosticReportActions';

const recorded = value => value === null || value === undefined || value === '' ? t('Not recorded') : value;
const number = value => new Intl.NumberFormat(dateLocale()).format(value);

export default function DiagnosticArchive({ initialVehicleId = '', onSessionExpired, onBookService }) {
  const vehicles = useResource('/api/vehicles', onSessionExpired);
  const [chosenVehicleId, setChosenVehicleId] = useState();
  const [query, setQuery] = useState('');
  const [order, setOrder] = useState('newest');
  const [newReportOpen, setNewReportOpen] = useState(false);
  const [drafts, setDrafts] = useState({});
  const onDraftChange = useCallback((key, dirty) => setDrafts(previous => {
    if (!!previous[key] === dirty) return previous;
    const next = { ...previous };
    if (dirty) next[key] = true;
    else delete next[key];
    return next;
  }), []);
  const hasDraft = Object.keys(drafts).length > 0;
  const automaticVehicleId = vehicles.data?.some(item => String(item.id) === String(initialVehicleId))
    ? String(initialVehicleId)
    : vehicles.data?.length === 1 ? String(vehicles.data[0].id) : '';
  const vehicleId = chosenVehicleId === undefined ? automaticVehicleId : chosenVehicleId;
  const vehicle = vehicles.data?.find(v => String(v.id) === vehicleId);
  const history = useResource(vehicle ? `/api/diagnostics/vehicles/${vehicleId}` : null, onSessionExpired);
  const care = useResource(vehicle ? `/api/vehicles/${vehicleId}/care` : null, onSessionExpired);
  const mileageRecord = care.data?.records?.filter(r => r.mileage != null).sort((a, b) => new Date(b.serviceDate) - new Date(a.serviceDate))[0];
  const search = query.trim().toLocaleLowerCase();
  const reports = (history.data || []).filter(item =>
    [item.diagnosticCode, item.userSymptoms, item.summary, item.recommendedAction].some(value => String(value || '').toLocaleLowerCase().includes(search))
  ).sort((a, b) => (new Date(b.createdAt) - new Date(a.createdAt)) * (order === 'newest' ? 1 : -1));
  const refreshReports = () => { setQuery(''); setOrder('newest'); history.reload(); };
  return <section className="marketplace"><SectionHeader title="Diagnostic archive" description="Save inspection reports manually and review previous reports for each vehicle." />
    <Feedback resource={vehicles} />
    {vehicles.data?.length === 0 && <div className="notice"><p>{t('Add a vehicle to view its diagnostic archive.')}</p><a href="#/vehicles">{t('Add a vehicle first')}</a></div>}
    <label className="field">{t('Vehicle')}<select value={vehicleId} onChange={e => {
      if (hasDraft && !window.confirm(t('Discard unsaved changes?'))) return;
      setChosenVehicleId(e.target.value); setQuery(''); setNewReportOpen(false);
    }}><option value="">{t('Choose vehicle')}</option>{vehicles.data?.map(v => <option key={v.id} value={v.id}>{v.brand} {v.model} ({v.year}) · {v.licensePlate}</option>)}</select></label>
    {vehicle && <section className="panel"><h2>{vehicle.brand} {vehicle.model}</h2><p>{t('Year')}: {recorded(vehicle.year)} · {t('License plate')}: {recorded(vehicle.licensePlate)}</p>
      <p className="muted">{t('Vehicle details reflect the current profile. Report measurements belong to their saved date.')}</p>
      {care.loading ? <p role="status">{t('Loading recorded mileage...')}</p> : care.error ? <p role="status">{t('Recorded mileage could not be loaded.')}</p> : <p>{t('Recorded mileage')}: {mileageRecord ? <>{number(mileageRecord.mileage)} km · <time dateTime={mileageRecord.serviceDate}>{localTime(mileageRecord.serviceDate)}</time></> : t('Not recorded')}</p>}
      <p className="muted">{t('Mileage comes from available service records, not a live odometer.')}</p>
      {AI_ENABLED && <a className="button button-primary" href={`#/ai/${vehicle.id}`}>{t('New assessment for this vehicle')}</a>}
    </section>}
    {vehicle && !newReportOpen && <div className="market-actions"><button className="button button-primary" onClick={() => setNewReportOpen(true)}>{t('Add manual report')}</button></div>}
    {vehicle && newReportOpen && <ManualDiagnosticForm key={vehicleId} vehicleId={vehicleId} onSaved={() => { setNewReportOpen(false); refreshReports(); }} onCancel={() => setNewReportOpen(false)} onSessionExpired={onSessionExpired} onDraftChange={onDraftChange} locked={hasDraft && !drafts[`vehicle-${vehicleId}`]} />}
    <Feedback resource={history} />{history.data?.length === 0 && <EmptyState title="No archived reports" />}
    {!!history.data?.length && <section className="panel">
      <label className="field">{t('Search reports')}<input type="search" disabled={hasDraft} value={query} onChange={e => setQuery(e.target.value)} placeholder={t('OBD code, symptoms or findings')} /></label>
      <label className="field">{t('Report order')}<select disabled={hasDraft} value={order} onChange={e => setOrder(e.target.value)}><option value="newest">{t('Newest first')}</option><option value="oldest">{t('Oldest first')}</option></select></label>
      <p role="status">{history.data.length === 1 ? t('Showing {shown} of 1 report', { shown: reports.length }) : t('Showing {shown} of {total} reports', { shown: reports.length, total: history.data.length })}</p>
      {hasDraft && <p className="muted">{t('Save or cancel your changes before using other archive controls.')}</p>}
      {query && <button className="button button-quiet" disabled={hasDraft} onClick={() => setQuery('')}>{t('Clear search')}</button>}
      {reports.length === 0 && <EmptyState title="No matching reports" />}
    </section>}
    <div className="diagnostic-history-list">{reports.map(item => <article className="panel diagnosis-card" key={item.id} aria-labelledby={`diagnostic-report-${item.id}`}>
      <Badge tone={item.source === 'Manual' ? 'green' : 'neutral'}>{t(item.source === 'Manual' ? 'Manual report' : 'Previous automatic report')}</Badge><h2 id={`diagnostic-report-${item.id}`}>{item.diagnosticCode || `${t('Manual report')} #${item.id}`}</h2><time dateTime={item.createdAt}>{localTime(item.createdAt)}</time>
      {item.updatedAt && item.updatedAt !== item.createdAt && <p className="muted">{t('Last updated')}: <time dateTime={item.updatedAt}>{localTime(item.updatedAt)}</time></p>}
      {item.source !== 'Manual' && item.urgency && <span className={`urgency-badge urgency-${item.urgency.toLowerCase()}`}>{t(item.urgency)}</span>}
      <h3>{t('Recorded symptoms')}</h3><p className="report-notes">{recorded(item.userSymptoms)}</p>
      {item.needsMoreInfo && <p className="notice">{t('This archived report was incomplete and requested more information.')}</p>}
      <h3>{t('Inspection findings')}</h3><p className="report-notes">{recorded(item.summary)}</p>{Array.isArray(item.possibleCauses) && item.possibleCauses.length > 0 && <section><h3>{t('Shkaqe të mundshme')}</h3><ul className="cause-list">{item.possibleCauses.map((cause, index) => <li key={index}>{cause}</li>)}</ul></section>}
      {Array.isArray(item.followUpQuestions) && item.followUpQuestions.length > 0 && <section><h3>{t('Questions saved with this report')}</h3><ul>{item.followUpQuestions.map((question, index) => <li key={index}>{question}</li>)}</ul></section>}
      {item.safetyAdvice && <section><h3>{t('Këshillë sigurie')}</h3><p className="report-notes">{item.safetyAdvice}</p></section>}<h3>{t('Recommended work')}</h3><p className="report-notes">{recorded(item.recommendedAction)}</p>
      {(item.rpm != null || item.coolantTemperature != null || item.batteryVoltage != null) && <section><h3>{t('Measurements at report time')}</h3><p>RPM: {item.rpm == null ? t('Not recorded') : number(item.rpm)}</p><p>{t('Coolant temperature')}: {item.coolantTemperature == null ? t('Not recorded') : `${number(item.coolantTemperature)} °C`}</p><p>{t('Battery voltage')}: {item.batteryVoltage == null ? t('Not recorded') : `${number(item.batteryVoltage)} V`}</p></section>}
      <DiagnosticReportActions report={item} vehicleId={vehicleId} onChanged={refreshReports} onSessionExpired={onSessionExpired} onDraftChange={onDraftChange} onBookService={onBookService} locked={hasDraft && !drafts[`report-${item.id}`]} />
    </article>)}</div>
    <div className="market-actions"><a href="#/care">{t('Vehicle history')}</a><a className="button button-quiet" href="#/partners">{t('Find a partner')}</a></div>
  </section>;
}
