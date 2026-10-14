# MechanicApp

Frontend i MechanicApp është ndërtuar me React dhe Vite. Ai lidhet me API-n
ASP.NET Core dhe ofron regjistrimin/hyrjen, menaxhimin e veturave, terminet e
servisit, panelin e administratorit dhe diagnostikim informues me AI.

## Nisja lokale

1. Configure and start the ASP.NET Core backend using its [README](https://github.com/albion120/MechanicApp.API#readme).
2. Run `npm ci` and `npm run dev` in this repository.
3. Open the local URL printed by Vite.

API-ja parazgjedhje është `https://localhost:7163`. Për backend tjetër, kopjo
`.env.example` në `.env.local`, ndrysho `VITE_API_URL` në adresën bazë të API-së
dhe rinise Vite. Mos përfshi `/swagger/index.html` në këtë URL.

## Funksionet

- Faqe publike me përshkrim të shërbimeve, e hapur pa llogari; veçoritë personale
  kërkojnë kyçje ose regjistrim.

- Regjistrim dhe hyrje me JWT; token-i dërgohet si Bearer në kërkesat e mbrojtura.
- Vetura: listim, shtim, përditësim dhe fshirje.
- Termine: listim, krijim, përditësim dhe fshirje.
- Admin: përmbledhje e termineve dhe ndryshim i statusit në `Pending`,
  `InProgress`, `Completed` ose `Cancelled`.
- Diagnostikimi OBD-II: kod i futur nga përdoruesi, vlera opsionale të
  sensorëve, analizë AI me pyetje sqaruese dhe historik i ruajtur sipas veturës.
- Mekanikë pranë: kërkim me emër servisi/adresë ose me pikë të zgjedhur në hartë,
  lokacion me leje të qartë, kalim mes hartës së rrugëve dhe pamjes satelitore,
  shenja për serviset reale dhe fokusim në hartë.
- UI responsive për telefon dhe desktop.
- Teste automatike për kërkesat API, diagnostikimin dhe trajtimin e gabimeve.

Asistenti AI përdor endpoint-in e backend-it `/api/ai/diagnose`. Zhvillimi lokal
përdor Ollama; publikimi kërkon konfigurimin e ofruesit dhe sekretet përkatëse
te backend-i. Çelësat nuk vendosen në frontend.
Kur përshkrimi i simptomës është i paqartë, asistenti kërkon hollësi shtesë
para se të paraqesë shkaqe të mundshme.

Leximi OBD-II është simulim nga vlerat e futura manualisht; ende nuk lidhet me
adapter fizik OBD. Kërkimi i mekanikëve përdor OpenStreetMap. Të dhënat e
hartës mund të jenë jo të plota ose të vjetruara, prandaj konfirmo detajet me
servisin. Për kërkim më të gjerë, faqja e serviseve ofron edhe lidhje të
drejtpërdrejtë për të kërkuar të njëjtën zonë ose servis në Google Maps. Harta e
rrugëve përdor OpenStreetMap; pamja satelitore dhe burimet atribuohen te Esri
dhe kontribuesit e të dhënave siç tregohet në hartë.

Udhëzimet e backend-it gjenden në [MechanicApp.API README](https://github.com/albion120/MechanicApp.API#readme). Publikimi
online është përgatitur për Render me konfigurimin në `render.yaml`. Së pari
duhet vendosur frontend-i në një repository GitHub dhe krijuar Static Site-i;
pastaj krijohet API-ja me Blueprint nga repository i backend-it. Vendos URL-të
reale të shërbimeve dhe sekretin OpenAI në Render. Backend-i përdor disk të
qëndrueshëm për SQLite, prandaj kërkon plan me pagesë.

## Verifikimi

```sh
npm test
npm run lint
npm run build
```

See [RELEASE-NOTES.md](RELEASE-NOTES.md) for verified changes and current limitations.
