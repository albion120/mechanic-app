import { t } from "../i18n";
import { useState } from "react";
import { apiRequest } from "../api";

function EyeIcon({ crossed = false }) {
  return (
    <svg
      aria-hidden="true"
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {crossed ? (
        <>
          <path d="m3 3 18 18" />
          <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
          <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 8.3 4.1 9 7-.2 1.1-.9 2.3-2 3.4" />
          <path d="M6.2 6.2C4.4 7.4 3.3 9.3 3 12c.7 2.9 4 7 9 7 1 0 2-.2 2.9-.5" />
        </>
      ) : (
        <>
          <path d="M3 12c.7-2.9 4-7 9-7s8.3 4.1 9 7c-.7 2.9-4 7-9 7s-8.3-4.1-9-7Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}

function Login({ onLogin, onBack, initialMode = "login" }) {
  const [isRegistering, setIsRegistering] = useState(initialMode === "register");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isLoading) return;

    if (isRegistering && password !== confirmPassword) {
      setMessage(t("Fjalëkalimet nuk përputhen."));
      return;
    }
    if (isRegistering && password.length < 8) {
      setMessage(t("Fjalëkalimi duhet të ketë së paku 8 karaktere."));
      return;
    }

    setIsLoading(true);
    setMessage("");
    let registrationComplete = false;

    try {
      if (isRegistering) {
        await apiRequest("/api/users/register", {
          method: "POST",
          body: { fullName: fullName.trim(), email: email.trim(), password },
        });
        registrationComplete = true;
      }

      const data = await apiRequest("/api/users/login", {
        method: "POST",
        body: { email: email.trim(), password },
      });

      if (typeof data?.token !== "string" || !data.token.trim() || !data.user) {
        setMessage(t("Përgjigjja e serverit nuk përmban të dhënat e hyrjes."));
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      onLogin(data.user, data.token);
    } catch (error) {
      console.error(error);
      setMessage(
        isRegistering && error.status === 409
          ? t("Ky email është regjistruar tashmë.")
          : error.status === 401 && !isRegistering
            ? t("Email-i ose fjalëkalimi është i pasaktë.")
            : registrationComplete
            ? t("Llogaria mund të jetë krijuar, por kyçja dështoi. Provo të kyçesh me kredencialet e tua.")
            : error.message || t("Nuk mund të lidhemi me backend-in.")
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="auth-layout">
      <section className="auth-intro">
        <div className="brand brand-light">
          <span className="brand-mark" aria-hidden="true">M</span>
          <span>Mechanic<span className="brand-accent">App</span></span>
        </div>
        <div className="auth-pitch">
          <span className="eyebrow">{t("SERVISI YT, NË NJË VEND")}</span>
          <h1>{t("Mirëmbaje çdo udhëtim.")}</h1>
          <p>{t("Menaxho veturat dhe terminet e servisit, thjesht dhe sigurt.")}</p>
        </div>
        <div className="auth-decoration" aria-hidden="true">✳</div>
      </section>

      <section className="auth-panel">
        <div className="auth-form-wrap">
          {onBack && (
            <button className="auth-back" type="button" onClick={onBack}>{t("← Kthehu te faqja kryesore")}</button>
          )}
          <span className="eyebrow">{t("MIRË SE U KTHEVE")}</span>
          <h2>{isRegistering ? t("Krijo llogarinë tënde") : t("Kyçu në llogarinë tënde")}</h2>
          <p className="muted">
            {isRegistering
              ? t("Regjistrohu për të menaxhuar veturat dhe terminet.")
              : t("Shkruaj të dhënat për të vazhduar.")}
          </p>
          <form className="form-stack auth-form" onSubmit={handleSubmit} aria-busy={isLoading}>
            {isRegistering && (
              <label className="field">
                <span>{t("Emri i plotë")}</span>
                <input
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  maxLength="120"
                  disabled={isLoading}
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder={t("Emri dhe mbiemri")}
                />
              </label>
            )}
            <label className="field">
              <span>{t("Email")}</span>
              <input
                name="email"
                type="email"
                autoComplete="username"
                required
                disabled={isLoading}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="emri@shembull.com"
              />
            </label>
            <div className="field">
              <label htmlFor="password">{t("Fjalëkalimi")}</label>
              <div className="password-input-wrap">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={isRegistering ? "new-password" : "current-password"}
                  required
                  minLength={isRegistering ? 8 : undefined}
                  disabled={isLoading}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={isRegistering ? t("Së paku 8 karaktere") : t("Shkruaj fjalëkalimin")}
                />
                <button
                  className="password-visibility"
                  type="button"
                  aria-label={showPassword ? t("Fshih fjalëkalimin") : t("Shfaq fjalëkalimin")}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  <EyeIcon crossed={showPassword} />
                </button>
              </div>
            </div>
            {isRegistering && (
              <div className="field">
                <label htmlFor="confirmPassword">{t("Përsërit fjalëkalimin")}</label>
                <div className="password-input-wrap">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength="8"
                    disabled={isLoading}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder={t("Shkruaj përsëri fjalëkalimin")}
                  />
                  <button
                    className="password-visibility"
                    type="button"
                    aria-label={showConfirmPassword ? t("Fshih konfirmimin e fjalëkalimit") : t("Shfaq konfirmimin e fjalëkalimit")}
                    aria-pressed={showConfirmPassword}
                    onClick={() => setShowConfirmPassword((visible) => !visible)}
                  >
                    <EyeIcon crossed={showConfirmPassword} />
                  </button>
                </div>
              </div>
            )}
            {message && <p className="notice notice-error" role="alert">{message}</p>}
            <button className="button button-primary button-wide" type="submit" disabled={isLoading}>
              {isLoading
                ? isRegistering ? t("Duke krijuar llogarinë...") : t("Duke u kyçur...")
                : isRegistering ? t("Regjistrohu") : t("Kyçu")}
            </button>
          </form>
          <p className="auth-switch">
            {isRegistering ? t("Ke tashmë llogari?") : t("Nuk ke ende llogari?")}{" "}
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setMessage("");
                setPassword("");
                setConfirmPassword("");
              }}
            >
              {isRegistering ? t("Kyçu") : t("Regjistrohu")}
            </button>
          </p>
          <p className="auth-footnote">{t("Aplikacioni yt i menaxhimit të servisit.")}</p>
        </div>
      </section>
    </main>
  );
}

export default Login;
