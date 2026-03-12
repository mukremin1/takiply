export default function PageScaffold({ title, description }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>

      <article className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-600">
          Bu ekran için temel iskelet oluşturuldu. Sonraki adımda gerçek veri ve form
          akışlarına bağlanabilir.
        </p>
      </article>
    </section>
  );
}
