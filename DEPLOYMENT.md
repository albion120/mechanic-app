# Frontend release

Deploy this folder as a Render Static Site using `render.yaml`. Do not upload the parent workspace or `.env.local`.

Set `VITE_API_URL` to the real public HTTPS backend **origin**, for example `https://your-api.onrender.com`, without `/api` or `/swagger`. It is embedded at build time; redeploy the frontend whenever it changes. Set the backend's `Cors__AllowedOrigins__0` to the exact frontend origin, without a trailing slash.

The hosting build command is `npm ci && npm run build:production`, publishing `dist`. The production command rejects missing, localhost, insecure HTTP, credential-bearing and path-bearing API URLs. `npm run build` remains available for local development and is not the release gate. Example origins used by tests are not live API services.

Use Node 22. AI and automatic AI translation are disabled; the manual diagnostic archive and the built-in Albanian, English, and German interface remain available. The static hosting configuration includes security headers and revalidation for the entry HTML. Hash routes do not require server-side rewrites.

Run `npm test -- --maxWorkers=2`, `npm run lint`, `npm run test:e2e -- e2e/layout.spec.js`, and a production build with your real API origin. The local release checks on 23 October 2026 passed 89 frontend tests, lint, the production-config build, and five responsive browser scenarios at 320, 390, 768, and 1280 pixels. After deploying, verify registration/login, vehicles, the manual diagnostic archive, personal appointments, map search, and partner bookings against the hosted backend. The completed local integration tests used synthetic data; no real customer data is included in this release.

No hosting account, public domain, real credentials, or verified business listings are bundled. GitHub Actions checks are included; they will run after the source is pushed to GitHub. The public deployment has not been performed or verified.

References: [Render static sites](https://render.com/docs/static-sites), [static response headers](https://render.com/docs/static-site-headers).
