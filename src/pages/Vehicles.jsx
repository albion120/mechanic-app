import { t } from "../i18n";
import { useCallback, useEffect, useState } from "react";
import { apiRequest, handleRequestError } from "../api";

const emptyForm = { brand: "", model: "", year: "", licensePlate: "" };

function Vehicles({ onSessionExpired }) {
    const [vehicles, setVehicles] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const loadVehicles = useCallback(async () => {
        try {
            const data = await apiRequest("/api/vehicles");
            if (!Array.isArray(data)) {
                throw new Error(t("Përgjigjja e serverit për veturat nuk është e vlefshme."));
            }
            setVehicles(data);
        } catch (error) {
            setMessage(
                handleRequestError(error, onSessionExpired, t("Nuk mund të ngarkohen veturat."))
            );
        } finally {
            setIsLoading(false);
        }
    }, [onSessionExpired]);

    useEffect(() => {
        let isCurrent = true;

        const loadInitialVehicles = async () => {
            try {
                const data = await apiRequest("/api/vehicles");
                if (!Array.isArray(data)) {
                    throw new Error(t("Përgjigjja e serverit për veturat nuk është e vlefshme."));
                }
                if (isCurrent) setVehicles(data);
            } catch (error) {
                if (isCurrent) {
                    setMessage(
                        handleRequestError(error, onSessionExpired, t("Nuk mund të ngarkohen veturat."))
                    );
                }
            } finally {
                if (isCurrent) setIsLoading(false);
            }
        };

        loadInitialVehicles();
        return () => {
            isCurrent = false;
        };
    }, [onSessionExpired]);

    const resetForm = () => {
        setForm(emptyForm);
        setEditingId(null);
    };

    const saveVehicle = async (event) => {
        event.preventDefault();
        if (isSaving) return;

        setIsSaving(true);
        setMessage("");
        const payload = {
            ...form,
            brand: form.brand.trim(),
            model: form.model.trim(),
            year: Number(form.year),
            licensePlate: form.licensePlate.trim(),
        };

        try {
            await apiRequest(
                editingId === null ? "/api/vehicles" : `/api/vehicles/${editingId}`,
                {
                    method: editingId === null ? "POST" : "PUT",
                    body: payload,
                }
            );
            resetForm();
            await loadVehicles();
            setMessage(editingId === null ? t("Vetura u shtua me sukses.") : t("Vetura u përditësua."));
        } catch (error) {
            setMessage(
                handleRequestError(error, onSessionExpired, t("Nuk mund të ruhet vetura."))
            );
        } finally {
            setIsSaving(false);
        }
    };

    const editVehicle = (vehicle) => {
        setForm({
            brand: vehicle.brand ?? "",
            model: vehicle.model ?? "",
            year: String(vehicle.year ?? ""),
            licensePlate: vehicle.licensePlate ?? "",
        });
        setEditingId(vehicle.id);
        setMessage("");
        document.getElementById("vehicle-form-title")?.scrollIntoView({ behavior: "smooth" });
    };

    const deleteVehicle = async (vehicle) => {
        if (!window.confirm(t("A dëshiron ta fshish {vehicle}?", { vehicle: `${vehicle.brand} ${vehicle.model}` }))) return;
        setMessage("");
        try {
            await apiRequest(`/api/vehicles/${vehicle.id}`, { method: "DELETE" });
            setVehicles((current) => current.filter((item) => item.id !== vehicle.id));
            setMessage(t("Vetura u fshi."));
        } catch (error) {
            setMessage(
                handleRequestError(error, onSessionExpired, t("Nuk mund të fshihet vetura."))
            );
        }
    };

    return (
        <section>
            <div className="page-heading">
                <div>
                    <span className="eyebrow">{t("GARAŽHI YT")}</span>
                    <h1>{t("Veturat e mia")}</h1>
                    <p className="muted">{t("Mbaji të gjitha të dhënat e veturave në një vend.")}</p>
                </div>
                <span className="count-badge">{vehicles.length}{t("vetura")}</span>
            </div>

            <div className="content-grid">
                <section className="panel">
                    <div className="panel-heading">
                        <div>
                            <h2 id="vehicle-form-title">{editingId === null ? t("Shto veturë") : t("Përditëso veturën")}</h2>
                            <p className="muted">{t("Plotëso të dhënat e veturës.")}</p>
                        </div>
                        <span className="panel-icon" aria-hidden="true">+</span>
                    </div>
                    <form className="form-stack" onSubmit={saveVehicle}>
                        <label className="field">
                            <span>{t("Marka")}</span>
                            <input required maxLength="80" value={form.brand} onChange={(event) => setForm({ ...form, brand: event.target.value })} placeholder="p.sh. BMW" />
                        </label>
                        <label className="field">
                            <span>{t("Modeli")}</span>
                            <input required maxLength="80" value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} placeholder="p.sh. 320d" />
                        </label>
                        <label className="field">
                            <span>{t("Viti")}</span>
                            <input required type="number" min="1886" max={new Date().getFullYear() + 1} value={form.year} onChange={(event) => setForm({ ...form, year: event.target.value })} placeholder="p.sh. 2019" />
                        </label>
                        <label className="field">
                            <span>{t("Targat")}</span>
                            <input required maxLength="20" value={form.licensePlate} onChange={(event) => setForm({ ...form, licensePlate: event.target.value })} placeholder="p.sh. 05-123-AB" />
                        </label>
                        {message && <p className="notice" role="status">{message}</p>}
                        <div className="form-actions">
                            {editingId !== null && <button className="button button-quiet" type="button" onClick={resetForm}>{t("Anulo")}</button>}
                            <button className="button button-primary" type="submit" disabled={isSaving}>
                                {isSaving ? t("Duke ruajtur...") : editingId === null ? t("Shto veturën") : t("Ruaj ndryshimet")}
                            </button>
                        </div>
                    </form>
                </section>

                <section className="vehicle-section">
                    <div className="section-heading">
                        <div>
                            <h2>{t("Garazhi")}</h2>
                            <p className="muted">{t("Vetura të regjistruara në llogarinë tënde.")}</p>
                        </div>
                        <button className="button button-quiet button-small" onClick={() => { setIsLoading(true); setMessage(""); loadVehicles(); }} disabled={isLoading}>{t("Rifresko")}</button>
                    </div>
                    {isLoading ? (
                        <div className="empty-state"><span className="spinner" />{t("Duke ngarkuar veturat...")}</div>
                    ) : vehicles.length === 0 ? (
                        <div className="empty-state">
                            <span className="empty-icon" aria-hidden="true">◇</span>
                            <h3>{t("Garazhi është bosh")}</h3>
                            <p>{t("Shto veturën e parë për të filluar.")}</p>
                        </div>
                    ) : (
                        <div className="vehicle-list">
                            {vehicles.map((vehicle) => (
                                <article className="vehicle-card" key={vehicle.id}>
                                    <div className="vehicle-symbol" aria-hidden="true">↗</div>
                                    <div className="vehicle-info">
                                        <span className="eyebrow">{vehicle.year}</span>
                                        <h3>{vehicle.brand} {vehicle.model}</h3>
                                        <span className="plate">{vehicle.licensePlate}</span>
                                    </div>
                                    <div className="card-actions">
                                        <button className="button button-quiet button-small" onClick={() => editVehicle(vehicle)}>{t("Ndrysho")}</button>
                                        <button className="button button-danger button-small" onClick={() => deleteVehicle(vehicle)}>{t("Fshij")}</button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </section>
    );
}

export default Vehicles;
