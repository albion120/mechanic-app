import { lazy, Suspense, useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { AI_ENABLED } from "./features";
import Roadside from "./pages/Roadside";
import DiagnosticArchive from "./pages/DiagnosticArchive";
import AiMechanic from "./pages/AiMechanic";
import AdminDashboard from "./pages/AdminDashboard";
import Appointments from "./pages/Appointments";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Vehicles from "./pages/Vehicles";
import "./App.css";
import "./responsive.css";
import LanguageSelector from "./components/LanguageSelector";
import { t, useLanguage } from "./i18n";
import { Partners, PartnerProfile } from "./marketplace/Partners";
import PartnerConsole from "./marketplace/PartnerConsole";
import Bookings from "./marketplace/Bookings";
import Notifications, { NotificationLink, ReviewModeration } from "./marketplace/Notifications";
import VehicleCare from "./marketplace/VehicleCare";
import "./marketplace/marketplace.css";
import HomeActions from './components/HomeActions';
import { Icon } from './components/ui';
import './design-system.css';
import { navigate, readRoute, subscribeRoute } from './routeStore';
import { confirmDiscardDiagnosticDrafts } from './diagnosticDraftGuard';
const NearbyMechanics = lazy(() => import('./pages/NearbyMechanics'));

function readSession() {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    return {
      token,
      user: JSON.parse(localStorage.getItem("user") || "null"),
    };
  } catch (error) {
    console.error("Could not read the saved user session.", error);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return null;
  }
}

function getUserRole(user, token) {
  const directRole = user?.role ?? user?.Role;
  if (typeof directRole === "string") return directRole.toLowerCase();

  try {
    const payloadPart = token.split(".")[1];
    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes));
    const role =
      payload.role ??
      payload.Role ??
      payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
    return typeof role === "string" ? role.toLowerCase() : "";
  } catch {
    return "";
  }
}

const routes = new Set(["home", "about", "mechanics", "login", "register", "vehicles", "appointments", "ai", "diagnostics", "admin", "partners", "partner-console", "bookings", "notifications", "reviews-admin", "care", "roadside"]);

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [session, setSession] = useState(readSession);
  const [bookingDraft, setBookingDraft] = useState(null);
  const [notice, setNotice] = useState("");
  const [returnPage, setReturnPage] = useState("vehicles");
  const route = useSyncExternalStore(subscribeRoute, readRoute);
  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [route]);
  const language = useLanguage();
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  const routeName = route.split('/')[0];
  const page = routes.has(routeName) ? routeName : "home";
  const aiVehicleId = /^ai\/[1-9]\d*$/.test(route) ? route.split("/")[1] : "";
  const diagnosticVehicleId = /^diagnostics\/[1-9]\d*$/.test(route) ? route.split("/")[1] : "";
  const partnerId = /^partners\/[1-9]\d*$/.test(route) ? Number(route.split('/')[1]) : null;
  const logout = useCallback(() => {
    if (!confirmDiscardDiagnosticDrafts()) return;
    localStorage.removeItem("token"); localStorage.removeItem("user");
    setSession(null); setBookingDraft(null); navigate("home");
  }, []);
  const sessionExpired = useCallback(() => {
    localStorage.removeItem("token"); localStorage.removeItem("user");
    setSession(null); setBookingDraft(null); setNotice(t("Sesioni ka skaduar. Hyr përsëri."));
  }, []);
  const login = (mode = "login", next = "vehicles") => { setReturnPage(next); navigate(mode); };
  const book = (vehicleId, description, diagnosticId = null) => {
    setBookingDraft({ vehicleId, description, diagnosticId }); navigate("partners");
  };
  const isAdmin = session && getUserRole(session.user, session.token) === "admin";
  const isMechanic = session && getUserRole(session.user, session.token) === "mechanic";
  const protectedPage = (page !== "ai" || AI_ENABLED) && ["vehicles", "appointments", "diagnostics", "ai", "admin", "partner-console", "bookings", "notifications", "reviews-admin", "care"].includes(page);
  const menu = [["home", t("Kryefaqja")], ["mechanics", t("Mekanikë pranë")], ["vehicles", t("Vetura")], ["appointments", t("Terminet")], ...(AI_ENABLED ? [["ai", t("AI Mechanic")]] : []), ["diagnostics", t("Diagnostic archive")]];

  if (page === "login" || page === "register") return <>
    <div className="auth-language"><LanguageSelector /></div>
    <Login key={page} initialMode={page} onBack={() => navigate("home")} onLogin={(user, token) => {
      setSession({ user, token }); setNotice(""); navigate(returnPage);
    }} />
  </>;
  if (page === "home" && !session) return <Landing
    onLogin={() => login()} onRegister={() => login("register")}
    onFindMechanics={() => navigate("mechanics")} onAbout={() => navigate("about")}
  />;

  return <div className="app-shell"><a className="skip-link" href="#main-content" onClick={e => { e.preventDefault(); document.getElementById("main-content")?.focus(); }}>{t("Skip to content")}</a>
    <header className="topbar">
      <a className="brand" href="#/home"><span className="brand-mark">M</span><span>Mechanic<span className="brand-accent">App</span></span></a>
      <button className="button button-quiet mobile-menu-toggle" aria-expanded={menuOpen} aria-controls="app-navigation" onClick={() => setMenuOpen(!menuOpen)}><Icon name="menu" />{t("Menu")}</button>
      <nav id="app-navigation" className={`main-nav ${menuOpen ? "is-open" : ""}`} onClick={e => { if (e.target.closest("a")) setMenuOpen(false); }} aria-label={t("Navigimi kryesor")}>
        {menu.map(([key, label]) => <a key={key} className={page === key ? "nav-link active" : "nav-link"} href={"#/" + key} aria-current={page === key ? "page" : undefined}>{t(label)}</a>)}
        {isAdmin && <a className="nav-link" aria-current={page === "admin" ? "page" : undefined} href="#/admin">{t("Admin")}</a>}
        <a className="nav-link" aria-current={page === "partners" ? "page" : undefined} href="#/partners">{t("Partners")}</a>
        <a className="nav-link" aria-current={page === "roadside" ? "page" : undefined} href="#/roadside">{t("I need help now")}</a>
        {session && <><a className="nav-link" aria-current={page === "bookings" ? "page" : undefined} href="#/bookings">{t("Partner bookings")}</a><a className="nav-link" aria-current={page === "care" ? "page" : undefined} href="#/care">{t("Service history")}</a><NotificationLink active={page === "notifications"} /></>}
        {(isAdmin || isMechanic) && <a className="nav-link" aria-current={page === "partner-console" ? "page" : undefined} href="#/partner-console">{t("Partner management")}</a>}
        {isAdmin && <a className="nav-link" aria-current={page === "reviews-admin" ? "page" : undefined} href="#/reviews-admin">{t("Review moderation")}</a>}
      </nav>
      <div className="account-menu"><LanguageSelector />
        {session ? <button className="button button-quiet button-small" onClick={logout}>{t("Dil")}</button> :
          <button className="button button-quiet button-small" onClick={() => login()}>{t("Kyçu")}</button>}
      </div>
    </header>
    <main key={route} id="main-content" className="page-content page-enter" tabIndex={-1}>
      <Suspense fallback={<p role="status">{t('Loading...')}</p>}>
      {protectedPage && !session ? <section className="panel access-prompt">
        <h1>{t("Kyçja kërkohet")}</h1>
        <p>{notice || t("Veturat, terminet dhe historiku janë privatë. Kyçu për t'i ruajtur dhe menaxhuar në llogarinë tënde.")}</p>
        <div className="diagnostic-actions"><button className="button button-primary" onClick={() => login("login", page)}>{t("Kyçu")}</button>
          <button className="button button-quiet" onClick={() => login("register", page)}>{t("Krijo llogari")}</button>
          <a className="button button-quiet" href="#/mechanics">{t("Gjej mekanikë pa llogari")}</a></div>
      </section> : <>
        {page === "home" && <HomeActions />}
        {page === "vehicles" && <Vehicles onSessionExpired={sessionExpired} />}
        {page === "appointments" && <Appointments bookingDraft={bookingDraft} onSessionExpired={sessionExpired} />}
        {page === "ai" && AI_ENABLED && <AiMechanic key={aiVehicleId} initialVehicleId={aiVehicleId} onSessionExpired={sessionExpired} onBookService={book} onFindMechanics={() => navigate("mechanics")} />}
        {page === "ai" && !AI_ENABLED && <section className="panel"><h1>{t("Automatic analysis is disabled")}</h1><p>{t("Describe your problem directly to a workshop.")}</p><a className="button button-primary" href="#/partners">{t("Find a partner")}</a></section>}
        {page === "diagnostics" && <DiagnosticArchive initialVehicleId={diagnosticVehicleId} onSessionExpired={sessionExpired} onBookService={book} />}
        {page === "mechanics" && <NearbyMechanics />}
        {page === "roadside" && <Roadside />}
        {page === "partners" && (partnerId ? <PartnerProfile key={`${partnerId}-${session?.user?.id || 'guest'}`} id={partnerId} session={session} draft={bookingDraft} onSessionExpired={sessionExpired} onLogin={() => login('login', route)} onBooked={() => { setBookingDraft(null); navigate('bookings'); }} /> : <Partners />)}
        {page === "bookings" && <Bookings user={session.user} onSessionExpired={sessionExpired} />}
        {page === "notifications" && <Notifications onSessionExpired={sessionExpired} />}
        {page === "care" && <VehicleCare onSessionExpired={sessionExpired} />}
        {page === "partner-console" && (isAdmin || isMechanic ? <PartnerConsole isAdmin={isAdmin} onSessionExpired={sessionExpired} /> : <p role="alert">{t('Mechanic access is required.')}</p>)}
        {page === "reviews-admin" && (isAdmin ? <ReviewModeration onSessionExpired={sessionExpired} /> : <p role="alert">{t('Admin access is required.')}</p>)}
        {page === "admin" && (isAdmin ? <AdminDashboard onSessionExpired={sessionExpired} /> : <p role="alert" className="notice">{t("Kjo faqe është vetëm për administratorët.")}</p>)}
        {page === "about" && <section className="panel">
          <span className="eyebrow">MechanicApp</span><h1>{t("Si funksionon")}</h1>
          <ol className="follow-up-questions"><li>{t("Zgjidh një vend ose përdor vendndodhjen për të gjetur servise kudo në botë.")}</li>
            <li>{t("Shiko kontaktet dhe udhëzimet. Të dhënat publike mund të jenë të paplota.")}</li>
            <li>{t("Describe your problem directly to a workshop.")}</li>
            <li>{t("Kyçu për veturat dhe historikun. Rezervimi direkt kërkon partner të verifikuar.")}</li></ol>
          <a className="button button-primary" href="#/mechanics">{t("Gjej mekanikë pa llogari")}</a>
        </section>}
      </>}
      </Suspense>
    </main>
    <nav className="mobile-quicknav" aria-label={t('Quick actions')}>{[['roadside', 'tool', 'I need help now'], ['mechanics', 'pin', 'Find a mechanic'], ['vehicles', 'car', 'My vehicle']].map(([target, icon, label]) => <a key={target} href={`#/${target}`} aria-current={page === target ? 'page' : undefined}><Icon name={icon} />{t(label)}</a>)}</nav>
    <footer className="app-footer">{t("MechanicApp ·")}{t("Asistencë për çdo udhëtim")}</footer>
  </div>;
}

export default App;
