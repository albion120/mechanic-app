import { confirmDiscardDiagnosticDrafts } from './diagnosticDraftGuard';

export const readRoute = () => window.location.hash.replace(/^#\/?/, '') || 'home';

export const subscribeRoute = callback => {
  let acceptedRoute = readRoute();
  const onHashChange = () => {
    const nextRoute = readRoute();
    if (nextRoute !== acceptedRoute && !confirmDiscardDiagnosticDrafts()) {
      window.history.replaceState(null, '', `#/${acceptedRoute}`);
      return;
    }
    acceptedRoute = nextRoute;
    callback();
  };
  window.addEventListener('hashchange', onHashChange);
  return () => window.removeEventListener('hashchange', onHashChange);
};

export function navigate(page) {
  const target = `#/${page}`;
  if (window.location.hash === target) return;
  window.history.pushState(null, '', target);
  window.dispatchEvent(new Event('hashchange'));
}
