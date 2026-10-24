import { t } from "./i18n";
const apiUrl = (
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? "http://localhost:5180" : "")
).replace(/\/+$/, "");

export async function apiRequest(path, options = {}) {
  const { body, headers: customHeaders, ...requestOptions } = options;
  const headers = new Headers(customHeaders);
  const token = localStorage.getItem("token");

  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (body !== undefined) headers.set("Content-Type", "application/json");

  let response;
  try {
    response = await fetch(`${apiUrl}${path}`, {
      ...requestOptions,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (cause) {
    const error = new Error(
      t("Nuk mund të lidhemi me shërbimin. Kontrollo lidhjen dhe provo përsëri."),
      { cause }
    );
    error.code = "API_UNREACHABLE";
    throw error;
  }
  const responseText = await response.text();
  let data = null;

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      data = responseText;
    }
  }

  if (!response.ok) {
    const validationErrors = data?.errors
      ? Object.values(data.errors).flat().join(" ")
      : "";
    const isInternalServerError = response.status >= 500;
    const isAiRegionError = response.status === 503 && data?.code === "AI_REGION_UNSUPPORTED" &&
      ["/api/ai/diagnose", "/api/ai/translate", "/api/diagnostics/analyze"].includes(path);
    const rawMessage = (
      validationErrors ||
      data?.message ||
      (data?.title && data?.detail
        ? `${data.title} ${data.detail}`
        : data?.title || data?.detail) ||
      (typeof data === "string" ? data : "") ||
      `Kërkesa dështoi (${response.status}).`);
    const message = isAiRegionError
      ? t("AI nuk është i disponueshëm nga vendndodhja e serverit. Administratori duhet të konfigurojë një vendndodhje ose ofrues të mbështetur.")
      : isInternalServerError
      ? t("Serveri pati një gabim të brendshëm. Provo përsëri më vonë.")
      : t(rawMessage);
    const error = new Error(message);
    error.retryAfter = Number(response.headers.get("Retry-After")) || null;
    error.status = response.status;
    error.code = data?.code;
    throw error;
  }

  return data;
}

export function handleRequestError(error, onSessionExpired, fallback) {
  if (error.status === 401) {
    onSessionExpired?.();
    return t("Sesioni ka skaduar. Hyr përsëri.");
  }

  if (error.status === 429) {
    return t("Ke arritur kufirin e kërkesave. Provo përsëri më vonë.");
  }

  console.error(error);
  return error.message || fallback;
}
