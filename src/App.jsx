import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import AiMechanic from "./pages/AiMechanic";
import AdminDashboard from "./pages/AdminDashboard";
import Appointments from "./pages/Appointments";
import Diagnostics from "./pages/Diagnostics";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import NearbyMechanics from "./pages/NearbyMechanics";
import Vehicles from "./pages/Vehicles";
import "./App.css";
import "./responsive.css";
import LanguageSelector from "./components/LanguageSelector";
import { t, useLanguage } from "./i18n";

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

const routes = new Set(["home", "about", "mechanics", "login", "register", "vehicles", "appointments", "ai", "diagnostics", "admin"]);
const readRoute = () => window.location.hash.replace(/^#\/?/, "") || "home";
const subscribeRoute = callback => { window.addEventListener("hashchange", callback); return () => window.removeEventListener("hashchange", callback); };
function navigate(page) { window.location.hash = "/" + page; window.dispatchEvent(new Event("hashchange")); }

function App() {
  const [session, setSession] = useState(readSession);
  const [bookingDraft, setBookingDraft] = useState(null);
  const [notice, setNotice] = useState("");
  const [returnPage, setReturnPage] = useState("vehicles");
  const route = useSyncExternalStore(subscribeRoute, readRoute);
  const language = useLanguage();
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  const page = routes.has(route) ? route : "home";
  const logout = useCallback(() => {
    localStorage.removeItem("token"); localStorage.removeItem("user");
    setSession(null); setBookingDraft(null); navigate("home");
  }, []);
  const sessionExpired = useCallback(() => {
    localStorage.removeItem("token"); localStorage.removeItem("user");
    setSession(null); setNotice(t("Sesioni ka skaduar. Hyr përsëri."));
  }, []);
  const login = (mode = "login", next = "vehicles") => { setReturnPage(next); navigate(mode); };
  const book = (vehicleId, description) => {
    setBookingDraft({ vehicleId, description }); navigate("appointments");
  };
  const isAdmin = session && getUserRole(session.user, session.token) === "admin";
  const protectedPage = ["vehicles", "appointments", "diagnostics", "ai", "admin"].includes(page);
  const menu = [["home", t("Kryefaqja")], ["mechanics", t("Mekanikë pranë")], ["vehicles", t("Vetura")], ["appointments", t("Terminet")], ["ai", t("AI Mechanic")], ["diagnostics", t("OBD-II")]];

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

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#/home"><span className="brand-mark">M</span><span>Mechanic<span className="brand-accent">App</span></span></a>
      <nav className="main-nav" aria-label={t("Navigimi kryesor")}>
        {menu.map(([key, label]) => <a key={key} className={page === key ? "nav-link active" : "nav-link"} href={"#/" + key} aria-current={page === key ? "page" : undefined}>{t(label)}</a>)}
        {isAdmin && <a className="nav-link" href="#/admin">{t("Admin")}</a>}
      </nav>
      <div className="account-menu"><LanguageSelector />
        {session ? <button className="button button-quiet button-small" onClick={logout}>{t("Dil")}</button> :
          <button className="button button-quiet button-small" onClick={() => login()}>{t("Kyçu")}</button>}
      </div>
    </header>
    <main className="page-content">
      {protectedPage && !session ? <section className="panel access-prompt">
        <h1>{t("Kyçja kërkohet")}</h1>
        <p>{notice || t("Veturat, terminet dhe historiku janë privatë. Kyçu për t'i ruajtur dhe menaxhuar në llogarinë tënde.")}</p>
        <div className="diagnostic-actions"><button className="button button-primary" onClick={() => login("login", page)}>{t("Kyçu")}</button>
          <button className="button button-quiet" onClick={() => login("register", page)}>{t("Krijo llogari")}</button>
          <a className="button button-quiet" href="#/mechanics">{t("Gjej mekanikë pa llogari")}</a></div>
      </section> : <>
        {(page === "home" || page === "vehicles") && <Vehicles onSessionExpired={sessionExpired} />}
        {page === "appointments" && <Appointments bookingDraft={bookingDraft} onSessionExpired={sessionExpired} />}
        {page === "ai" && <AiMechanic onSessionExpired={sessionExpired} onBookService={book} onFindMechanics={() => navigate("mechanics")} />}
        {page === "diagnostics" && <Diagnostics onSessionExpired={sessionExpired} onBookService={book} onFindMechanics={() => navigate("mechanics")} />}
        {page === "mechanics" && <NearbyMechanics />}
        {page === "admin" && (isAdmin ? <AdminDashboard onSessionExpired={sessionExpired} /> : <p role="alert" className="notice">{t("Kjo faqe është vetëm për administratorët.")}</p>)}
        {page === "about" && <section className="panel">
          <span className="eyebrow">MechanicApp</span><h1>{t("Si funksionon")}</h1>
          <ol className="follow-up-questions"><li>{t("Zgjidh një vend ose përdor vendndodhjen për të gjetur servise kudo në botë.")}</li>
            <li>{t("Shiko kontaktet dhe udhëzimet. Të dhënat publike mund të jenë të paplota.")}</li>
            <li>{t("Përkthe simptomat për mekanikun. AI jep orientim, jo diagnozë përfundimtare.")}</li>
            <li>{t("Kyçu për veturat dhe historikun. Rezervimi direkt kërkon partner të verifikuar.")}</li></ol>
          <a className="button button-primary" href="#/mechanics">{t("Gjej mekanikë pa llogari")}</a>
        </section>}
      </>}
    </main>
    <footer className="app-footer">{t("MechanicApp ·")}{t("Asistencë për çdo udhëtim")}</footer>
  </div>;
}

export default App;
