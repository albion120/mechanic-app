import { t, dateLocale } from "../i18n";
import { useCallback, useEffect, useState } from "react";
import { apiRequest, handleRequestError } from "../api";

const emptyForm = { vehicleId: "", appointmentDate: "", description: "" };

function toLocalDateTime(value) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function Appointments({ onSessionExpired, bookingDraft }) {
  const [appointments, setAppointments] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState(() =>
    bookingDraft
      ? {
          vehicleId: bookingDraft.vehicleId ? String(bookingDraft.vehicleId) : "",
          appointmentDate: "",
          description: bookingDraft.description,
        }
      : emptyForm
  );
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [appointmentData, vehicleData] = await Promise.all([
        apiRequest("/api/serviceappointments"),
        apiRequest("/api/vehicles"),
      ]);
      if (!Array.isArray(appointmentData) || !Array.isArray(vehicleData)) {
        throw new Error(t("Përgjigjja e serverit për terminet nuk është e vlefshme."));
      }
      setAppointments(appointmentData);
      setVehicles(vehicleData);
      return true;
    } catch (error) {
      setMessage(
        handleRequestError(error, onSessionExpired, t("Nuk mund të ngarkohen terminet."))
      );
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [onSessionExpired]);

  useEffect(() => {
    let isCurrent = true;

    const loadInitialData = async () => {
      try {
        const [appointmentData, vehicleData] = await Promise.all([
          apiRequest("/api/serviceappointments"),
          apiRequest("/api/vehicles"),
        ]);
        if (!Array.isArray(appointmentData) || !Array.isArray(vehicleData)) {
          throw new Error(t("Përgjigjja e serverit për terminet nuk është e vlefshme."));
        }
        if (isCurrent) {
          setAppointments(appointmentData);
          setVehicles(vehicleData);
        }
      } catch (error) {
        if (isCurrent) {
          setMessage(
            handleRequestError(error, onSessionExpired, t("Nuk mund të ngarkohen terminet."))
          );
        }
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };

    loadInitialData();
    return () => {
      isCurrent = false;
    };
  }, [onSessionExpired]);

  const saveAppointment = async (event) => {
    event.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setMessage("");
    try {
      await apiRequest(
        editingId === null
          ? "/api/serviceappointments"
          : `/api/serviceappointments/${editingId}`,
        {
          method: editingId === null ? "POST" : "PUT",
          body: {
            vehicleId: Number(form.vehicleId),
            appointmentDate: new Date(form.appointmentDate).toISOString(),
            description: form.description.trim(),
          },
        }
      );
      setForm(emptyForm);
      setEditingId(null);
      if (await loadData()) {
        setMessage(editingId === null ? t("Termini u krijua.") : t("Termini u përditësua."));
      }
    } catch (error) {
      setMessage(
        handleRequestError(error, onSessionExpired, t("Nuk mund të ruhet termini."))
      );
    } finally {
      setIsSaving(false);
    }
  };

  const editAppointment = (appointment) => {
    setEditingId(appointment.id);
    setForm({
      vehicleId: String(appointment.vehicle?.id ?? appointment.vehicleId ?? ""),
      appointmentDate: toLocalDateTime(appointment.appointmentDate),
      description: appointment.description ?? "",
    });
    setMessage("");
  };

  const deleteAppointment = async (appointment) => {
    if (!window.confirm(t("A dëshiron ta fshish këtë termin?"))) return;
    setMessage("");
    try {
      await apiRequest(`/api/serviceappointments/${appointment.id}`, {
        method: "DELETE",
      });
      setAppointments((current) =>
        current.filter((item) => item.id !== appointment.id)
      );
      if (editingId === appointment.id) {
        setEditingId(null);
        setForm(emptyForm);
      }
      setMessage(t("Termini u fshi."));
    } catch (error) {
      setMessage(
        handleRequestError(error, onSessionExpired, t("Nuk mund të fshihet termini."))
      );
    }
  };

  const getVehicleName = (appointment) => {
    const vehicle = appointment.vehicle ??
      vehicles.find((item) => item.id === appointment.vehicleId);
    return vehicle
      ? `${vehicle.brand} ${vehicle.model}`
      : `Vetura #${appointment.vehicleId ?? "?"}`;
  };

  return (
    <section>
      <p className="notice notice-info">{t("Terminet këtu janë planifikim personal; nuk konfirmojnë rezervim te një servis i jashtëm. Kontakto servisin për konfirmim.")}</p>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{t("PLANIFIKO SERVISIN")}</span>
          <h1>{t("Terminet e mia")}</h1>
          <p className="muted">{t("Cakto dhe ndiq vizitat e veturave në servis.")}</p>
        </div>
        <span className="count-badge">{appointments.length}{t("termine")}</span>
      </div>

      {message && <p className="notice" role="status">{message}</p>}
      {vehicles.length === 0 && !isLoading ? (
        !message && <div className="notice notice-info">{t("Shto së pari një veturë që të mund të caktosh termin.")}</div>
      ) : (
        <section className="panel appointment-form-panel">
          <div className="panel-heading">
            <div>
              <h2>{editingId === null ? t("Cakto termin") : t("Ndrysho termin")}</h2>
              <p className="muted">{t("Zgjidh veturën dhe kohën e përshtatshme.")}</p>
            </div>
            <span className="panel-icon" aria-hidden="true">◷</span>
          </div>
          <form onSubmit={saveAppointment}>
            <fieldset className="appointment-form form-fields" disabled={isSaving}>
            <label className="field">
              <span>{t("Vetura")}</span>
              <select required value={form.vehicleId} onChange={(event) => setForm({ ...form, vehicleId: event.target.value })}>
                <option value="">{t("Zgjidh veturën")}</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.brand} {vehicle.model} · {vehicle.licensePlate}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{t("Data dhe ora")}</span>
              <input required type="datetime-local" value={form.appointmentDate} onChange={(event) => setForm({ ...form, appointmentDate: event.target.value })} />
            </label>
            <label className="field field-description">
              <span>{t("Çfarë shërbimi të duhet?")}</span>
              <input required maxLength="5000" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder={t("p.sh. Kontroll periodik i veturës")} />
            </label>
            <div className="form-actions">
              {editingId !== null && (
                <button className="button button-quiet" type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }}>{t("Anulo")}</button>
              )}
              <button className="button button-primary" type="submit" disabled={isSaving}>
                {isSaving ? t("Duke ruajtur...") : editingId === null ? t("Cakto termin") : t("Ruaj ndryshimet")}
              </button>
            </div>
            </fieldset>
          </form>
        </section>
      )}

      <div className="section-heading appointment-list-heading">
        <div>
          <h2>{t("Terminet e planifikuara")}</h2>
          <p className="muted">{t("Historiku dhe statusi i termineve të tua.")}</p>
        </div>
        <button className="button button-quiet button-small" onClick={() => { setIsLoading(true); setMessage(""); loadData(); }} disabled={isLoading}>{t("Rifresko")}</button>
      </div>
      {isLoading ? (
        <div className="empty-state"><span className="spinner" />{t("Duke ngarkuar terminet...")}</div>
      ) : appointments.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon" aria-hidden="true">◷</span>
          <h3>{t("Nuk ke termine të planifikuara")}</h3>
          <p>{t("Termini i ri do të shfaqet këtu.")}</p>
        </div>
      ) : (
        <div className="appointment-list">
          {appointments
            .slice()
            .sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate))
            .map((appointment) => (
              <article className="appointment-card" key={appointment.id}>
                <div className="appointment-date">
                  <span>{new Intl.DateTimeFormat(dateLocale(), { day: "2-digit" }).format(new Date(appointment.appointmentDate))}</span>
                  <small>{new Intl.DateTimeFormat(dateLocale(), { month: "short" }).format(new Date(appointment.appointmentDate))}</small>
                </div>
                <div className="appointment-details">
                  <div className="appointment-title-row">
                    <h3>{getVehicleName(appointment)}</h3>
                    <span className={`status-badge status-${(appointment.status || "pending").toLowerCase()}`}>
                      {t(appointment.status || "Pending")}
                    </span>
                  </div>
                  <p>{appointment.description}</p>
                  <span className="muted">{new Intl.DateTimeFormat(dateLocale(), { dateStyle: "medium", timeStyle: "short" }).format(new Date(appointment.appointmentDate))}</span>
                </div>
                <div className="card-actions">
                  <button className="button button-quiet button-small" disabled={isSaving} onClick={() => editAppointment(appointment)}>{t("Ndrysho")}</button>
                  <button className="button button-danger button-small" disabled={isSaving} onClick={() => deleteAppointment(appointment)}>{t("Fshij")}</button>
                </div>
              </article>
            ))}
        </div>
      )}
    </section>
  );
}

export default Appointments;
