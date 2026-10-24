import { t } from './i18n';

const dirtyDrafts = new Set();

export function setDiagnosticDraftDirty(key, dirty) {
  if (dirty) dirtyDrafts.add(key);
  else dirtyDrafts.delete(key);
}

export function hasDiagnosticDrafts() {
  return dirtyDrafts.size > 0;
}

export function confirmDiscardDiagnosticDrafts() {
  if (!hasDiagnosticDrafts()) return true;
  const confirmed = window.confirm(t('Discard unsaved changes?'));
  if (confirmed) dirtyDrafts.clear();
  return confirmed;
}
