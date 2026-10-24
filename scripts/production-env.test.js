import { expect, it } from 'vitest';
import { validateProductionApiUrl } from './production-env.mjs';

it.each([undefined, '', 'http://api.example.com', 'https://localhost:7163', 'https://127.0.0.1',
  'https://[::1]', 'https://user:secret@api.example.com', 'https://api.example.com/swagger',
  'https://api.example.com?token=secret', 'https://api.example.com/#/'])('rejects unsafe release API origin %s', value => {
  expect(() => validateProductionApiUrl(value)).toThrow();
});
it('accepts a public HTTPS API origin', () => {
  expect(validateProductionApiUrl('https://api.example.com/')).toBe('https://api.example.com');
});
