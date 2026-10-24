import { lazy, Suspense, useState } from 'react';
import { EmergencyActionCard } from '../components/ui';
import { t } from '../i18n';

const NearbyMechanics = lazy(() => import('./NearbyMechanics'));
const problems = [['car', 'Car will not start'], ['wheel', 'Flat tire'], ['battery', 'Battery'], ['activity', 'Check Engine'], ['heat', 'Overheating'], ['activity', 'Strange noise'], ['alert', 'Accident / unsafe situation'], ['help', 'I am not sure']];

export default function Roadside() {
  const [problem, setProblem] = useState('');
  const [searching, setSearching] = useState(false);
  if (searching) return <><button className="button button-quiet" onClick={() => setSearching(false)}>{t('Back to problem selection')}</button><p className="notice">{t(problem)}</p><Suspense fallback={<p role="status">{t('Loading...')}</p>}><NearbyMechanics emergency /></Suspense></>;
  return <section className="marketplace emergency-panel">
    <h1>{t('I need help now')}</h1>
    <h2>{t('What is happening?')}</h2>
    <p>{t('Choose a problem, then find local help. Your location is shared only when you choose.')}</p>
    <div className="emergency-grid">{problems.map(([icon, label]) => <EmergencyActionCard key={label} icon={icon} label={label} selected={problem === label} onClick={() => setProblem(label)} />)}</div>
    {problem && <section className="panel" aria-live="polite">
      <h2>{t(problem)}</h2>
      <p>{t(problem === 'Accident / unsafe situation' ? 'For immediate danger, contact local emergency services. This app cannot dispatch emergency help.' : 'If the vehicle may be unsafe, stop in a safe place and arrange assistance. Do not continue just to reach a workshop.')}</p>
      <p>{t('Search your location below to find contact details. Confirm that the workshop can help with your problem.')}</p>
      <div className="market-actions"><button className="button button-primary" onClick={() => setSearching(true)}>{t('Choose a location')}</button><a className="button button-quiet" href="#/partners">{t('Find a partner')}</a></div>
    </section>}
  </section>;
}
