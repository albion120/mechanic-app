/** @vitest-environment jsdom */
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import App from "./App";

describe("App public access", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows the public overview first and opens login only when requested", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Mirëmbajtja e veturës, më e thjeshtë." })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Vetura e mia" })).toBeNull();

    fireEvent.click(within(screen.getByRole("banner")).getByRole("button", { name: "Kyçu" }));
    expect(screen.getByRole("heading", { name: "Kyçu në llogarinë tënde" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "← Kthehu te faqja kryesore" }));
    expect(screen.getByRole("heading", { name: "Mirëmbajtja e veturës, më e thjeshtë." })).toBeTruthy();
  });

  it("opens registration directly from the public page", () => {
    render(<App />);

    fireEvent.click(within(screen.getAllByRole("banner")[0]).getByRole("button", { name: "Krijo llogari" }));
    expect(screen.getByRole("heading", { name: "Krijo llogarinë tënde" })).toBeTruthy();
    expect(screen.getByLabelText("Emri i plotë")).toBeTruthy();
  });
});
