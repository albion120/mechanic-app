import { t, dateLocale } from "../i18n";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest, handleRequestError } from "../api";

const statuses = ["Pending", "InProgress", "Completed", "Cancelled"];

function AdminDashboard({ onSessionExpired }) {
  const [appointments, setAppointments] = useState([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [updatingIds, setUpdatingIds] = useState([]);
  const pendingUpdates = useRef(new Set());

  const loadAppointments = useCallback(async () => {
    setMessage("");
    setIsLoading(true);

    try {
      const data = await apiRequest("/api/serviceappointments");
      if (!Array.isArray(data)) {
        throw new Error(t("Përgjigjja e serverit për terminet nuk është e vlefshme."));
      }
      setAppointments(data);
    } catch (error) {
      setMessage(
        handleRequestError(error, onSessionExpired, t("Nuk mund të ngarkohen terminet."))
      );
    } finally {
      setIsLoading(false);
    }
  }, [onSessionExpired]);

  useEffect(() => {
    let isCancelled = false;

    const fetchAppointments = async () => {
      setMessage("");
      setIsLoading(true);

      try {
        const data = await apiRequest("/api/serviceappointments");
        if (!Array.isArray(data)) {
          throw new Error(t("Përgjigjja e serverit për terminet nuk është e vlefshme."));
        }
        if (!isCancelled) {
          setAppointments(data);
        }
      } catch (error) {
        if (!isCancelled) {
          setMessage(
            handleRequestError(error, onSessionExpired, t("Nuk mund të ngarkohen terminet."))
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void fetchAppointments();

    return () => {
      isCancelled = true;
    };
  }, [onSessionExpired]);

  const updateStatus = async (appointment, status) => {
    if (pendingUpdates.current.has(appointment.id)) return;
    pendingUpdates.current.add(appointment.id);
    setUpdatingIds([...pendingUpdates.current]);
    setMessage("");
    try {
      await apiRequest(`/api/serviceappointments/${appointment.id}/status`, {
        method: "PATCH",
        body: { status },
      });
      setAppointments((current) =>
        current.map((item) =>
          item.id === appointment.id ? { ...item, status } : item
        )
      );
      setMessage(t("Statusi u përditësua."));
    } catch (error) {
      setMessage(
        handleRequestError(error, onSessionExpired, t("Nuk mund të përditësohet statusi."))
      );
    } finally {
      pendingUpdates.current.delete(appointment.id);
      setUpdatingIds([...pendingUpdates.current]);
    }
  };

  const counts = statuses.reduce(
    (result, status) => ({
      ...result,
      [status]: appointments.filter(
        (appointment) =>
          (appointment.status || "Pending").toLowerCase() === status.toLowerCase()
      ).length,
    }),
    {}
  );

  return (
    <section>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{t("PANELI I SERVISIT")}</span>
          <h1>{t("Administrimi")}</h1>
          <p className="muted">{t("Shiko terminet dhe përditëso ecurinë e servisit.")}</p>
        </div>
        <button className="button button-quiet" onClick={() => void loadAppointments()} disabled={isLoading || updatingIds.length > 0}>{t("Rifresko")}</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-total">
          <span className="stat-label">{t("Gjithsej")}</span>
          <strong>{appointments.length}</strong>
          <span>{t("termine")}</span>
        </div>
        {statuses.map((status) => (
          <div className="stat-card" key={status}>
            <span className="stat-label">{t(status)}</span>
            <strong>{counts[status]}</strong>
            <span>{t("termine")}</span>
          </div>
        ))}
      </div>

      {message && <p className="notice" role="status">{message}</p>}
      <div className="section-heading">
        <div>
          <h2>{t("Të gjitha terminet")}</h2>
          <p className="muted">{t("Ndryshimet e statusit ruhen menjëherë.")}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="empty-state"><span className="spinner" />{t("Duke ngarkuar terminet...")}</div>
      ) : appointments.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon" aria-hidden="true">◷</span>
          <h3>{t("Nuk ka termine për momentin")}</h3>
          <p>{t("Terminet e klientëve do të shfaqen këtu.")}</p>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("Termini")}</th>
                <th>{t("Vetura")}</th>
                <th>{t("Shërbimi")}</th>
                <th>{t("Statusi")}</th>
                <th>{t("Ndrysho statusin")}</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appointment) => (
                <tr key={appointment.id}>
                  <td>{new Intl.DateTimeFormat(dateLocale(), { dateStyle: "medium", timeStyle: "short" }).format(new Date(appointment.appointmentDate))}</td>
                  <td>
                    {appointment.vehicle
                      ? `${appointment.vehicle.brand} ${appointment.vehicle.model}`
                      : `#${appointment.vehicleId ?? "?"}`}
                  </td>
                  <td>{appointment.description}</td>
                  <td>
                    <span className={`status-badge status-${(appointment.status || "pending").toLowerCase()}`}>
                      {t(appointment.status || "Pending")}
                    </span>
                  </td>
                  <td>
                    <select
                      disabled={updatingIds.includes(appointment.id) || isLoading}
                      aria-label={t("Ndrysho statusin e terminit {id}", { id: appointment.id })}
                      value={appointment.status || "Pending"}
                      onChange={(event) => updateStatus(appointment, event.target.value)}
                    >
                      {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default AdminDashboard;
