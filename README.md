# MechanicApp

Frontend i MechanicApp është ndërtuar me React dhe Vite. Ai lidhet me API-n
ASP.NET Core dhe ofron regjistrimin/hyrjen, menaxhimin e veturave, terminet e
servisit, panelin e administratorit dhe arkivin manual të diagnostikimeve.

## Nisja lokale

1. Në VS Code, nis task-un `MechanicApp: Nise API-në lokale` (Ctrl+Shift+P →
   `Tasks: Run Task`). Ai përdor HTTP lokal dhe një çelës JWT zhvillimi të
   rastësishëm vetëm për procesin. Lëre terminalin hapur.
2. Nis task-un `MechanicApp: Nise frontend-in` në një terminal tjetër. Herën e
   parë, instalo varësitë me `npm install` para se ta nisësh.

   ```sh
   npm install
   npm run dev
   ```

3. Hape URL-në që shfaq Vite, zakonisht `http://localhost:5173/`. API-ja
   përdor `http://localhost:5180`; Swagger zhvillimi hapet te
   `http://localhost:5180/swagger/index.html`. Për nisjen lokale nuk nevojitet
   certifikatë HTTPS.

API-ja parazgjedhje është `http://localhost:5180`. Për backend tjetër, kopjo
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
- Arkivi i diagnostikimeve: krijim manual i raportit me simptoma, gjetje,
  rekomandime dhe kod opsional OBD-II; kërkim, renditje, ndryshim dhe fshirje
  e raporteve manuale sipas veturës.
- Mekanikë pranë: kërkim me emër servisi/adresë ose me pikë të zgjedhur në hartë,
  lokacion me leje të qartë, kalim mes hartës së rrugëve dhe pamjes satelitore,
  shenja për serviset reale dhe fokusim në hartë.
- UI responsive për telefon dhe desktop.
- Teste automatike për kërkesat API, arkivin dhe trajtimin e gabimeve.

AI dhe përkthimi automatik me AI janë të çaktivizuara. Raportet krijohen nga
përdoruesi dhe ndërfaqja është e përkthyer në shqip, anglisht dhe gjermanisht.

Leximi OBD-II është simulim nga vlerat e futura manualisht; ende nuk lidhet me
adapter fizik OBD. Kërkimi i mekanikëve përdor OpenStreetMap. Të dhënat e
hartës mund të jenë jo të plota ose të vjetruara, prandaj konfirmo detajet me
servisin. Për kërkim më të gjerë, faqja e serviseve ofron edhe lidhje të
drejtpërdrejtë për të kërkuar të njëjtën zonë ose servis në Google Maps. Harta e
rrugëve përdor OpenStreetMap; pamja satelitore dhe burimet atribuohen te Esri
dhe kontribuesit e të dhënave siç tregohet në hartë.

Udhëzimet e backend-it gjenden në `../../MechanicApp.API/README.md`. Publikimi
online është përgatitur për Render me konfigurimin në `render.yaml`. Së pari
duhet vendosur frontend-i në një repository GitHub dhe krijuar Static Site-i;
pastaj krijohet API-ja me Blueprint nga repository i backend-it. Vendos URL-të
reale të shërbimeve në Render. Varianti pa pagesë përdor PostgreSQL të jashtëm
për ruajtjen e të dhënave, sepse skedarët lokalë të serverit falas humbin pas
restartit. Plani falas është i përshtatshëm për pilot dhe trafik modest.

## Verifikimi

```sh
npm test
npm run lint
npm run build
```
