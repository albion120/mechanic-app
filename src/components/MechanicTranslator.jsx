import { useId, useRef, useState } from "react";
import { apiRequest, handleRequestError } from "../api";
import { t } from "../i18n";

export default function MechanicTranslator({ initialText = "" }) {
  const id = useId();
  const [text, setText] = useState(initialText.slice(0, 1500));
  const [targetLanguage, setTargetLanguage] = useState("de");
  const [result, setResult] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const revision = useRef(0);
  const reset = () => { revision.current++; setResult(""); setMessage(""); };
  const translate = async event => {
    event.preventDefault();
    if (busy || text.trim().length < 3) return;
    const version = revision.current;
    setBusy(true); setMessage(""); setResult("");
    try {
      const response = await apiRequest("/api/ai/translate", { method: "POST", body: { text: text.trim(), targetLanguage } });
      if (typeof response?.text !== "string" || !response.text.trim() || response.text.length > 4000 || response.targetLanguage !== targetLanguage) throw new Error(t("Përkthimi nuk është i vlefshëm."));
      if (version === revision.current) setResult(response.text.trim());
    } catch (error) {
      if (version === revision.current) setMessage(handleRequestError(error, undefined, t("Përkthimi nuk është i disponueshëm.")));
    } finally { setBusy(false); }
  };
  return <section className="panel translator">
    <h2>{t("Përkthe për mekanikun")}</h2>
    <p className="muted">{t("Përkthe vetëm atë që ke vërejtur. Kontrolloje tekstin para se ta ndash; përkthimi nuk është diagnozë.")}</p>
    <form className="form-stack" onSubmit={translate}>
      <label className="field" htmlFor={`${id}-text`}>{t("Përshkrimi për mekanikun")}
        <textarea id={`${id}-text`} required minLength={3} maxLength={1500} rows={4} value={text} onChange={event => { setText(event.target.value); reset(); }} />
      </label>
      <label className="field">{t("Gjuha e mekanikut")}
        <select value={targetLanguage} onChange={event => { setTargetLanguage(event.target.value); reset(); }}>
          <option value="de">Deutsch</option><option value="en">English</option><option value="sq">Shqip</option><option value="it">Italiano</option><option value="fr">Français</option>
        </select>
      </label>
      <button className="button button-primary" disabled={busy}>{busy ? t("Duke përkthyer...") : t("Përkthe")}</button>
    </form>
    {message && <p role="alert" className="notice notice-error">{message}</p>}
    {result && <div className="translation-result" aria-live="polite"><p lang={targetLanguage}>{result}</p>
      <button className="button button-quiet" onClick={async () => {
        try { await navigator.clipboard.writeText(result); setMessage(t("Teksti u kopjua.")); }
        catch { setMessage(t("Kopjoje tekstin manualisht.")); }
      }}>{t("Kopjo tekstin")}</button>
    </div>}
  </section>;
}
