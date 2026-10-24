import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest, handleRequestError } from "./api";

describe("apiRequest", () => {
  it.each(["/api/ai/diagnose", "/api/ai/translate", "/api/diagnostics/analyze"])("explains the regional restriction for %s without displaying provider details", async path => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: "AI_REGION_UNSUPPORTED", detail: "secret provider diagnostics",
    }), { status: 503 })));
    await expect(apiRequest(path)).rejects.toMatchObject({
      status: 503,
      message: "AI nuk është i disponueshëm nga vendndodhja e serverit. Administratori duhet të konfigurojë një vendndodhje ose ofrues të mbështetur.",
    });
  });

  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => null),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends JSON and includes a saved JWT", async () => {
    localStorage.getItem.mockReturnValue("test-jwt");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 8 }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await apiRequest("/api/vehicles", {
      method: "POST",
      body: { brand: "BMW" },
    });

    const [, options] = fetchMock.mock.calls[0];
    expect(result).toEqual({ id: 8 });
    expect(options.headers.get("Authorization")).toBe(
      `Bearer ${localStorage.getItem("token")}`
    );
    expect(options.headers.get("Content-Type")).toBe("application/json");
    expect(options.body).toBe(JSON.stringify({ brand: "BMW" }));
  });

  it("returns null for successful responses without a body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

    await expect(apiRequest("/api/vehicles/1", { method: "DELETE" })).resolves.toBeNull();
  });

  it("surfaces server validation errors with their HTTP status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ errors: { Year: ["Year must be valid."] } }),
          { status: 400, headers: { "Content-Type": "application/problem+json" } }
        )
      )
    );

    await expect(apiRequest("/api/vehicles")).rejects.toMatchObject({
      message: "Year must be valid.",
      status: 400,
    });
  });

  it("does not expose provider configuration details from a server problem", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            title: "OpenAI cannot complete the request.",
            detail: "Check available API credits.",
          }),
          { status: 503, headers: { "Content-Type": "application/problem+json" } }
        )
      )
    );

    await expect(apiRequest("/api/ai/diagnose")).rejects.toMatchObject({
      message: "Serveri pati një gabim të brendshëm. Provo përsëri më vonë.",
      status: 503,
    });
  });

  it("does not expose a raw server stack trace to the user", async () => {
    const stackTrace =
      "System.InvalidOperationException: Query failed\n at DiagnosticsController.GetVehicleHistory";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(stackTrace, {
          status: 500,
          headers: { "Content-Type": "text/plain" },
        })
      )
    );

    await expect(apiRequest("/api/diagnostics/vehicles/3")).rejects.toMatchObject({
      message: "Serveri pati një gabim të brendshëm. Provo përsëri më vonë.",
      status: 500,
    });
  });

  it.each([
    { message: "System.InvalidOperationException: private details" },
    { errors: { Database: ["Internal connection information"] } },
  ])("hides JSON internal errors regardless of their shape: %j", async body => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(body), {
      status: 500, headers: { "Content-Type": "application/json" },
    })));
    await expect(apiRequest("/api/vehicles")).rejects.toMatchObject({
      message: "Serveri pati një gabim të brendshëm. Provo përsëri më vonë.", status: 500,
    });
  });

  it("explains when the backend cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(apiRequest("/api/users/register")).rejects.toMatchObject({
      code: "API_UNREACHABLE",
      message: expect.stringContaining("Kontrollo lidhjen"),
    });
  });

  it("explains when the server rate limit is reached", () => {
    expect(
      handleRequestError(
        Object.assign(new Error("Too many requests"), { status: 429 }),
        vi.fn(),
        "Request failed."
      )
    ).toContain("Provo përsëri më vonë");
  });
});

describe("handleRequestError", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("expires the session for unauthorized requests", () => {
    const onSessionExpired = vi.fn();
    const message = handleRequestError(
      Object.assign(new Error("Unauthorized"), { status: 401 }),
      onSessionExpired,
      "Request failed."
    );

    expect(onSessionExpired).toHaveBeenCalledOnce();
    expect(message).toContain("Sesioni ka skaduar");
  });

  it("logs unexpected request errors and preserves their message", () => {
    const error = new Error("Backend unavailable");
    const logError = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(handleRequestError(error, vi.fn(), "Request failed.")).toBe(
      "Backend unavailable"
    );
    expect(logError).toHaveBeenCalledWith(error);
  });
});
