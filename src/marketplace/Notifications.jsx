import { NotificationItem, SectionHeader, EmptyState } from '../components/ui';
import { useEffect, useState } from 'react';
import { apiRequest, handleRequestError } from '../api';
import { t } from '../i18n';
import { Feedback, Button } from './common';
import { useResource, localTime, notifyChanged } from './hooks';

export function NotificationLink({ active = false }) {
  const [count, setCount] = useState(null);
  useEffect(() => {
    let active = true;
    const load = () => apiRequest('/api/notifications?page=1').then(data => { if (active) setCount(data.unreadCount); }).catch(() => { if (active) setCount(null); });
    load(); const timer = setInterval(load, 60000); window.addEventListener('notifications-changed', load);
    return () => { active = false; clearInterval(timer); window.removeEventListener('notifications-changed', load); };
  }, []);
  return <a className="nav-link" aria-current={active ? "page" : undefined} href="#/notifications">{t('Notifications')}{count > 0 ? ` (${count})` : ''}</a>;
}
export default function Notifications({ onSessionExpired }) {
  const [page, setPage] = useState(1); const resource = useResource(`/api/notifications?page=${page}`, onSessionExpired);
  const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  return <section className="marketplace"><SectionHeader title="Notifications" description="Your bookings and vehicle updates, in one place." /><Feedback resource={resource} message={message} /><p>{t('Unread')}: {resource.data?.unreadCount ?? '—'}</p>
    {resource.data?.items.length === 0 && <EmptyState title="No notifications" description="New updates will appear here." />}
    {resource.data?.items.map(n => <NotificationItem key={n.id} notification={n} timestamp={localTime(n.createdAt)} busy={busy} onRead={async () => { if (busy) return; setBusy(true); try { await apiRequest(`/api/notifications/${n.id}/read`, { method: 'PATCH' }); resource.reload(); notifyChanged(); } catch (error) { setMessage(handleRequestError(error, onSessionExpired, t('Request failed'))); } finally { setBusy(false); } }} />)}
    <div className="market-actions"><Button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button><Button disabled={resource.data?.items.length !== 50} onClick={() => setPage(p => p + 1)}>Next</Button><Button onClick={resource.reload}>Refresh</Button></div>
  </section>;
}
export function ReviewModeration({ onSessionExpired }) {
  const resource = useResource('/api/reviews/moderation', onSessionExpired); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  return <section className="marketplace"><h1>{t('Review moderation')}</h1><Feedback resource={resource} message={message} />{resource.data?.map(r => <article key={r.id} className="panel"><p>{r.rating}/5 · #{r.mechanicProfileId}</p><p>{r.comment}</p><Button disabled={busy} onClick={async () => { setBusy(true); try { await apiRequest(`/api/reviews/${r.id}/moderation`, { method: 'PATCH', body: { isHidden: !r.isHidden } }); resource.reload(); } catch (error) { setMessage(handleRequestError(error, onSessionExpired, t('Request failed'))); } finally { setBusy(false); } }}>{r.isHidden ? 'Show review' : 'Hide review'}</Button></article>)}</section>;
}
