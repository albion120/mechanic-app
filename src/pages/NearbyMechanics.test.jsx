/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "../api";
import NearbyMechanics from "./NearbyMechanics";

const mapHandlers = vi.hoisted(() => ({}));

vi.mock("../api", () => ({
  apiRequest: vi.fn(),
  handleRequestError: (error) => error.message,
}));

vi.mock("leaflet", () => ({
  default: { divIcon: vi.fn(() => ({})) },
}));

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }) => <div>{children}</div>,
  Marker: ({ children }) => <div>{children}</div>,
  Popup: ({ children }) => <div>{children}</div>,
  TileLayer: ({ url }) => <div data-testid="map-tile-layer" data-url={url} />,
  useMap: () => ({ flyTo: vi.fn() }),
  useMapEvents: (handlers) => {
    mapHandlers.click = handlers.click;
  },
}));

describe("NearbyMechanics", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mapHandlers.click = undefined;
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: vi.fn((success) => success({
          coords: { latitude: 42.66, longitude: 21.16 },
        })),
      },
    });
    apiRequest.mockResolvedValue([{
      id: "node/12",
      name: "Servis Prishtina",
      latitude: 42.661,
      longitude: 21.161,
      distanceMeters: 130,
      phone: "+38344123456",
      openStreetMapUrl: "https://www.openstreetmap.org/node/12",
    }]);
  });

  it("requests location only after user action and hands off a real result", async () => {
    const onBookService = vi.fn();
    render(<NearbyMechanics onSessionExpired={vi.fn()} onBookService={onBookService} />);

    expect(navigator.geolocation.getCurrentPosition).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Përdor vendndodhjen" }));
    await screen.findAllByText("Servis Prishtina");

    expect(apiRequest).toHaveBeenCalledWith("/api/mechanics/nearby", {
      method: "POST",
      body: { latitude: 42.66, longitude: 21.16, radiusMeters: 5000 },
    });
    expect(screen.getByText("130 m larg")).toBeTruthy();
    expect(screen.getByTestId("map-tile-layer").getAttribute("data-url"))
      .toContain("tile.openstreetmap.org");
    fireEvent.click(screen.getByRole("button", { name: "Satelit" }));
    expect(screen.getByTestId("map-tile-layer").getAttribute("data-url"))
      .toContain("World_Imagery");
    fireEvent.click(screen.getByRole("button", { name: "Shiko në hartë" }));
    expect(screen.queryByRole("button", { name: "Kërko termin" })).toBeNull();
    expect(onBookService).not.toHaveBeenCalled();
    expect(screen.getByText("Orari nuk është dhënë")).toBeTruthy();
  });

  it("shows the user's map location even when the mechanic search fails", async () => {
    apiRequest.mockRejectedValue(new Error(
      "Kërkimi i serviseve nuk është i disponueshëm. Burimi i të dhënave OpenStreetMap nuk u përgjigj. Provo përsëri më vonë."
    ));
    render(<NearbyMechanics onSessionExpired={vi.fn()} onBookService={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Përdor vendndodhjen" }));

    expect(await screen.findByText(
      "Kërkimi i serviseve nuk është i disponueshëm. Burimi i të dhënave OpenStreetMap nuk u përgjigj. Provo përsëri më vonë."
    )).toBeTruthy();
    expect(screen.getAllByLabelText("Shenjat në hartë").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Ti je këtu").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Servis i gjetur").length).toBeGreaterThan(0);
  });

  it("searches by address and then finds mechanics at the selected result", async () => {
    apiRequest.mockResolvedValueOnce([{
      displayName: "Auto Servis Prishtina, Kosovë",
      latitude: 42.65,
      longitude: 21.16,
    }]);
    render(<NearbyMechanics onSessionExpired={vi.fn()} onBookService={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Emri i servisit ose adresa"), {
      target: { value: "Auto Servis Prishtina" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Kërko në hartë" }));
    fireEvent.click(await screen.findByRole("button", { name: "Auto Servis Prishtina, Kosovë" }));

    await screen.findAllByText("Servis Prishtina");
    expect(apiRequest).toHaveBeenNthCalledWith(
      1,
      "/api/mechanics/search-location?query=Auto%20Servis%20Prishtina"
    );
    expect(apiRequest).toHaveBeenNthCalledWith(2, "/api/mechanics/nearby", {
      method: "POST",
      body: { latitude: 42.65, longitude: 21.16, radiusMeters: 5000 },
    });
    expect(screen.getByText("Pika e kërkimit")).toBeTruthy();
  });

  it("offers Google Maps search for the entered location", () => {
    render(<NearbyMechanics onSessionExpired={vi.fn()} onBookService={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Emri i servisit ose adresa"), {
      target: { value: "Neredime e Ulët, Ferizaj" },
    });

    expect(screen.getByRole("link", { name: "Kërko në Google Maps" }).getAttribute("href"))
      .toBe("https://www.google.com/maps/search/?api=1&query=auto%20repair%20shops%20near%20Neredime%20e%20Ul%C3%ABt%2C%20Ferizaj");
  });

  it("searches around the point clicked on the map", async () => {
    render(<NearbyMechanics onSessionExpired={vi.fn()} onBookService={vi.fn()} />);

    mapHandlers.click({ latlng: { lat: 42.7, lng: 21.2 } });

    await screen.findAllByText("Servis Prishtina");
    expect(apiRequest).toHaveBeenCalledWith("/api/mechanics/nearby", {
      method: "POST",
      body: { latitude: 42.7, longitude: 21.2, radiusMeters: 5000 },
    });
  });
});
