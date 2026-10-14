import { t, dateLocale } from "../i18n";
import { useEffect, useState } from "react";
import { currentLanguage } from "../i18n";
import { validateDiagnosis, serviceDescription } from "../diagnosis";
import MechanicTranslator from "../components/MechanicTranslator";
import { apiRequest, handleRequestError } from "../api";

const urgencyLabels = {
  low: "E ulët",
  medium: "Mesatare",
  high: "E lartë",
  critical: "Kritike",
};

function Diagnostics({ onSessionExpired, onBookService, onFindMechanics }) {
  const [vehicles, setVehicles] = useState([]);
  const [vehicleId, setVehicleId] = useState("");
  const [code, setCode] = useState("");
  const [rpm, setRpm] = useState("");
  const [coolantTemperature, setCoolantTemperature] = useState("");
  const [batteryVoltage, setBatteryVoltage] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [followUpAnswers, setFollowUpAnswers] = useState("");
  const [history, setHistory] = useState([]);
  const [diagnosis, setDiagnosis] = useState(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    let active = true;
    apiRequest("/api/vehicles")
      .then((data) => {
        if (!Array.isArray(data)) throw new Error(t("Lista e veturave nuk është e vlefshme."));
        if (active) setVehicles(data);
      })
      .catch((error) => {
        if (active) setMessage(handleRequestError(error, onSessionExpired, t("Veturat nuk u ngarkuan.")));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, [onSessionExpired]);

  useEffect(() => {
    if (!vehicleId) return undefined;
    let active = true;
    apiRequest(`/api/diagnostics/vehicles/${vehicleId}`)
      .then((data) => {
        if (!Array.isArray(data)) throw new Error(t("Historiku i diagnostikimit nuk është i vlefshëm."));
        if (active) setHistory(data);
      })
      .catch((error) => {
        if (active) setMessage(handleRequestError(error, onSessionExpired, t("Historiku nuk u ngarkua.")));
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });
    return () => { active = false; };
  }, [vehicleId, onSessionExpired]);

  const analyze = async (event) => {
    event.preventDefault();
    if (isAnalyzing) return;
    const answers = diagnosis?.needsMoreInfo
      ? followUpAnswers.split(/\r?\n/).map((answer) => answer.trim()).filter(Boolean)
      : [];
    if (diagnosis?.needsMoreInfo && answers.length === 0) {
      setMessage(t("Përgjigju të paktën njërës nga pyetjet para se të vazhdosh."));
      return;
    }
    if (answers.length > 5 || answers.some((answer) => answer.length > 500)) {
      setMessage(t("Jep deri në 5 përgjigje, me maksimum 500 karaktere për secilën."));
      return;
    }

    setIsAnalyzing(true);
    setMessage("");
    const optionalNumber = (value) => value === "" ? null : Number(value);
    try {
      const result = await apiRequest("/api/diagnostics/analyze", {
        method: "POST",
        body: {
          vehicleId: Number(vehicleId),
          code: code.trim().toUpperCase(),
          rpm: optionalNumber(rpm),
          coolantTemperature: optionalNumber(coolantTemperature),
          batteryVoltage: optionalNumber(batteryVoltage),
          symptoms: symptoms.trim() || null,
          followUpAnswers: answers,
          language: currentLanguage(),
        },
      });
      validateDiagnosis(result);
      setDiagnosis(result);
      setFollowUpAnswers("");
      setHistory((items) => [result, ...items]);
    } catch (error) {
      setMessage(handleRequestError(error, onSessionExpired, t("Diagnostikimi nuk mund të kryhet.")));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const selectedVehicle = vehicles.find((item) => String(item.id) === vehicleId);
  const resetDiagnosis = () => {
    setDiagnosis(null);
    setFollowUpAnswers("");
    setMessage("");
  };
  const renderDiagnosis = (item, isCurrent = false) => (
    <article className="panel diagnosis-card" key={isCurrent ? "current" : item.id}>
      <div className="diagnosis-header">
        <div>
          <span className="eyebrow">{isCurrent ? t("ANALIZA E RE") : new Date(item.createdAt).toLocaleString(dateLocale())}</span>
          <h2>{item.diagnosticCode}</h2>
        </div>
        {(!item.needsMoreInfo || item.urgency === "Critical") && <span className={`urgency-badge urgency-${item.urgency?.toLowerCase()}`}>
          {t(urgencyLabels[item.urgency?.toLowerCase()] ?? item.urgency)}
        </span>}
      </div>
      {item.summary && <p className="diagnosis-summary">{item.summary}</p>}
      {!item.needsMoreInfo && item.possibleCauses?.length > 0 && (
        <>
          <h3>{t("Shkaqe të mundshme")}</h3>
          <ul className="cause-list">{item.possibleCauses.map((cause, index) => <li key={`${index}-${cause}`}>{cause}</li>)}</ul>
        </>
      )}
      {item.needsMoreInfo && item.followUpQuestions?.length > 0 && (
        <div className="safety-advice">
          <strong>{t("Na duhen disa hollësi para analizës")}</strong>
          <ol className="follow-up-questions">
            {item.followUpQuestions.map((question, index) => (
              <li key={`${index}-${question}`}>{question}</li>
            ))}
          </ol>
          {isCurrent && (
            <label className="field">
              <span>{t("Përgjigjet e tua (shkruaj nga një në rresht)")}</span>
              <textarea
                disabled={isAnalyzing}
                rows="4"
                maxLength="2500"
                value={followUpAnswers}
                onChange={(event) => {
                  setFollowUpAnswers(event.target.value);
                  setMessage("");
                }}
                placeholder={t("Përgjigju pyetjeve që mundesh...")}
              />
            </label>
          )}
        </div>
      )}
      {(item.rpm != null || item.coolantTemperature != null || item.batteryVoltage != null) && (
        <p className="muted sensor-values">
          {item.rpm != null && `RPM ${item.rpm} · `}
          {item.coolantTemperature != null && `Temperatura ${item.coolantTemperature}°C · `}
          {item.batteryVoltage != null && `Bateria ${item.batteryVoltage}V`}
        </p>
      )}
      {item.safetyAdvice && <div className="safety-advice"><strong>{t("Këshillë sigurie")}</strong><p>{item.safetyAdvice}</p></div>}
      {item.recommendedAction && <p className="diagnosis-summary"><strong>{t("Hapi i rekomanduar:")}</strong> {item.recommendedAction}</p>}
      {item.userSymptoms && <p className="muted">{t("Simptomat:")}{item.userSymptoms}</p>}
      {isCurrent && (!item.needsMoreInfo || item.urgency === "Critical") && (
        <div className="diagnostic-actions">
          {!item.needsMoreInfo && <button className="button button-primary" onClick={() => onBookService(vehicleId, serviceDescription(item.userSymptoms || symptoms, item, item.diagnosticCode))}>{t("Cakto servis")}</button>}
          <button className="button button-quiet" onClick={() => onFindMechanics()}>{t("Gjej mekanikë pranë")}</button>
        </div>
      )}
      {isCurrent && <MechanicTranslator key={item.id} initialText={item.userSymptoms || symptoms} />}
    </article>
  );

  return (
    <section>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{t("OBD-II · HISTORIKU I VETURËS")}</span>
          <h1>{t("Diagnostikimi")}</h1>
          <p className="muted">{t("Analizo kodin OBD-II dhe ruaj raportet për veturën tënde.")}</p>
        </div>
        <span className="count-badge">{t("Lexim demonstrues")}</span>
      </div>
      {message && <p className="notice notice-error" role="alert">{message}</p>}
      {isLoading ? <div className="empty-state"><span className="spinner" />{t("Duke ngarkuar veturat...")}</div> :
        vehicles.length === 0 ? <div className="notice notice-info">{t("Shto një veturë para se të nisësh diagnostikimin.")}</div> :
          <div className="diagnostics-layout">
            <section className="panel">
              <div className="panel-heading">
                <div><h2>{t("Lexo kodin OBD-II")}</h2><p className="muted">{t("Plotëso vlerat që i ke; fusha e sensorëve janë opsionale.")}</p></div>
                <span className="panel-icon" aria-hidden="true">⌁</span>
              </div>
              <form className="form-stack" onSubmit={analyze}>
                <fieldset disabled={isAnalyzing} className="form-stack form-fields">
                <label className="field">
                  <span>{t("Vetura")}</span>
                  <select required value={vehicleId} onChange={(event) => { setVehicleId(event.target.value); setHistoryLoading(Boolean(event.target.value)); setHistory([]); resetDiagnosis(); }}>
                    <option value="">{t("Zgjidh veturën")}</option>
                    {vehicles.map((item) => <option key={item.id} value={item.id}>{item.brand} {item.model} ({item.year})</option>)}
                  </select>
                </label>
                <label className="field">
                  <span>{t("Kodi i defektit *")}</span>
                  <input required pattern="[PBCU][0-3][0-9A-Fa-f]{3}" minLength="5" maxLength="5"
                    value={code} onChange={(event) => { setCode(event.target.value.toUpperCase()); resetDiagnosis(); }} placeholder="p.sh. P0301" />
                </label>
                <div className="sensor-grid">
                  <label className="field"><span>{t("RPM")}</span><input type="number" min="0" max="10000" value={rpm} onChange={(event) => { setRpm(event.target.value); resetDiagnosis(); }} placeholder="p.sh. 850" /></label>
                  <label className="field"><span>{t("Temperatura °C")}</span><input type="number" min="-50" max="200" step="0.1" value={coolantTemperature} onChange={(event) => { setCoolantTemperature(event.target.value); resetDiagnosis(); }} placeholder="p.sh. 92" /></label>
                  <label className="field"><span>{t("Tensioni V")}</span><input type="number" min="0" max="30" step="0.1" value={batteryVoltage} onChange={(event) => { setBatteryVoltage(event.target.value); resetDiagnosis(); }} placeholder="p.sh. 12.6" /></label>
                </div>
                <label className="field"><span>{t("Simptomat (opsionale)")}</span>
                  <textarea maxLength="1500" rows="4" value={symptoms} onChange={(event) => { setSymptoms(event.target.value); resetDiagnosis(); }} placeholder={t("Përshkruaj çfarë vëren te vetura...")} />
                </label>
                </fieldset>
                <button className="button button-primary button-wide" type="submit" disabled={isAnalyzing || historyLoading}>
                  {isAnalyzing
                    ? t("Duke analizuar...")
                    : diagnosis?.needsMoreInfo
                      ? t("Dërgo përgjigjet")
                      : t("Analizo dhe ruaj")}
                </button>
              </form>
              <p className="ai-disclaimer">{t("Leximi aktual është simulim i vlerave që i fut ti; nuk lidhet me adapter fizik OBD-II. Analiza nuk zëvendëson kontrollin e mekanikut.")}</p>
            </section>
            <section className="diagnostic-history">
              {diagnosis && renderDiagnosis(diagnosis, true)}
              <div className="section-heading"><div><h2>{t("Historiku")}{selectedVehicle ? `· ${selectedVehicle.brand} ${selectedVehicle.model}` : ""}</h2><p className="muted">{t("Raportet ruhen për llogarinë tënde.")}</p></div></div>
              {historyLoading ? <p role="status">{t("Duke ngarkuar historikun...")}</p> : history.length === 0 ? <div className="empty-state"><h3>{t("Nuk ka raporte ende")}</h3><p>{t("Zgjidh veturën dhe analizo një kod.")}</p></div> :
                <div className="diagnostic-history-list">{history.filter((item) => !diagnosis || item.id !== diagnosis.id).map((item) => renderDiagnosis(item))}</div>}
            </section>
          </div>}
    </section>
  );
}

export default Diagnostics;
