import { t } from '../i18n';
import { LoadingState, Button } from '../components/ui';
export { Button } from '../components/ui';
export function Feedback({ resource, message }) {
  return <>{resource?.loading && <LoadingState />}{(resource?.error || message) && <p className="notice" role="alert">{resource?.error || message}</p>}{resource?.error && resource.reload && <Button type="button" variant="quiet" onClick={resource.reload} disabled={resource.loading}>Rifresko</Button>}</>;
}
export function Field({ label, value, onChange, type = 'text', ...props }) {
  return <label className="field">{t(label)}<input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} {...props} /></label>;
}
export function TextField({ label, value, onChange, ...props }) {
  return <label className="field">{t(label)}<textarea rows={3} value={value ?? ''} onChange={e => onChange(e.target.value)} {...props} /></label>;
}
