import { useState } from "react";

export default function AddMedication() {
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">İlaç Ekle</h2>
        <p className="mt-1 text-sm text-slate-600">Bu ekran temel bir form iskeletidir.</p>
      </div>

      <form className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <label className="block text-sm font-medium text-slate-700">
          İlaç Adı
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Örn: Parol"
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Doz
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
            value={dosage}
            onChange={(event) => setDosage(event.target.value)}
            placeholder="Örn: 500 mg"
          />
        </label>

        <button
          type="button"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          Kaydet (Örnek)
        </button>
      </form>
    </section>
  );
}
