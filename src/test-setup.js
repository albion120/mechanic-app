import { afterEach, beforeEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { setLanguage } from "./i18n";

beforeEach(() => {
  setLanguage("sq");
  if (typeof window !== "undefined") {
    window.history.replaceState(null, "", "/");
  }
});
afterEach(cleanup);
