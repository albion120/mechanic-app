/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "../api";
import AiMechanic from "./AiMechanic";

vi.mock("../api", () => ({
  apiRequest: vi.fn(),
  handleRequestError: (error) => error.message,
}));

describe("AiMechanic follow-up flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiRequest.mockResolvedValueOnce([{
      id: 7,
      brand: "BMW",
      model: "320d",
      year: 2019,
      licensePlate: "01-123-AB",
    }]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows vehicle loading errors instead of pretending the account has no vehicles", async () => {
    apiRequest.mockReset();
    apiRequest.mockRejectedValueOnce(new Error("Backend unavailable"));
    render(<AiMechanic onSessionExpired={vi.fn()} />);
    expect((await screen.findByRole("alert")).textContent).toContain("Backend unavailable");
    expect(screen.queryByRole("button", { name: "Analizo problemin" })).toBeNull();
  });

  it("asks for clarifying details before showing causes, then submits the answers", async () => {
    apiRequest
      .mockResolvedValueOnce({
        summary: "Nuk ka informacion të mjaftueshëm për analizë.",
        possibleCauses: [],
        urgency: "Medium",
        safetyAdvice: "Nëse shfaqet rrezik i menjëhershëm, ndalo në vend të sigurt.",
        recommendedAction: "Përgjigju pyetjeve që mundesh.",
        needsMoreInfo: true,
        followUpQuestions: ["Nga cila pjesë vjen zhurma?", "A ndryshon me RPM?"],
      })
      .mockResolvedValueOnce({
        summary: "Zhurma kërkon kontroll të rripit ose tensionuesit.",
        possibleCauses: ["Rripi mund të jetë i konsumuar."],
        urgency: "Medium",
        safetyAdvice: "Ndalo nëse ndizet drita e vajit.",
        recommendedAction: "Kontakto një mekanik.",
        needsMoreInfo: false,
        followUpQuestions: [],
      });

    render(<AiMechanic onSessionExpired={vi.fn()} onBookService={vi.fn()} onFindMechanics={vi.fn()} />);
    fireEvent.change(await screen.findByLabelText("Zgjidh veturën"), {
      target: { value: "7" },
    });
    fireEvent.change(screen.getByLabelText(/Simptomat/), {
      target: { value: "BMW po bën zhurmë të çuditshme." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Analizo problemin" }));

    expect(await screen.findByText("Nga cila pjesë vjen zhurma?")).toBeTruthy();
    expect(screen.queryByText("Shkaqe të mundshme")).toBeNull();
    fireEvent.change(screen.getByLabelText("Përgjigjet e tua (shkruaj nga një në rresht)"), {
      target: { value: "Nga ana e motorit.\nNdryshon kur rriten xhirot." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Dërgo përgjigjet" }));

    expect(await screen.findByText("Rripi mund të jetë i konsumuar.")).toBeTruthy();
    expect(apiRequest).toHaveBeenNthCalledWith(3, "/api/ai/diagnose", {
      method: "POST",
      body: {
        vehicleId: 7,
        problemDescription: "BMW po bën zhurmë të çuditshme.",
        followUpAnswers: ["Nga ana e motorit.", "Ndryshon kur rriten xhirot."],
        language: "sq",
      },
    });
  });
});
