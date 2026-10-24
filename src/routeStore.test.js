/** @vitest-environment jsdom */
import { afterEach, expect, it, vi } from 'vitest';
import { setLanguage } from './i18n';
import { setDiagnosticDraftDirty } from './diagnosticDraftGuard';
import { navigate, readRoute, subscribeRoute } from './routeStore';

afterEach(() => {
  setDiagnosticDraftDirty('test-draft', false);
  vi.restoreAllMocks();
});

it('keeps the current hash route when a dirty diagnostic draft is not discarded', () => {
  setLanguage('en');
  window.history.replaceState(null, '', '#/diagnostics/3');
  setDiagnosticDraftDirty('test-draft', true);
  vi.spyOn(window, 'confirm').mockReturnValue(false);
  const changed = vi.fn();
  const unsubscribe = subscribeRoute(changed);
  window.history.replaceState(null, '', '#/vehicles');
  window.dispatchEvent(new Event('hashchange'));
  expect(readRoute()).toBe('diagnostics/3');
  expect(changed).not.toHaveBeenCalled();
  unsubscribe();
});

it('allows hash navigation after the user discards the draft', () => {
  setLanguage('en');
  window.history.replaceState(null, '', '#/diagnostics');
  setDiagnosticDraftDirty('test-draft', true);
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  const changed = vi.fn();
  const unsubscribe = subscribeRoute(changed);
  window.history.replaceState(null, '', '#/vehicles');
  window.dispatchEvent(new Event('hashchange'));
  expect(readRoute()).toBe('vehicles');
  expect(changed).toHaveBeenCalledOnce();
  unsubscribe();
});

it('emits one route change for programmatic navigation', () => {
  window.history.replaceState(null, '', '#/home');
  const changed = vi.fn();
  const unsubscribe = subscribeRoute(changed);
  navigate('vehicles');
  expect(readRoute()).toBe('vehicles');
  expect(changed).toHaveBeenCalledOnce();
  unsubscribe();
});
