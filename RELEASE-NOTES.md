# Development snapshot

React/Vite frontend for [MechanicApp.API](https://github.com/albion120/MechanicApp.API).

Includes public maps, location search, Albanian/English/German interface resources, problem translation, authenticated vehicles and appointments, AI follow-up questions, OBD history and responsive layout fixes.

Local verification: 31 frontend tests, 5 Chrome browser tests (320, 390, 768 and 1280 px layouts), lint and production build passed. npm audit reported zero vulnerabilities. Backend: 43 tests passed and isolated build succeeded. Physical phone testing remains outstanding.

## Known limitations

- Web app only; no native mobile build or offline mode.
- OBD readings are manually entered simulation data.
- OpenStreetMap shops do not support in-app booking. Appointments are personal plans, not bookings confirmed by an external business. Partner availability and booking integration remain future work.
- The local qwen3:8b evaluation produced poor Albanian mechanical terms and an inaccurate German translation. See AI-EVALUATION.json for synthetic examples. Structured JSON validation does not guarantee factual accuracy or faithful translation. Further AI quality work is required before production use.
- Local model responses took about 79–100 seconds. The critical safety guard responds without waiting for the model.
- Tokens use localStorage. Backend errors are not all localized. Multi-instance geocoding requires shared throttling/caching.

## Setup

Run `npm ci`, copy `.env.example` to `.env.local`, set `VITE_API_URL` to the backend origin, then run `npm run dev`. Follow the backend repository README for JWT, CORS and server-side AI provider configuration. Never put secrets in VITE variables.

Language resources: edit `scripts/translations.tsv`, then run `npm run translations:build`. Tests: `npm test`, `npm run lint`, `npm run build`, `npm run test:e2e` (installed Chrome required).
