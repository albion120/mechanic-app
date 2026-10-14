/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Login from "./Login";

vi.mock("../api", () => ({
  apiRequest: vi.fn(),
}));

describe("Login password visibility", () => {
  it("shows and hides the login password without changing its value", () => {
    render(<Login onLogin={vi.fn()} />);

    const password = screen.getByLabelText("Fjalëkalimi");
    fireEvent.change(password, { target: { value: "MySecret123" } });
    expect(password.type).toBe("password");

    fireEvent.click(screen.getByRole("button", { name: "Shfaq fjalëkalimin" }));
    expect(password.type).toBe("text");
    expect(password.value).toBe("MySecret123");

    fireEvent.click(screen.getByRole("button", { name: "Fshih fjalëkalimin" }));
    expect(password.type).toBe("password");
    expect(password.value).toBe("MySecret123");
  });

  it("toggles the confirmation password independently during registration", () => {
    render(<Login onLogin={vi.fn()} initialMode="register" />);

    const password = screen.getByLabelText("Fjalëkalimi");
    const confirmation = screen.getByLabelText("Përsërit fjalëkalimin");
    fireEvent.change(password, { target: { value: "MySecret123" } });
    fireEvent.change(confirmation, { target: { value: "MySecret12" } });
    fireEvent.click(screen.getByRole("button", { name: "Shfaq konfirmimin e fjalëkalimit" }));

    expect(password.type).toBe("password");
    expect(confirmation.type).toBe("text");
    expect(confirmation.value).toBe("MySecret12");
  });
});
