import { t } from '../i18n';
import { Icon } from './ui';
import { AI_ENABLED } from '../features';

export default function HomeActions() {
  const actions = [
    ['partners', 'tool', 'Partner workshops', 'Explore services and request an available time.'],
    ['mechanics', 'pin', 'Find a mechanic', 'Search real workshops, wherever you are.'],
    ['vehicles', 'car', 'My vehicle', 'Your vehicles and details in one place.'],
    ['bookings', 'calendar', 'My appointments', 'Follow your partner booking requests.'],
  ];
  return <div className="home-content">
    <section className="mobility-hero"><div className="hero-copy"><span className="eyebrow">{t('LOCAL WORKSHOPS. CLEAR BOOKINGS.')}</span><h1>{t('Mirëmbajtja e veturës, më e thjeshtë.')}</h1><p>{t('For drivers and local workshops in Kosovo. Find a partner, request an available time and follow your service.')}</p><a className="button button-primary help-cta" href="#/roadside"><Icon name="tool" />{t('I need help now')}<Icon name="arrow" /></a><span className="hero-caption">{t('Find nearby help without an account.')}</span></div>
      <div className="journey-panel"><span className="eyebrow">{t('YOUR NEXT STEP')}</span><h2>{t('A clearer route to car care')}</h2><ol><li><span>01</span><div><strong>{t('Describe the problem')}</strong><p>{t('Tell the workshop what you have noticed.')}</p></div></li><li><span>02</span><div><strong>{t('Choose your workshop')}</strong><p>{t('Compare real contacts and partner services.')}</p></div></li><li><span>03</span><div><strong>{t('Request a service')}</strong><p>{t('Your partner confirms the appointment.')}</p></div></li></ol></div>
    </section>
    <section id="sherbimet" aria-label={t('Choose your next step')} className="home-action-grid">{actions.map(([route, icon, title, description]) => <a className="home-action" href={`#/${route}`} key={route}><span className="ui-icon-tile"><Icon name={icon} /></span><h2>{t(title)}</h2><p>{t(description)}</p><Icon name="arrow" /></a>)}</section>
    {AI_ENABLED && <section className="home-partners"><div><h2>{t("AI Mechanic")}</h2><p>{t("Describe symptoms, answer follow-up questions, understand urgency and find real workshops.")}</p></div><a className="button button-quiet" href="#/ai">{t("Open AI assistant")}</a></section>}
    <section className="home-trust"><Icon name="shield" /><div><h2>{t('Clear information. Your decision.')}</h2><p>{t('Public map contacts come from OpenStreetMap. In-app bookings are available only with verified partners.')}</p></div></section>
    <section className="home-partners"><div><span className="eyebrow">MechanicApp Partners</span><h2>{t('Get to know your next workshop')}</h2><p>{t('See services, estimated prices and customer reviews before requesting a real available time.')}</p></div><a className="button button-quiet" href="#/partners">{t('Explore partners')}<Icon name="arrow" /></a></section>
  </div>;
}
