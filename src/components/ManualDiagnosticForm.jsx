import { useEffect, useRef, useState } from 'react';
import { apiRequest, handleRequestError } from '../api';
import { t } from '../i18n';
import { setDiagnosticDraftDirty } from '../diagnosticDraftGuard';

const empty = { symptoms: '', summary: '', diagnosticCode: '', recommendedAction: '' };
const validObdCode = /^[PBCU][0-3][0-9A-F]{3}$/;

export default function ManualDiagnosticForm({ vehicleId, report, onCancel, onSaved, onSessionExpired, onDraftChange, locked = false }) {
  const [initial] = useState(() => report ? {
    symptoms: report.userSymptoms || '', summary: report.summary || '',
    diagnosticCode: report.diagnosticCode?.trim().toUpperCase() || '', recommendedAction: report.recommendedAction || '',
  } : empty);
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [invalid, setInvalid] = useState([]);
  const symptomsRef = useRef(null);
  const summaryRef = useRef(null);
  const obdRef = useRef(null);
  const dirty = !saved && Object.keys(empty).some(key => form[key] !== initial[key]);
  const draftKey = report ? `report-${report.id}` : `vehicle-${vehicleId}`;
  useEffect(() => {
    onDraftChange?.(draftKey, dirty || saving);
    setDiagnosticDraftDirty(draftKey, dirty || saving);
    return () => {
      onDraftChange?.(draftKey, false);
      setDiagnosticDraftDirty(draftKey, false);
    };
  }, [draftKey, dirty, saving, onDraftChange]);
  useEffect(() => {
    if (!dirty && !saving) return undefined;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, saving]);
  function change(name, value) {
    setSaved(false);
    setInvalid(previous => previous.filter(field => field !== name));
    setForm(previous => ({ ...previous, [name]: value }));
  }
  async function submit(event) {
    event.preventDefault();
    if (saving) return;
    setError('');
    setSaved(false);
    const missing = ['symptoms', 'summary'].filter(name => !form[name].trim());
    const invalidObd = Boolean(form.diagnosticCode) && !validObdCode.test(form.diagnosticCode);
    if (missing.length || invalidObd) {
      setInvalid([...missing, ...(invalidObd ? ['diagnosticCode'] : [])]);
      setError(t(missing.length ? 'Enter symptoms and findings.' : 'Enter a valid OBD code, for example P0301.'));
      (missing[0] === 'symptoms' ? symptomsRef : missing[0] === 'summary' ? summaryRef : obdRef).current?.focus();
      return;
    }
    setSaving(true);
    try {
      await apiRequest(report ? `/api/diagnostics/${report.id}` : '/api/diagnostics/manual', { method: report ? 'PATCH' : 'POST', body: {
        ...(report ? { version: report.version } : { vehicleId: Number(vehicleId) }), symptoms: form.symptoms.trim(), summary: form.summary.trim(),
        diagnosticCode: form.diagnosticCode.trim().toUpperCase() || null,
        recommendedAction: form.recommendedAction.trim(),
      } });
      setForm(empty);
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(handleRequestError(err, onSessionExpired, t('Request failed')));
    } finally { setSaving(false); }
  }
  return <form className="panel" noValidate onSubmit={submit}>
    <h2>{t(report ? 'Edit report' : 'New manual report')}</h2>
    <p className="muted">{t('Record symptoms and inspection findings. No automatic diagnosis is performed.')}</p>
    <fieldset disabled={saving || locked}>
      {[
        ['symptoms', 'Recorded symptoms', 1500, true],
        ['summary', 'Inspection findings', 3000, true],
        ['recommendedAction', 'Recommended work', 3000, false],
      ].map(([name, label, maxLength, required]) => <label className="field" key={name}>{t(label)}
        <textarea ref={name === 'symptoms' ? symptomsRef : name === 'summary' ? summaryRef : undefined} autoFocus={Boolean(report) && name === 'symptoms'} rows={3} required={required} maxLength={maxLength} aria-invalid={invalid.includes(name) || undefined} aria-describedby={invalid.includes(name) ? `manual-report-error-${draftKey}` : undefined} value={form[name]} onChange={e => change(name, e.target.value)} />
      </label>)}
      <label className="field">{t('OBD code (optional)')}<input ref={obdRef} aria-label={t('OBD code (optional)')} maxLength={5} pattern="[PpBbCcUu][0-3][0-9A-Fa-f]{3}" placeholder="P0301" aria-invalid={invalid.includes('diagnosticCode') || undefined} aria-describedby={`obd-help-${draftKey}${invalid.includes('diagnosticCode') ? ` manual-report-error-${draftKey}` : ''}`} value={form.diagnosticCode} onChange={e => change('diagnosticCode', e.target.value.trim().toUpperCase())} /><small id={`obd-help-${draftKey}`} className="muted">{t('Use five characters, for example P0301.')}</small></label>
      <button className="button button-primary" type="submit">{t(saving ? 'Saving report...' : 'Save report')}</button>
      {!onCancel && dirty && <button className="button button-quiet" type="button" onClick={() => {
        if (!window.confirm(t('Discard unsaved changes?'))) return;
        setForm(initial); setSaved(false); setError('');
      }}>{t('Clear form')}</button>}
      {onCancel && <button className="button button-quiet" type="button" onClick={() => { if (!dirty || window.confirm(t('Discard unsaved changes?'))) onCancel(); }}>{t('Cancel')}</button>}
    </fieldset>
    {error && <p id={`manual-report-error-${draftKey}`} role="alert">{error}</p>}
    {saved && <p role="status">{t('Report saved in the archive.')}</p>}
  </form>;
}
