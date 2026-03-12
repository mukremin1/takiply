import { useEffect, useMemo, useState } from "react";
import { getMedications } from "../api/integrations";

const PROGRESS_STORAGE_KEY = "takiply-progress-medication-taken-v1";

export default function Progress() {
  const [medications, setMedications] = useState([]);
  const [takenByMedication, setTakenByMedication] = useState(() => {
    const saved = window.localStorage.getItem(PROGRESS_STORAGE_KEY);

    if (!saved) {
      return {};
    }

    try {
      const parsed = JSON.parse(saved);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      window.localStorage.removeItem(PROGRESS_STORAGE_KEY);
      return {};
    }
  });

  useEffect(() => {
    let active = true;

    getMedications().then((data) => {
      if (!active) {
        return;
      }

      setMedications(data);
      setTakenByMedication((prev) => {
        const next = { ...prev };

        data.forEach((item) => {
          if (typeof next[item.id] !== "number") {
            next[item.id] = 0;
          }
        });

        return next;
      });
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(takenByMedication));
  }, [takenByMedication]);

  const totalTaken = useMemo(
    () => Object.values(takenByMedication).reduce((sum, value) => sum + value, 0),
    [takenByMedication]
  );

  const totalCapacity = useMemo(
    () => medications.reduce((sum, item) => sum + Math.max(Number(item.stock) || 0, 1), 0),
    [medications]
  );

  const globalPercent = totalCapacity ? Math.round((totalTaken / totalCapacity) * 100) : 0;

  const incrementDose = (item) => {
    setTakenByMedication((prev) => {
      const current = prev[item.id] ?? 0;
      const max = Math.max(Number(item.stock) || 0, 1);
      return {
        ...prev,
        [item.id]: Math.min(current + 1, max)
      };
    });
  };

  const decrementDose = (item) => {
    setTakenByMedication((prev) => {
      const current = prev[item.id] ?? 0;
      return {
        ...prev,
        [item.id]: Math.max(current - 1, 0)
      };
    });
  };

  const resetBox = (item) => {
    setTakenByMedication((prev) => ({
      ...prev,
      [item.id]: 0
    }));
  };

  return (
    <section className="progress-screen">
      <header className="progress-head">
        <h2>Bugün Nasılsın?</h2>
        <p>7 günlük sağlık özetini gör</p>
      </header>

      <section className="progress-feel-section">
        <h3>Nasıl Hissediyorsun?</h3>
        <div className="progress-chip-row">
          <button type="button" className="progress-chip">Kötü</button>
          <button type="button" className="progress-chip">Orta</button>
          <button type="button" className="progress-chip is-active">İyi</button>
          <button type="button" className="progress-chip">Harika</button>
        </div>
      </section>

      <section className="progress-summary-card">
        <div className="progress-summary-top">
          <p>Son 7 Gün</p>
          <span>Ücretsiz</span>
        </div>
        <h4>İlaç Uyumu</h4>
        <div className="progress-summary-value">
          <strong>{globalPercent}%</strong>
          <small>
            {totalTaken}/{totalCapacity || 0} doz alındı
          </small>
        </div>
        <div className="progress-summary-bar">
          <span style={{ width: `${globalPercent}%` }} />
        </div>
      </section>

      <section className="progress-list">
        {medications.map((item) => {
          const totalBoxCount = Math.max(Number(item.stock) || 0, 1);
          const taken = Math.min(takenByMedication[item.id] ?? 0, totalBoxCount);
          const percent = Math.round((taken / totalBoxCount) * 100);
          const isBoxCompleted = taken >= totalBoxCount;

          return (
            <article key={item.id} className="progress-med-card">
              <div className="progress-med-top">
                <div>
                  <h4>{item.name}</h4>
                  <p>{item.schedule}</p>
                </div>
                <span className="progress-med-percent">{percent}%</span>
              </div>

              <p className="progress-med-count">
                {taken}/{totalBoxCount} {item.unit} alındı
              </p>

              <div className="progress-med-bar">
                <span style={{ width: `${percent}%` }} />
              </div>

              <div className="progress-med-actions">
                <button type="button" onClick={() => decrementDose(item)} disabled={taken <= 0}>
                  -1 Geri
                </button>
                <button type="button" onClick={() => incrementDose(item)} disabled={isBoxCompleted}>
                  İlaç Aldım
                </button>
                <button type="button" onClick={() => resetBox(item)} disabled={!isBoxCompleted}>
                  Kutu Bitti - Sıfırla
                </button>
              </div>
            </article>
          );
        })}
      </section>
    </section>
  );
}
