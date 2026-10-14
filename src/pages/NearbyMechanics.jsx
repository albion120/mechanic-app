import { t } from "../i18n";
import { useEffect, useRef, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import MechanicTranslator from "../components/MechanicTranslator";
import "leaflet/dist/leaflet.css";
import { apiRequest, handleRequestError } from "../api";

const userLocationIcon = L.divIcon({
  className: "user-location-marker",
  html: "<span></span>",
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const mechanicLocationIcon = L.divIcon({
  className: "mechanic-location-marker",
  html: "<span aria-hidden=\"true\">🔧</span>",
  iconSize: [38, 38],
  iconAnchor: [19, 36],
  popupAnchor: [0, -34],
});

function getGoogleMapsSearchUrl(searchText, location) {
  const query = searchText.trim();
  const isServiceSearch = /\b(auto|servis|service|mekanik|mechanic|garage|gomister)\b/i.test(query);
  const searchQuery = query
    ? isServiceSearch ? query : `auto repair shops near ${query}`
    : location
      ? `auto repair shops near ${location.latitude},${location.longitude}`
      : "auto repair shops near me";

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchQuery)}`;
}

function MapFocus({ location }) {
  const map = useMap();

  useEffect(() => {
    if (location) map.flyTo([location.latitude, location.longitude], 16);
  }, [location, map]);

  return null;
}

function MapClickHandler({ onSelect }) {
  useMapEvents({
    click: ({ latlng }) => onSelect({
      latitude: latlng.lat,
      longitude: latlng.lng >= -180 && latlng.lng <= 180 ? latlng.lng : ((latlng.lng + 180) % 360 + 360) % 360 - 180,
    }),
  });

  return null;
}

function NearbyMechanics({ onSessionExpired } = {}) {
  const [location, setLocation] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem("mechanic-location") || "null");
      return saved && Date.now() - saved.savedAt < 3600000 && Number.isFinite(saved.latitude) && Math.abs(saved.latitude) <= 90 && Number.isFinite(saved.longitude) && Math.abs(saved.longitude) <= 180 ? saved : null;
    } catch { return null; }
  });
  const pending = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [locationSource, setLocationSource] = useState("");
  const [mechanics, setMechanics] = useState([]);
  const [mapStyle, setMapStyle] = useState("street");
  const [address, setAddress] = useState("");
  const [locationMatches, setLocationMatches] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [message, setMessage] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const searchNearbyAt = async (center, source = "map") => {
    if (pending.current) return;
    pending.current = true;
    setLocation(center);
    try { sessionStorage.setItem("mechanic-location", JSON.stringify({ ...center, savedAt: Date.now() })); } catch { /* Storage disabled. */ }
    setLocationSource(source);
    setSelectedLocation(center);
    setMechanics([]);
    setLocationMatches([]);
    setMessage("");
    setIsSearching(true);
    try {
      const result = await apiRequest("/api/mechanics/nearby", {
        method: "POST",
        body: { latitude: center.latitude, longitude: center.longitude, radiusMeters: 5000 },
      });
      if (!Array.isArray(result)) throw new Error(t("Përgjigjja e serviseve nuk është e vlefshme."));
      if (!mounted.current) return;
      setMechanics(result);
      if (result.length === 0) setMessage(t("Nuk u gjetën servise të regjistruara në OpenStreetMap brenda 5 km."));
    } catch (error) {
      setMessage(handleRequestError(error, onSessionExpired, t("Serviset nuk mund të ngarkohen.")));
    } finally {
      pending.current = false;
      if (mounted.current) setIsSearching(false);
    }
  };

  const searchNearby = () => {
    if (pending.current) return;
    if (!navigator.geolocation) {
      setMessage(t("Shfletuesi nuk e mbështet gjeolokacionin. Provo një shfletues tjetër."));
      return;
    }
    setIsSearching(true);
    setMessage("");
    pending.current = true;
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      pending.current = false;
      if (!mounted.current) return;
      const center = { latitude: coords.latitude, longitude: coords.longitude };
      void searchNearbyAt(center, "device");
    }, (error) => {
      pending.current = false;
      if (!mounted.current) return;
      const reason = error.code === error.PERMISSION_DENIED
        ? t("Leja për vendndodhje u refuzua. Lejoje në cilësimet e shfletuesit dhe provo përsëri.")
        : t("Vendndodhja nuk mund të merret. Kontrollo cilësimet e shfletuesit dhe provo përsëri.");
      setMessage(reason);
      setIsSearching(false);
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
  };

  const searchAddress = async (event) => {
    event.preventDefault();
    if (pending.current) return;
    const query = address.trim();
    if (query.length < 2) {
      setMessage(t("Shkruaj të paktën 2 shkronja për vendin që po kërkon."));
      return;
    }

    setIsSearching(true);
    setMessage("");
    setLocationMatches([]);
    pending.current = true;
    try {
      const result = await apiRequest(
        `/api/mechanics/search-location?query=${encodeURIComponent(query)}`
      );
      if (!Array.isArray(result)) throw new Error(t("Përgjigjja e vendeve nuk është e vlefshme."));
      if (!mounted.current) return;
      setLocationMatches(result);
      if (result.length === 0) setMessage(t("Nuk u gjet ky vend. Provo me një emër tjetër ose shtyp pikën në hartë."));
    } catch (error) {
      setMessage(handleRequestError(error, onSessionExpired, t("Vendi nuk mund të kërkohet.")));
    } finally {
      pending.current = false;
      if (mounted.current) setIsSearching(false);
    }
  };

  const searchAgain = () => {
    if (location && locationSource !== "device") {
      void searchNearbyAt(location, locationSource);
    } else {
      searchNearby();
    }
  };

  return (
    <section>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{t("GJETJA E SERVISEVE")}</span>
          <h1>{t("Mekanika pranë teje")}</h1>
          <p className="muted">{t("Rezultatet në hartën tonë vijnë nga OpenStreetMap dhe mund të jenë jo të plota. Për më shumë rezultate, kërko edhe në Google Maps.")}</p>
        </div>
        <button className="button button-primary" onClick={searchAgain} disabled={isSearching}>
          {isSearching ? t("Duke kërkuar...") : location ? t("Kërko përsëri") : t("Përdor vendndodhjen")}
        </button>
      </div>
      <p className="notice notice-info location-privacy">{t("Shkruaj emrin e servisit ose adresën dhe zgjidh vendin për kërkim, ose kliko pikën në hartë. Mund ta përdorësh edhe vendndodhjen tënde. Kërkimi dërgohet te OpenStreetMap. Rezultatet ruhen përkohësisht në cache; pika e zgjedhur ruhet në këtë skedë për një orë.")}</p>
      <form className="location-search" onSubmit={searchAddress}>
        <label htmlFor="mechanic-location">{t("Emri i servisit ose adresa")}</label>
        <div className="location-search-controls">
          <input
            id="mechanic-location"
            type="search"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder={t("p.sh. Berlin, Milano ose një adresë")}
            maxLength={120}
          />
          <button className="button button-primary" type="submit" disabled={isSearching}>{t("Kërko në hartë")}</button>
          <a
            className="button button-quiet"
            href={getGoogleMapsSearchUrl(address, location)}
            target="_blank"
            rel="noreferrer"
          >{t("Kërko në Google Maps")}</a>
        </div>
      </form>
      {locationMatches.length > 0 && (
        <div className="location-results" aria-label={t("Zgjidh vendin")}>
          {locationMatches.map((match) => (
            <button
              key={`${match.latitude},${match.longitude}`}
              type="button"
              disabled={isSearching}
              onClick={() => void searchNearbyAt({
                latitude: match.latitude,
                longitude: match.longitude,
              }, "address")}
            >
              {match.displayName}
            </button>
          ))}
        </div>
      )}
      {message && <p className={mechanics.length ? "notice notice-info mechanic-message" : "notice notice-error mechanic-message"} role="status">{message}</p>}
      {!location && <p className="muted map-instructions">{t("Kliko hartën për të zgjedhur zonën ku të kërkohen serviset; shenjat me çelës tregojnë serviset e gjetura.")}</p>}
      <div className="mechanics-map">
        <div className="map-style-control" role="group" aria-label={t("Pamja e hartës")}>
          <button
            type="button"
            className={mapStyle === "street" ? "active" : ""}
            aria-pressed={mapStyle === "street"}
            onClick={() => setMapStyle("street")}
          >{t("Rrugët")}</button>
          <button
            type="button"
            className={mapStyle === "satellite" ? "active" : ""}
            aria-pressed={mapStyle === "satellite"}
            onClick={() => setMapStyle("satellite")}
          >{t("Satelit")}</button>
        </div>
        <MapContainer
          center={location
            ? [location.latitude, location.longitude]
            : [20, 0]}
          zoom={location ? 13 : 2}
          scrollWheelZoom
        >
          <MapFocus location={selectedLocation ?? location} />
          <MapClickHandler onSelect={(center) => void searchNearbyAt(center)} />
          <TileLayer
            attribution={mapStyle === "street"
              ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              : "Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community"}
            url={mapStyle === "street"
              ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"}
          />
          {location && (
            <Marker position={[location.latitude, location.longitude]} icon={userLocationIcon}>
              <Popup>{locationSource === "device" ? t("Ti je këtu") : t("Pika e zgjedhur për kërkim")}</Popup>
            </Marker>
          )}
          {mechanics.map((mechanic) => (
            <Marker key={mechanic.id} position={[mechanic.latitude, mechanic.longitude]} icon={mechanicLocationIcon}>
              <Popup>
                <strong>{t("🔧 SERVIS ·")}{mechanic.name || t("Pa emër në OpenStreetMap")}</strong><br />
                {mechanic.distanceMeters < 1000 ? `${Math.round(mechanic.distanceMeters)} m` : `${(mechanic.distanceMeters / 1000).toFixed(1)} km`}
                {mechanic.address && <><br />{mechanic.address}</>}
                <br /><a href={mechanic.openStreetMapUrl} target="_blank" rel="noreferrer">{t("Shiko në OpenStreetMap")}</a>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        {location && (
          <div className="map-legend" aria-label={t("Shenjat në hartë")}>
            <span><span className="map-legend-user" aria-hidden="true" /> {locationSource === "device" ? t("Ti je këtu") : t("Pika e kërkimit")}</span>
            <span><span className="map-legend-mechanic" aria-hidden="true">🔧</span>{t("Servis i gjetur")}</span>
          </div>
        )}
      </div>
      {location && (
        <>
          <div className="section-heading mechanics-heading"><div><h2>{t("Serviset e gjetura")}</h2><p className="muted">{mechanics.length}{t("rezultate · brenda 5 km")}</p></div></div>
          {mechanics.length > 0 && <div className="mechanics-list">{mechanics.map((mechanic) => (
            <article className="mechanic-card" key={mechanic.id}>
              <div className="vehicle-symbol" aria-hidden="true">🔧</div>
              <div className="vehicle-info">
                <h3>{mechanic.name || t("Servis pa emër në OpenStreetMap")}</h3>
                <p>{mechanic.address || t("Adresa nuk është dhënë")}</p>
                <span className="muted">{mechanic.distanceMeters < 1000 ? t("{distance} larg", { distance: `${Math.round(mechanic.distanceMeters)} m` }) : t("{distance} larg", { distance: `${(mechanic.distanceMeters / 1000).toFixed(1)} km` })}</span>
                <p className="muted">{mechanic.openingHours || t("Orari nuk është dhënë")}</p>
                {!mechanic.phone && <p className="muted">{t("Telefoni nuk është dhënë")}</p>}
                {!mechanic.website && <p className="muted">{t("Uebfaqja nuk është dhënë")}</p>}
                <div className="mechanic-links">
                  <button
                    type="button"
                    onClick={() => setSelectedLocation({
                      latitude: mechanic.latitude,
                      longitude: mechanic.longitude,
                    })}
                  >{t("Shiko në hartë")}</button>
                  {mechanic.phone && <a href={`tel:${mechanic.phone.replace(/[^+0-9,;*#]/g, "")}`}>{mechanic.phone}</a>}
                  {/^https?:\/\//i.test(mechanic.website || "") && <a href={mechanic.website} target="_blank" rel="noreferrer">{t("Uebfaqja")}</a>}
                  <a href={mechanic.openStreetMapUrl} target="_blank" rel="noreferrer">{t("OpenStreetMap")}</a>
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${mechanic.latitude},${mechanic.longitude}`} target="_blank" rel="noreferrer">{t("Udhëzime")}</a>
                </div>
              </div>
              <span className="muted">{t("Servis publik · Kontakto direkt për termin")}</span>
            </article>
          ))}</div>}
        </>
      )}
      <MechanicTranslator />
      <p className="map-attribution">{t("Serviset shënohen me ikonën 🔧. Të dhënat e bizneseve: OpenStreetMap contributors, licencë ODbL. Konfirmo detajet direkt me servisin para vizitës.")}</p>
    </section>
  );
}

export default NearbyMechanics;
