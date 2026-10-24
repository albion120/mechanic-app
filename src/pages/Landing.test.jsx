/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Landing from "./Landing";

describe("Landing", () => {
  it("shows the public service overview without requiring an account", () => {
    render(<Landing onLogin={vi.fn()} onRegister={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Mirëmbajtja e veturës, më e thjeshtë." })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Vetura ime" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Terminet e mia" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Serviset partnere" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Gjej një mekanik" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Më duhet ndihmë tani" }).getAttribute('href')).toBe('#/roadside');
    expect(screen.getByText("Gjej ndihmë afër pa llogari.")).toBeTruthy();
  });

  it("provides separate login and registration actions", () => {
    const onLogin = vi.fn();
    const onRegister = vi.fn();
    const { container } = render(<Landing onLogin={onLogin} onRegister={onRegister} />);
    const header = container.querySelector(".landing-header");

    fireEvent.click(header.querySelector(".button-quiet"));
    fireEvent.click(header.querySelector(".button-primary"));

    expect(onLogin).toHaveBeenCalledOnce();
    expect(onRegister).toHaveBeenCalledOnce();
  });
});
