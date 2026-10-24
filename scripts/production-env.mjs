import { loadEnv } from 'vite';
import { pathToFileURL } from 'node:url';

export function validateProductionApiUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('Set VITE_API_URL to the public HTTPS API origin before publishing.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash ||
      url.pathname !== '/' || /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(url.hostname) || url.hostname.endsWith('.localhost')) {
    throw new Error('VITE_API_URL must be a public HTTPS origin without credentials, paths, query strings or localhost.');
  }
  return url.origin;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  validateProductionApiUrl(loadEnv('production', process.cwd(), 'VITE_').VITE_API_URL);
  console.log('Production API origin validated.');
}
