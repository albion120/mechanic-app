import { useEffect, useRef, useState } from 'react';
import { apiRequest, handleRequestError } from '../api';
import { t } from '../i18n';
import ManualDiagnosticForm from './ManualDiagnosticForm';

export default function DiagnosticReportActions({ report, vehicleId, onChanged, onSessionExpired, onDraftChange, onBookService, locked = false }) {
  const [mode, setMode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const deleteButton = useRef(null);
  const editButton = useRef(null);
  const confirmButton = useRef(null);
  const reportLabel = report.diagnosticCode || `${t('Manual report')} #${report.id}`;
  useEffect(() => { if (mode === 'delete') confirmButton.current?.focus(); }, [mode]);
  async function remove() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await apiRequest(`/api/diagnostics/${report.id}`, { method: 'DELETE' });
      onChanged();
    } catch (err) {
      setError(handleRequestError(err, onSessionExpired, t('Request failed')));
      setBusy(false);
    }
  }
  if (mode === 'edit') return <ManualDiagnosticForm report={report} vehicleId={vehicleId}
    onDraftChange={onDraftChange} locked={locked}
    onSessionExpired={onSessionExpired} onCancel={() => { setMode(''); setTimeout(() => editButton.current?.focus()); }}
    onSaved={() => { setMode(''); onChanged(); }} />;
  return <div className="market-actions">
    {mode === 'delete' ? <div role="alertdialog" aria-labelledby={`delete-report-${report.id}`}>
      <p id={`delete-report-${report.id}`}>{t('Delete this report permanently? This cannot be undone.')}</p>
      <button ref={confirmButton} className="button button-danger" disabled={busy || locked} onClick={remove}>{t(busy ? 'Deleting report...' : 'Confirm deletion')}</button>
      <button className="button button-quiet" disabled={busy} onClick={() => { setMode(''); setError(''); setTimeout(() => deleteButton.current?.focus()); }}>{t('Cancel')}</button>
    </div> : <>
      {report.source === 'Manual' && <button ref={editButton} className="button button-quiet" aria-label={`${t('Edit report')}: ${reportLabel}`} disabled={locked} onClick={() => setMode('edit')}>{t('Edit report')}</button>}
      {onBookService && <button className="button button-primary" aria-label={`${t('Plan service for this report')}: ${reportLabel}`} disabled={locked} onClick={() => onBookService(Number(vehicleId), report.recommendedAction || report.summary || report.userSymptoms || t('Diagnostic report'), report.id)}>{t('Plan service for this report')}</button>}
      <button ref={deleteButton} className="button button-quiet" aria-label={`${t('Delete report')}: ${reportLabel}`} disabled={locked} onClick={() => setMode('delete')}>{t('Delete report')}</button>
    </>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
