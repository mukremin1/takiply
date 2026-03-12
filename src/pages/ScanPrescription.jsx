import { useEffect, useMemo, useState } from "react";
import { analyzePrescriptionWithAI } from "../api/integrations";

function InfoBlock({ title, items, emptyText }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>

      {items.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">{emptyText}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {items.map((item, index) => (
            <li key={`${title}-${index}`} className="rounded-md bg-slate-50 p-2 text-sm text-slate-700">
              {item}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function ScanPrescription() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const previewUrl = useMemo(() => {
    if (!file) {
      return "";
    }

    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (event) => {
    const selected = event.target.files?.[0];

    if (!selected) {
      return;
    }

    setFile(selected);
    setResult(null);
    setError("");
  };

  const handleAnalyze = async () => {
    if (!file) {
      setError("Önce reçete görseli seçin.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const analysis = await analyzePrescriptionWithAI(file);
      setResult(analysis);
    } catch (analysisError) {
      setError(analysisError?.message || "Reçete analizi sırasında hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Reçete Tara (AI)</h2>
        <p className="mt-1 text-sm text-slate-600">
          Reçete fotoğrafınızı yükleyin, AI ilaç adlarını ve uyarıları çıkarsın.
        </p>
      </div>

      <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <label className="block text-sm font-medium text-slate-700" htmlFor="prescription-file">
          Reçete Görseli
        </label>

        <input
          id="prescription-file"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />

        {previewUrl ? (
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <img src={previewUrl} alt="Reçete önizleme" className="h-72 w-full object-cover" />
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleAnalyze}
          disabled={!file || loading}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {loading ? "Analiz ediliyor..." : "Reçeteyi AI ile Analiz Et"}
        </button>

        {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
      </div>

      {result ? (
        <div className="space-y-3">
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-900">Genel Bilgiler</h3>
            <div className="mt-2 grid gap-2 text-sm text-slate-700 sm:grid-cols-3">
              <p>
                <span className="font-medium">Hasta:</span> {result.patient || "-"}
              </p>
              <p>
                <span className="font-medium">Doktor:</span> {result.doctor || "-"}
              </p>
              <p>
                <span className="font-medium">Tarih:</span> {result.date || "-"}
              </p>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-900">İlaçlar</h3>

            {result.medications.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">İlaç tespit edilemedi.</p>
            ) : (
              <div className="mt-2 space-y-2">
                {result.medications.map((medication, index) => (
                  <article key={`${medication.name}-${index}`} className="rounded-md bg-slate-50 p-3">
                    <p className="font-medium text-slate-900">{medication.name}</p>
                    <p className="text-sm text-slate-700">Doz: {medication.dosage || "-"}</p>
                    <p className="text-sm text-slate-700">Sıklık: {medication.frequency || "-"}</p>
                    <p className="text-sm text-slate-700">Kullanım: {medication.usage || "-"}</p>
                  </article>
                ))}
              </div>
            )}
          </section>

          <InfoBlock
            title="Önemli Uyarılar"
            items={result.warnings}
            emptyText="Uyarı bilgisi dönmedi."
          />

          <InfoBlock
            title="İlaç Etkileşimleri"
            items={result.interactions}
            emptyText="Etkileşim bilgisi dönmedi."
          />

          <InfoBlock title="Notlar" items={result.notes} emptyText="Ek not yok." />
        </div>
      ) : null}
    </section>
  );
}
