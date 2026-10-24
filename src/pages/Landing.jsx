import { t } from '../i18n';
import LanguageSelector from '../components/LanguageSelector';
import HomeActions from '../components/HomeActions';
export default function Landing({ onLogin, onRegister, onFindMechanics, onAbout }) {
  return <div className="landing-page"><a className="skip-link" href="#main-content" onClick={e => { e.preventDefault(); document.getElementById("main-content")?.focus(); }}>{t('Skip to content')}</a><header className="landing-header">
    <a className="brand" href="#/home" aria-label={t('MechanicApp, faqja kryesore')}><span className="brand-mark" aria-hidden="true">M</span><span>Mechanic<span className="brand-accent">App</span></span></a>
    <nav className="landing-nav" aria-label={t('Navigimi publik')}><button className="nav-link" onClick={onFindMechanics}>{t('Find a mechanic')}</button><a className="nav-link" href="#/partners">{t('Partners')}</a><button className="nav-link" onClick={onAbout}>{t('Si funksionon')}</button></nav>
    <div className="landing-actions"><LanguageSelector /><button className="button button-quiet" onClick={onLogin}>{t('Kyçu')}</button><button className="button button-primary" onClick={onRegister}>{t('Krijo llogari')}</button></div>
  </header><main id="main-content" className="home-main" tabIndex={-1}><HomeActions /></main><footer className="landing-footer"><span className="brand">Mechanic<span className="brand-accent">App</span></span><span>{t('Asistencë për çdo udhëtim')}</span></footer></div>;
}
