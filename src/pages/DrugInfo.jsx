import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getDrugInfoByBarcode } from "../api/integrations";

export default function DrugInfo() {
  const [searchParams] = useSearchParams();
  const barcode = (searchParams.get("barcode") || "").trim();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [drug, setDrug] = useState(null);

  useEffect(() => {
    let active = true;

    if (!barcode) {
      Promise.resolve().then(() => {
        if (!active) {
          return;
        }

        setDrug(null);
        setError("");
        setLoading(false);
      });

      return () => {
        active = false;
      };
    }

    Promise.resolve().then(() => {
      if (!active) {
        return;
      }

      setLoading(true);
      setError("");
    });

    getDrugInfoByBarcode(barcode)
      .then((result) => {
        if (!active) {
          return;
        }

        setDrug(result);
      })
      .catch((requestError) => {
        if (!active) {
          return;
        }

        setError(requestError?.message || "İlaç bilgisi alınamadı.");
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [barcode]);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">İlaç Bilgisi</h2>
        <p className="mt-1 text-sm text-slate-600">Barkoddan ürün bilgisi ve temel uyarılar.</p>
      </div>

      <article className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-xs font-medium text-slate-500">Barkod</p>
        <p className="mt-1 text-sm font-semibold text-slate-900">{barcode || "-"}</p>
      </article>

      {loading ? (
        <article className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">Barkod sorgulanıyor...</article>
      ) : null}

      {error ? (
        <article className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</article>
      ) : null}

      {!loading && !error && barcode && !drug ? (
        <article className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800">Bu barkod için kayıtlı ilaç bulunamadı.</p>
          <Link to="/medications" className="inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            İlaçlarıma Dön
          </Link>
        </article>
      ) : null}

      {drug ? (
        <div className="space-y-3">
          <article className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="text-lg font-semibold text-slate-900">{drug.name}</h3>
            <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
              <p>
                <span className="font-medium">Etken madde:</span> {drug.activeIngredient}
              </p>
              <p>
                <span className="font-medium">Formu:</span> {drug.dosageForm}
              </p>
              <p>
                <span className="font-medium">Doz:</span> {drug.strength}
              </p>
              <p>
                <span className="font-medium">Üretici:</span> {drug.manufacturer}
              </p>
            </div>
            <p className="mt-3 text-sm text-slate-700">
              <span className="font-medium">Kullanım:</span> {drug.usage}
            </p>
          </article>

          <article className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-900">Uyarılar</h3>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-700">
              {drug.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </article>
        </div>
      ) : null}
    </section>
  );
}
