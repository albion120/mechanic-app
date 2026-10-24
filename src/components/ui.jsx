import { t } from '../i18n';

const paths = {
  car: 'M3 15V9l2-5h14l2 5v6M3 10h18M5 15v3m14-3v3M6 13h2m8 0h2',
  pin: 'M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  tool: 'm14 6 4 4 3-3a7 7 0 0 1-9 9l-6 6-4-4 6-6a7 7 0 0 1 9-9Z',
  calendar: 'M4 5h16v16H4ZM8 2v6m8-6v6M4 10h16m-12 4h2m4 0h2m-8 4h2',
  shield: 'M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6ZM8 12l3 3 5-6',
  activity: 'M2 12h5l3-8 4 16 3-8h5',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  bell: 'M6 9a6 6 0 0 1 12 0v7l2 2H4l2-2Zm4 12h4',
  battery: 'M3 6h17v12H3Zm17 4h2v4h-2M6 12h4m-2-2v4m5-2h4',
  wheel: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  heat: 'M10 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0Zm2-4v8m5-12h3m-3 4h3',
  help: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9 9a3 3 0 1 1 5 2l-2 2m0 3v1',
  alert: 'm12 3 10 18H2ZM12 9v5m0 3v1',
  menu: 'M4 6h16M4 12h16M4 18h16',
};
export function Icon({ name = 'tool', className = '', ...props }) {
  return <svg className={`ui-icon ${className}`} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name] || paths.tool} /></svg>;
}
export function Button({ children, variant = 'primary', className = '', ...props }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{typeof children === 'string' ? t(children) : children}</button>;
}
export function Card({ children, className = '', ...props }) { return <article className={`panel ui-card ${className}`} {...props}>{children}</article>; }
export function Badge({ children, tone = 'neutral' }) { return <span className={`ui-badge ui-badge-${tone}`}>{children}</span>; }
export function StatusBadge({ status }) { return <strong className={`ui-badge status-${status?.toLowerCase()}`}>{t(status)}</strong>; }
export function SectionHeader({ title, description, eyebrow, action }) { return <div className="ui-section-header"><div>{eyebrow && <span className="eyebrow">{t(eyebrow)}</span>}<h1>{t(title)}</h1>{description && <p className="muted">{t(description)}</p>}</div>{action}</div>; }
export function EmptyState({ title, description, children }) { return <div className="ui-empty"><Icon name="help" /><h3>{t(title)}</h3>{description && <p>{t(description)}</p>}{children}</div>; }
export function LoadingState() { return <p className="ui-loading" role="status"><span className="spinner" aria-hidden="true" />{t('Loading...')}</p>; }
export function PartnerCard({ partner: p }) {
  return <Card className="partner-card"><div className="partner-card-top"><span className="ui-icon-tile"><Icon name="tool" /></span><Badge tone={p.isVerified ? 'green' : 'neutral'}>{t(p.isVerified ? 'Verified partner' : 'Not verified')}</Badge></div><h2>{p.businessName}</h2><p className="partner-meta"><Icon name="pin" />{p.address || t('Not provided')}</p><dl className="partner-facts"><div><dt>{t('Languages')}</dt><dd>{p.languages || t('Not provided')}</dd></div><div><dt>{t('Opening hours')}</dt><dd>{p.openingHours || t('Not provided')}</dd></div></dl><p className="muted">{t('Explore services, reviews and available times on the partner profile.')}</p><a className="button button-primary" href={`#/partners/${p.id}`}>{t('View partner')}<Icon name="arrow" /></a></Card>;
}
export function NotificationItem({ notification: n, timestamp, busy, onRead }) {
  return <Card className={`notification-item ${n.isRead ? 'is-read' : 'is-unread'}`}><span className="ui-icon-tile"><Icon name="bell" /></span><div className="notification-body"><div className="notification-meta"><Badge tone={n.isRead ? 'neutral' : 'green'}>{t(n.isRead ? 'Read' : 'Unread')}</Badge><time dateTime={n.createdAt}>{timestamp}</time></div><h2>{t(n.title)}</h2><p>{n.message}</p><div className="market-actions"><a href={n.type === 'MaintenanceReminder' ? '#/care' : '#/bookings'}>{t('View details')}</a>{!n.isRead && <Button variant="quiet" disabled={busy} onClick={onRead}>Mark as read</Button>}</div></div></Card>;
}
export function EmergencyActionCard({ icon, label, selected, onClick }) { return <button type="button" className={`emergency-action ${selected ? 'is-selected' : ''}`} aria-pressed={selected} onClick={onClick}><Icon name={icon} /><span>{t(label)}</span></button>; }
