import { useEffect, useState } from 'react';
import { apiRequest, handleRequestError } from '../api';
import { t, dateLocale } from '../i18n';

export function useResource(url, onSessionExpired) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    if (!url) return undefined;
    apiRequest(url).then(data => { if (active) setState({ url, revision, data, error: '', loading: false }); })
      .catch(error => { if (active) setState({ url, revision, data: null, loading: false, error: handleRequestError(error, onSessionExpired, t('Request failed')) }); });
    return () => { active = false; };
  }, [url, revision, onSessionExpired]);
  return { ...(state.url === url && state.revision === revision ? state : { data: null, error: '', loading: !!url }), reload: () => setRevision(n => n + 1) };
}
export function localTime(value) { return new Date(value).toLocaleString(dateLocale()); }
export const timezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
export const asUtc = value => new Date(value).toISOString();
export function notifyChanged() { window.dispatchEvent(new Event('notifications-changed')); }
