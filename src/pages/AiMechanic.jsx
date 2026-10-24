import { t } from "../i18n";
import { useEffect, useState } from "react";
import { currentLanguage } from "../i18n";
import { validateDiagnosis, serviceDescription } from "../diagnosis";
import { TRANSLATION_ENABLED } from "../features";
import MechanicTranslator from "../components/MechanicTranslator";
import { apiRequest, handleRequestError } from "../api";

const urgencyLabels = {
  low: "E ulët",
  medium: "Mesatare",
  high: "E lartë",
  critical: "Kritike",
};

function AiMechanic({ onSessionExpired, onBookService, onFindMechanics, initialVehicleId = "" }) {
  const [vehicles, setVehicles] = useState([]);
  const [vehicleId, setVehicleId] = useState("");
  const [problemDescription, setProblemDescription] = useState("");
  const [followUpAnswers, setFollowUpAnswers] = useState("");
  const [diagnosis, setDiagnosis] = useState(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    const loadVehicles = async () => {
      try {
        const data = await apiRequest("/api/vehicles");
        if (!Array.isArray(data)) {
          throw new Error(t("Përgjigjja e serverit për veturat nuk është e vlefshme."));
        }
        if (isCurrent) { setVehicles(data); setVehicleId(data.some(v => String(v.id) === String(initialVehicleId)) ? String(initialVehicleId) : ""); }
      } catch (error) {
        if (isCurrent) {
          setMessage(
            handleRequestError(error, onSessionExpired, t("Nuk mund të ngarkohen veturat."))
          );
        }
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };

    loadVehicles();
    return () => {
      isCurrent = false;
    };
  }, [onSessionExpired, initialVehicleId]);

  const analyzeProblem = async (event) => {
    event.preventDefault();
    if (isAnalyzing) return;

    const answers = diagnosis?.needsMoreInfo
      ? followUpAnswers.split(/\r?\n/).map((answer) => answer.trim()).filter(Boolean)
      : [];
    if (diagnosis?.needsMoreInfo && answers.length === 0) {
      setMessage(t("Përgjigju të paktën njërës nga pyetjet para se të vazhdosh."));
      return;
    }

    if (answers.length > 5 || answers.some(answer => answer.length > 500)) {
      setMessage(t("Jep deri në 5 përgjigje, me maksimum 500 karaktere për secilën.")); return;
    }
    setIsAnalyzing(true);
    setMessage("");
    try {
      const result = await apiRequest("/api/ai/diagnose", {
        method: "POST",
        body: {
          vehicleId: Number(vehicleId),
          problemDescription: problemDescription.trim(),
          followUpAnswers: answers,
          language: currentLanguage(),
        },
      });

      validateDiagnosis(result);
      setDiagnosis(result);
      if (!result.needsMoreInfo) setFollowUpAnswers("");
    } catch (error) {
      setMessage(
        handleRequestError(error, onSessionExpired, t("Analiza AI nuk mund të kryhet."))
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const vehicle = vehicles.find((item) => String(item.id) === vehicleId);

  return (
    <section>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{t("ASISTENTI I SERVISIT")}</span>
          <h1>{t("AI Mechanic")}</h1>
          <p className="muted">{t("Describe symptoms, answer follow-up questions, understand urgency and find real workshops.")}</p>
        </div>
        <span className="count-badge">{t("Vlerësim paraprak")}</span>
      </div>

      <p className="notice">{t("The assistant uses an external AI provider for analysis. Do not include personal details. Workshop results come from the map and partner directory, not AI-generated businesses.")}</p>
      {isLoading ? (
        <div className="empty-state"><span className="spinner" />{t("Duke ngarkuar veturat...")}</div>
      ) : vehicles.length === 0 ? (
        <div className={message ? "notice notice-error" : "notice notice-info"} role={message ? "alert" : "status"}>{message || t("Shto së pari një veturë që asistenti të marrë parasysh modelin e saj.")}</div>
      ) : (
        <div className="ai-layout">
          <section className="panel ai-form-panel">
            <div className="panel-heading">
              <div>
                <h2>{t("Çfarë problemi ka vetura?")}</h2>
                <p className="muted">{t("Përshkruaj simptomat, kur shfaqen dhe çdo sinjal paralajmërues.")}</p>
              </div>
              <span className="panel-icon" aria-hidden="true">✳</span>
            </div>
            <form className="form-stack" onSubmit={analyzeProblem}>
              <label className="field">
                <span>{t("Zgjidh veturën")}</span>
                <select disabled={isAnalyzing} required value={vehicleId} onChange={(event) => { setVehicleId(event.target.value); setDiagnosis(null); setFollowUpAnswers(""); }}>
                  <option value="">{t("Zgjidh veturën")}</option>
                  {vehicles.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.brand} {item.model} ({item.year}) · {item.licensePlate}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{t("Simptomat")}</span>
                <textarea
                  disabled={isAnalyzing}
                  required
                  minLength="8"
                  maxLength="1500"
                  rows="6"
                  value={problemDescription}
                  onChange={(event) => { setProblemDescription(event.target.value); setDiagnosis(null); setFollowUpAnswers(""); }}
                  placeholder={t("p.sh. Timoni dridhet kur frenoj dhe zhurma vjen nga rrotat e përparme...")}
                />
                <span className="field-hint">{problemDescription.length}{t("/1500 karaktere")}</span>
              </label>
              {message && <p className="notice notice-error" role="alert">{message}</p>}
              <button className="button button-primary button-wide" type="submit" disabled={isAnalyzing}>
                {isAnalyzing
                  ? t("Duke analizuar...")
                  : diagnosis?.needsMoreInfo
                    ? t("Dërgo përgjigjet")
                    : t("Analizo problemin")}
              </button>
            </form>
            <p className="ai-disclaimer">{t("Analiza është informuese dhe nuk zëvendëson kontrollin e mekanikut. Nëse vetura nuk është e sigurt për vozitje, ndalo dhe kërko ndihmë profesionale.")}</p>
          </section>

          <section className="ai-result-column" aria-live="polite">
            {!diagnosis ? (
              <div className="empty-state ai-placeholder">
                <span className="empty-icon" aria-hidden="true">✳</span>
                <h3>{t("Analiza jote do të shfaqet këtu")}</h3>
                <p>{t("Pyetje sqaruese ose vlerësim paraprak me këshilla sigurie.")}</p>
              </div>
            ) : (
              <article className="panel diagnosis-card">
                <div className="diagnosis-header">
                  <div>
                    <span className="eyebrow">{t("VLERËSIMI I ASISTENTIT")}</span>
                    <h2>{t("Rezultati i analizës")}</h2>
                  </div>
                  {(!diagnosis.needsMoreInfo || diagnosis.urgency === "Critical") && (
                    <span className={`urgency-badge urgency-${diagnosis.urgency.toLowerCase()}`}>
                      {t(urgencyLabels[diagnosis.urgency.toLowerCase()] ?? diagnosis.urgency)}
                    </span>
                  )}
                </div>
                {vehicle && (
                  <p className="diagnosis-vehicle">
                    {vehicle.brand} {vehicle.model} · {vehicle.year}
                  </p>
                )}
                <p className="diagnosis-summary">{diagnosis.summary}</p>
                {diagnosis.needsMoreInfo ? (
                  <>
                    <h3>{t("Na duhen disa hollësi para analizës")}</h3>
                    <ol className="follow-up-questions">
                      {diagnosis.followUpQuestions.map((question, index) => (
                        <li key={`${index}-${question}`}>{question}</li>
                      ))}
                    </ol>
                    <label className="field">
                      <span>{t("Përgjigjet e tua (shkruaj nga një në rresht)")}</span>
                      <textarea
                        disabled={isAnalyzing}
                rows="4"
                        maxLength="2500"
                        value={followUpAnswers}
                        onChange={(event) => { setFollowUpAnswers(event.target.value); setMessage(""); }}
                        placeholder={t("Përgjigju pyetjeve që mundesh...")}
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <h3>{t("Shkaqe të mundshme")}</h3>
                    <ul className="cause-list">
                      {diagnosis.possibleCauses.map((cause, index) => (
                        <li key={`${index}-${cause}`}>{cause}</li>
                      ))}
                    </ul>
                  </>
                )}
                <div className="safety-advice">
                  <strong>{t("Këshillë sigurie")}</strong>
                  <p>{diagnosis.safetyAdvice}</p>
                </div>
                {diagnosis.recommendedAction && (
                  <p className="diagnosis-summary">
                    <strong>{t("Hapi i rekomanduar:")}</strong> {diagnosis.recommendedAction}
                  </p>
                )}
                {(!diagnosis.needsMoreInfo || diagnosis.urgency === "Critical") && (
                  <>
                    {!diagnosis.needsMoreInfo && <button
                      className="button button-primary button-wide"
                      onClick={() => onBookService(vehicleId, serviceDescription(problemDescription.trim(), diagnosis))}
                    >{t("Cakto servis për këtë problem")}</button>}
                    <button className="button button-quiet button-wide" onClick={onFindMechanics}>{t("Gjej mekanikë pranë")}</button>
                  </>
                )}
                {TRANSLATION_ENABLED && <MechanicTranslator key={problemDescription} initialText={problemDescription} />}
              </article>
            )}
          </section>
        </div>
      )}
    </section>
  );
}

export default AiMechanic;
