/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "../api";
import Diagnostics from "./Diagnostics";

vi.mock("../api", () => ({
  apiRequest: vi.fn(),
  handleRequestError: (error) => error.message,
}));

describe("Diagnostics", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    apiRequest.mockImplementation((path) => {
      if (path === "/api/vehicles") {
        return Promise.resolve([{ id: 3, brand: "BMW", model: "320d", year: 2019 }]);
      }
      if (path === "/api/diagnostics/vehicles/3") return Promise.resolve([]);
      if (path === "/api/diagnostics/analyze") {
        return Promise.resolve({
          id: 7,
          vehicleId: 3,
          diagnosticCode: "P0301",
          urgency: "Medium",
          summary: "Kontrolloje te mekaniku.",
          possibleCauses: ["Shkak i mundshëm"],
          needsMoreInfo: false, followUpQuestions: [], safetyAdvice: "Këshillë", recommendedAction: "Kontroll",
          createdAt: "2026-10-01T12:00:00Z",
        });
      }
      throw new Error(`Unexpected API path: ${path}`);
    });
  });

  it("sends a normalized OBD code and displays the diagnosis", async () => {
    render(
      <Diagnostics
        onSessionExpired={vi.fn()}
        onBookService={vi.fn()}
        onFindMechanics={vi.fn()}
      />
    );

    await screen.findByRole("option", { name: "BMW 320d (2019)" });
    fireEvent.change(screen.getByLabelText("Vetura"), { target: { value: "3" } });
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("/api/diagnostics/vehicles/3"));
    fireEvent.change(screen.getByLabelText("Kodi i defektit *"), { target: { value: "p0301" } });
    fireEvent.click(screen.getByRole("button", { name: "Analizo dhe ruaj" }));

    await screen.findByText("Kontrolloje te mekaniku.");
    expect(apiRequest).toHaveBeenCalledWith("/api/diagnostics/analyze", {
      method: "POST",
      body: {
        vehicleId: 3,
        code: "P0301",
        rpm: null,
        coolantTemperature: null,
        batteryVoltage: null,
        symptoms: null,
        followUpAnswers: [],
        language: "sq",
      },
    });
    expect(screen.getByText("Mesatare")).toBeTruthy();
  });

  it("lets the user answer follow-up questions before completing an OBD diagnosis", async () => {
    const clarification = {
      id: 7,
      vehicleId: 3,
      diagnosticCode: "P0301",
      urgency: "Medium",
      summary: "Nuk ka informacion të mjaftueshëm për analizë.",
      safetyAdvice: "Këshillë", recommendedAction: "Kontroll",
      possibleCauses: [],
      needsMoreInfo: true,
      followUpQuestions: ["A dridhet motori në vend?", "A ndizet drita Check Engine?"],
      createdAt: "2026-10-01T12:00:00Z",
    };
    const finalDiagnosis = {
      ...clarification,
      id: 8,
      summary: "Shkaku duhet konfirmuar me kontroll.",
      possibleCauses: ["Mund të ketë problem me ndezjen e cilindrit."],
      needsMoreInfo: false,
      followUpQuestions: [],
    };
    apiRequest.mockImplementation((path) => {
      if (path === "/api/vehicles") {
        return Promise.resolve([{ id: 3, brand: "BMW", model: "320d", year: 2019 }]);
      }
      if (path === "/api/diagnostics/vehicles/3") return Promise.resolve([]);
      if (path === "/api/diagnostics/analyze") {
        return Promise.resolve(apiRequest.mock.calls.filter(
          ([requestPath]) => requestPath === "/api/diagnostics/analyze"
        ).length === 1 ? clarification : finalDiagnosis);
      }
      throw new Error(`Unexpected API path: ${path}`);
    });

    render(
      <Diagnostics
        onSessionExpired={vi.fn()}
        onBookService={vi.fn()}
        onFindMechanics={vi.fn()}
      />
    );

    await screen.findByRole("option", { name: "BMW 320d (2019)" });
    fireEvent.change(screen.getByLabelText("Vetura", { exact: true }), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Kodi i defektit *"), { target: { value: "P0301" } });
    await waitFor(() => expect(screen.getByRole("button", { name: "Analizo dhe ruaj" }).disabled).toBe(false));
    fireEvent.click(screen.getByRole("button", { name: "Analizo dhe ruaj" }));

    await screen.findByText("A dridhet motori në vend?");
    expect(screen.queryByText("Shkaqe të mundshme")).toBeNull();
    expect(screen.queryByRole("button", { name: "Cakto servis" })).toBeNull();
    fireEvent.change(screen.getByLabelText("Përgjigjet e tua (shkruaj nga një në rresht)"), {
      target: { value: "Po, dridhet në punë boshe.\nPo, është ndezur." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Dërgo përgjigjet" }));

    await screen.findByText("Mund të ketë problem me ndezjen e cilindrit.");
    expect(apiRequest).toHaveBeenLastCalledWith("/api/diagnostics/analyze", {
      method: "POST",
      body: {
        vehicleId: 3,
        code: "P0301",
        rpm: null,
        coolantTemperature: null,
        batteryVoltage: null,
        symptoms: null,
        followUpAnswers: ["Po, dridhet në punë boshe.", "Po, është ndezur."],
        language: "sq",
      },
    });
  });
});
