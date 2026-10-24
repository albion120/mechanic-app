/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import App from "./App";

vi.mock("./features", () => ({ AI_ENABLED: true }));
vi.mock("./pages/AiMechanic", () => ({ default: ({ onBookService }) =>
  <button onClick={() => onBookService("1", "Private symptoms from first account")}>Prepare appointment</button>
}));
vi.mock("./marketplace/Notifications", () => ({ default: () => null, NotificationLink: () => null, ReviewModeration: () => null }));
vi.mock("./marketplace/Partners", () => ({ Partners: () => <button onClick={() => { window.location.hash = '#/partners/1'; window.dispatchEvent(new Event('hashchange')); }}>Choose partner</button>, PartnerProfile: ({ draft, onSessionExpired, onLogin }) => <>
  <p>{draft?.description || "No appointment draft"}</p>
  <button onClick={onSessionExpired}>Expire session</button>
  <button onClick={onLogin}>Login for partner</button>
</> }));
vi.mock("./pages/Login", () => ({ default: ({ onLogin }) =>
  <button onClick={() => onLogin({ id: 2, role: "Customer" }, "second-token")}>Sign in as second account</button>
}));

it("clears private appointment drafts before another account signs in after expiry", () => {
  localStorage.setItem("token", "first-token");
  localStorage.setItem("user", JSON.stringify({ id: 1, role: "Customer" }));
  window.location.hash = "#/ai";
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Prepare appointment" }));
  fireEvent.click(screen.getByRole("button", { name: "Choose partner" }));
  expect(screen.getByText("Private symptoms from first account")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Expire session" }));
  fireEvent.click(screen.getByRole("button", { name: "Login for partner" }));
  fireEvent.click(screen.getByRole("button", { name: "Sign in as second account" }));
  expect(screen.getByText("No appointment draft")).toBeTruthy();
  expect(screen.queryByText("Private symptoms from first account")).toBeNull();
  localStorage.clear();
});
