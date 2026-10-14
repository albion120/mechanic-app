import { t } from "../i18n";
import LanguageSelector from "../components/LanguageSelector";
const services = [
  {
    icon: "🚘",
    title: "Menaxho veturat",
    description: "Mbaji të dhënat e veturave në një vend dhe gjej shpejt informacionin që të duhet.",
  },
  {
    icon: "🗓️",
    title: "Organizo terminet",
    description: "Krijo dhe përcill terminet e servisit për secilën veturë.",
  },
  {
    icon: "🩺",
    title: "Kupto problemet",
    description: "Përshkruaj simptomat ose analizo një kod OBD-II për udhëzime paraprake.",
  },
  {
    icon: "📍",
    title: "Gjej servise pranë",
    description: "Kërko servise të shënuara në OpenStreetMap, vetëm kur zgjedh të ndash lokacionin.",
  },
];

function Landing({ onLogin, onRegister, onFindMechanics, onAbout }) {
  return (
    <div className="landing-page">
      <header className="landing-header">
        <a className="brand" href="#home" aria-label={t("MechanicApp, faqja kryesore")}>
          <span className="brand-mark" aria-hidden="true">M</span>
          <span>Mechanic<span className="brand-accent">App</span></span>
        </a>
        <nav className="landing-nav" aria-label={t("Navigimi publik")}>
          <a href="#sherbimet">{t("Shërbimet")}</a>
          <button className="nav-link" onClick={onAbout}>{t("Si funksionon")}</button>
          <button className="nav-link" onClick={onFindMechanics}>{t("Mekanikë pranë")}</button>
        </nav>
        <div className="landing-actions">
          <LanguageSelector />
          <button className="button button-quiet" onClick={onLogin}>{t("Kyçu")}</button>
          <button className="button button-primary" onClick={onRegister}>{t("Krijo llogari")}</button>
        </div>
      </header>

      <main id="home">
        <section className="landing-hero">
          <div className="landing-hero-content">
            <span className="eyebrow">{t("MECHANICAPP · KUJDESI PËR VETURËN TËNDE")}</span>
            <h1>{t("Mirëmbajtja e veturës, më e thjeshtë.")}</h1>
            <p>{t("Menaxho veturat dhe terminet, kupto më mirë sinjalet e veturës dhe gjej servise pranë teje — në një vend të vetëm.")}</p>
            <div className="landing-hero-actions">
              <button className="button button-primary" onClick={onFindMechanics}>{t("Gjej mekanikë pa llogari")}</button>
              <a className="button button-quiet" href="#sherbimet">{t("Shiko shërbimet")}</a>
            </div>
            <p className="landing-public-note">{t("Kërko servise dhe përkthe simptomat pa llogari. Kyçu për veturat, terminet dhe historikun.")}</p>
          </div>
          <div className="landing-hero-art" aria-hidden="true">
            <div className="hero-orbit hero-orbit-one" />
            <div className="hero-orbit hero-orbit-two" />
            <div className="hero-car">🚗</div>
            <div className="hero-status-card"><span>✓</span><div><strong>{t("Kujdesi nën kontroll")}</strong><small>{t("Veturat · Terminet · Diagnostikimi")}</small></div></div>
            <span className="hero-spark hero-spark-one">✳</span>
            <span className="hero-spark hero-spark-two">✦</span>
          </div>
        </section>

        <section className="landing-services" id="sherbimet">
          <div className="landing-section-heading">
            <span className="eyebrow">{t("ÇFARË MUND TË BËSH")}</span>
            <h2>{t("Gjithçka për shërbimet e veturës, në një vend")}</h2>
            <p className="muted">{t("Shiko çfarë ofron MechanicApp. Për t'i ruajtur të dhënat dhe për të vazhduar me shërbimet, kyçu ose krijo llogari.")}</p>
          </div>
          <div className="landing-service-grid">
            {services.map((service) => (
              <article className="landing-service-card" key={t(service.title)}>
                <span className="landing-service-icon" aria-hidden="true">{service.icon}</span>
                <h3>{service.title}</h3>
                <p>{t(service.description)}</p>
                <button className="landing-card-link" onClick={service.icon === "📍" ? onFindMechanics : onRegister}>
                  {service.icon === "📍" ? t("Gjej mekanikë pa llogari") : t("Provoje pas regjistrimit")} <span aria-hidden="true">→</span>
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-how" id="si-funksionon">
          <div>
            <span className="eyebrow">{t("FILLIM I LEHTË")}</span>
            <h2>{t("Gati për ta pasur kujdesin e veturës më të organizuar?")}</h2>
            <p>{t("Krijo llogarinë tënde, shto veturën dhe përdor shërbimet sipas nevojës.")}</p>
          </div>
          <button className="button button-primary" onClick={onRegister}>{t("Krijo llogari")}</button>
        </section>
      </main>

      <footer className="landing-footer">
        <a className="brand" href="#home">
          <span className="brand-mark" aria-hidden="true">M</span>
          <span>Mechanic<span className="brand-accent">App</span></span>
        </a>
        <span>{t("Menaxhimi i servisit, më i thjeshtë.")}</span>
      </footer>
    </div>
  );
}

export default Landing;
