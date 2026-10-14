import { languages, setLanguage, useLanguage } from "../i18n";

export default function LanguageSelector() {
  const language = useLanguage();
  return <label className="language-selector">
    <span aria-hidden="true">◎</span>
    <select aria-label="Language / Gjuha / Sprache" value={language} onChange={event => setLanguage(event.target.value)}>
      {Object.entries(languages).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
    </select>
  </label>;
}
