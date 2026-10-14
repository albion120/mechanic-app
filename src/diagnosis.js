import { t } from "./i18n";

export function validateDiagnosis(result) {
  const strings = ["summary", "safetyAdvice", "recommendedAction"];
  if (!result || strings.some(key => typeof result[key] !== "string" || !result[key].trim() || result[key].length > 1200) ||
      !["Low", "Medium", "High", "Critical"].includes(result.urgency) || typeof result.needsMoreInfo !== "boolean" ||
      !Array.isArray(result.possibleCauses) || !Array.isArray(result.followUpQuestions) ||
      result.possibleCauses.length > 3 || result.followUpQuestions.length > 5 ||
      [...result.possibleCauses, ...result.followUpQuestions].some(value => typeof value !== "string" || !value.trim() || value.length > 600) ||
      (result.needsMoreInfo ? result.followUpQuestions.length < 1 : result.possibleCauses.length < 1)) {
    throw new Error(t("Përgjigjja e analizës AI nuk është e vlefshme."));
  }
  return result;
}

export function serviceDescription(symptoms, result, code) {
  return [symptoms && `${t("Simptomat")}: ${symptoms}`, code && `OBD-II: ${code}`,
    result?.summary && `${t("Vlerësim orientues AI")}: ${result.summary}`].filter(Boolean).join("\n").slice(0, 5000);
}
