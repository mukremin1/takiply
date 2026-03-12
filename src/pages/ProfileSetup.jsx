import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/useAuth";
import {
  readStoredProfile,
  writeInitialSetupComplete,
  writeStoredProfile
} from "../lib/profile-storage";

const MEDICATION_ALLERGY_SUGGESTIONS = [
  "Penisilin",
  "Aspirin",
  "İbuprofen",
  "Sülfonamidler (Sülfa İlaçlar)",
  "Morfin",
  "Kodein"
];

const FOOD_ALLERGY_SUGGESTIONS = [
  "Fıstık (Yer Fıstığı)",
  "Laktoz İntoleransı",
  "Gluten",
  "Kabuklu Deniz Ürünleri",
  "Yumurta",
  "Soya"
];

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        d="M14.5 6.5 9 12l5.5 5.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function UserCircleIcon({ className = "text-violet-300" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={["h-12 w-12", className].join(" ")}>
      <circle cx="12" cy="8.5" r="2.9" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M7.75 17.5v-1.15A3.76 3.76 0 0 1 11.5 12.6h1A3.76 3.76 0 0 1 16.25 16.35v1.15"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <rect
        x="4.75"
        y="6.75"
        width="14.5"
        height="12.5"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M8 4.75v3.5M16 4.75v3.5M4.75 10.25h14.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function PulseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-12 w-12 text-sky-300">
      <path
        d="M5 12h3l2-4 4 8 2-4h3"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-12 w-12 text-pink-300">
      <path
        d="M12 19.5s-5.75-4.05-7.6-7.25A4.63 4.63 0 0 1 12 6.9a4.63 4.63 0 0 1 7.6 5.35C17.75 15.45 12 19.5 12 19.5Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-12 w-12 text-rose-300">
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <path
        d="M12 9.5v3.2"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.9"
      />
      <circle cx="12" cy="15.7" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="m16 16 4 4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ProgressBar({ active }) {
  return (
    <div
      className={[
        "h-1 flex-1 rounded-full transition",
        active ? "bg-[#18d7b1]" : "bg-slate-500/60"
      ].join(" ")}
    />
  );
}

export default function ProfileSetup() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const savedProfile = readStoredProfile();
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState(savedProfile.fullName || currentUser?.name || "");
  const [birthDate, setBirthDate] = useState(savedProfile.birthDate || "");
  const [heightCm, setHeightCm] = useState(savedProfile.heightCm || "");
  const [weightKg, setWeightKg] = useState(savedProfile.weightKg || "");
  const [conditionInput, setConditionInput] = useState("");
  const [allergyInput, setAllergyInput] = useState("");
  const [chronicConditions, setChronicConditions] = useState(savedProfile.chronicConditions || []);
  const [medicationAllergies, setMedicationAllergies] = useState(savedProfile.medicationAllergies || []);

  const persistProgress = (overrides = {}) => {
    writeStoredProfile({
      ...savedProfile,
      fullName: overrides.fullName ?? fullName.trim(),
      birthDate: overrides.birthDate ?? birthDate,
      heightCm: overrides.heightCm ?? heightCm,
      weightKg: overrides.weightKg ?? weightKg,
      chronicConditions: overrides.chronicConditions ?? chronicConditions,
      medicationAllergies: overrides.medicationAllergies ?? medicationAllergies
    });
  };

  const finishSetup = (overrides = {}) => {
    persistProgress(overrides);
    writeInitialSetupComplete(true);
    navigate("/home", { replace: true });
  };

  const handleBack = () => {
    if (step === 1) {
      navigate("/onboarding");
      return;
    }

    setStep((current) => current - 1);
  };

  const handleContinue = () => {
    if (step === 1) {
      persistProgress();
      setStep(2);
      return;
    }

    if (step === 2) {
      persistProgress();
      setStep(3);
      return;
    }

    if (step === 3) {
      persistProgress();
      setStep(4);
      return;
    }

    if (step === 4) {
      persistProgress();
      setStep(5);
      return;
    }

    finishSetup();
  };

  const handleSkip = () => {
    if (step === 1) {
      persistProgress({ fullName: fullName.trim() || currentUser?.name || "" });
      setStep(2);
      return;
    }

    if (step === 2) {
      persistProgress();
      setStep(3);
      return;
    }

    if (step === 3) {
      persistProgress();
      setStep(4);
      return;
    }

    if (step === 4) {
      persistProgress();
      setStep(5);
      return;
    }

    finishSetup({
      fullName: fullName.trim() || currentUser?.name || "",
      birthDate,
      heightCm,
      weightKg,
      chronicConditions,
      medicationAllergies
    });
  };

  const addCondition = () => {
    const value = conditionInput.trim();

    if (!value) {
      return;
    }

    if (chronicConditions.some((item) => item.toLowerCase() === value.toLowerCase())) {
      setConditionInput("");
      return;
    }

    setChronicConditions((current) => [...current, value]);
    setConditionInput("");
  };

  const removeCondition = (value) => {
    setChronicConditions((current) => current.filter((item) => item !== value));
  };

  const addMedicationAllergy = (value) => {
    const normalized = value.trim();

    if (!normalized) {
      return;
    }

    if (medicationAllergies.some((item) => item.toLowerCase() === normalized.toLowerCase())) {
      setAllergyInput("");
      return;
    }

    setMedicationAllergies((current) => [...current, normalized]);
    setAllergyInput("");
  };

  const removeMedicationAllergy = (value) => {
    setMedicationAllergies((current) => current.filter((item) => item !== value));
  };

  const progress = [1, 2, 3, 4, 5];

  return (
    <section className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-[#031b22] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_24%,rgba(16,185,129,0.2),transparent_28%),linear-gradient(180deg,#03151b_0%,#041a22_42%,#03131a_100%)]" />

      <div className="relative flex min-h-[100dvh] flex-col px-5 pb-[max(1.5rem,calc(env(safe-area-inset-bottom)+1rem))] pt-[max(1.25rem,calc(env(safe-area-inset-top)+0.75rem))]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleBack}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-slate-300 transition active:scale-[0.98]"
            aria-label="Geri dön"
          >
            <BackIcon />
          </button>
          <div className="flex flex-1 gap-2">
            {progress.map((item) => (
              <ProgressBar key={item} active={item <= step} />
            ))}
          </div>
        </div>

        {step === 1 ? (
          <>
            <div className="pt-14">
              <h1 className="text-4xl font-bold leading-tight tracking-[-0.03em] text-white">
                Nasıl Hitap Edelim?
              </h1>
              <p className="mt-4 text-lg leading-8 text-slate-300">
                Sana nasıl seslenelim? İsmini yazarak başlayalım.
              </p>
            </div>

            <div className="mt-10">
              <label className="block text-lg font-medium text-slate-200">
                İsminiz
                <input
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Adınız Soyadınız"
                  className="mt-3 h-14 w-full rounded-[18px] border border-white/10 bg-white/[0.05] px-4 text-lg text-white outline-none placeholder:text-slate-500 focus:border-[#18d7b1]"
                />
              </label>
            </div>

            <div className="flex flex-1 items-center justify-center">
              <div className="relative flex h-40 w-40 items-center justify-center">
                <div className="absolute h-40 w-40 rounded-full bg-violet-500/12" />
                <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-violet-400/25">
                  <UserCircleIcon />
                </div>
              </div>
            </div>
          </>
        ) : step === 2 ? (
          <>
            <div className="pt-14">
              <h1 className="text-4xl font-bold leading-tight tracking-[-0.03em] text-white">
                Doğum tarihiniz nedir?
              </h1>
              <p className="mt-4 text-lg leading-8 text-slate-300">
                Yaş, ilaç dozajı ve sağlık önerileri için önemlidir.
              </p>
            </div>

            <div className="mt-10">
              <label className="block text-lg font-medium text-slate-200">
                Doğum Tarihi
                <div className="relative mt-3">
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(event) => setBirthDate(event.target.value)}
                    className="h-14 w-full rounded-[18px] border border-white/10 bg-white/[0.05] px-4 pr-12 text-lg text-white outline-none focus:border-[#18d7b1]"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
                    <CalendarIcon />
                  </span>
                </div>
              </label>
            </div>

            <div className="flex flex-1 items-center justify-center">
              <div className="relative flex h-40 w-40 items-center justify-center">
                <div className="absolute h-40 w-40 rounded-full bg-emerald-500/12" />
                <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-emerald-400/20">
                  <UserCircleIcon className="text-emerald-300" />
                </div>
              </div>
            </div>
          </>
        ) : step === 3 ? (
          <>
            <div className="pt-14">
              <h1 className="text-4xl font-bold leading-tight tracking-[-0.03em] text-white">
                Fiziksel bilgileriniz
              </h1>
              <p className="mt-4 text-lg leading-8 text-slate-300">
                Sağlık ilerlemenizi daha iyi takip etmemize yardımcı olun.
              </p>
            </div>

            <div className="mt-10 space-y-6">
              <label className="block text-lg font-medium text-slate-200">
                Boy (cm)
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="300"
                  value={heightCm}
                  onChange={(event) => setHeightCm(event.target.value)}
                  placeholder="170"
                  className="mt-3 h-14 w-full rounded-[18px] border border-white/10 bg-white/[0.05] px-4 text-lg text-white outline-none placeholder:text-slate-500 focus:border-[#18d7b1]"
                />
              </label>

              <label className="block text-lg font-medium text-slate-200">
                Mevcut Kilo (kg)
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="500"
                  value={weightKg}
                  onChange={(event) => setWeightKg(event.target.value)}
                  placeholder="75"
                  className="mt-3 h-14 w-full rounded-[18px] border border-white/10 bg-white/[0.05] px-4 text-lg text-white outline-none placeholder:text-slate-500 focus:border-[#18d7b1]"
                />
              </label>
            </div>

            <div className="flex flex-1 items-center justify-center">
              <div className="relative flex h-40 w-40 items-center justify-center">
                <div className="absolute h-40 w-40 rounded-full bg-sky-500/12" />
                <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-sky-400/20">
                  <PulseIcon />
                </div>
              </div>
            </div>
          </>
        ) : step === 4 ? (
          <>
            <div className="pt-14">
              <h1 className="text-4xl font-bold leading-tight tracking-[-0.03em] text-white">
                Kronik hastalıklarınız nelerdir?
              </h1>
              <p className="mt-4 text-lg leading-8 text-slate-300">
                Takip ettiğiniz hastalıkları ekleyerek başlayın. Daha sonra ekleyebilirsiniz.
              </p>
            </div>

            <div className="mt-20">
              <label className="block text-lg font-medium text-slate-200">
                Hastalık ekle
                <div className="relative mt-4">
                  <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-500">
                    <SearchIcon />
                  </span>
                  <input
                    type="text"
                    value={conditionInput}
                    onChange={(event) => setConditionInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addCondition();
                      }
                    }}
                    placeholder="ör. Astım, Artrit"
                    className="h-14 w-full rounded-[18px] border border-white/10 bg-white/[0.05] pl-12 pr-4 text-lg text-white outline-none placeholder:text-slate-500 focus:border-[#18d7b1]"
                  />
                </div>
              </label>

              <p className="mt-3 text-sm text-slate-400">
                <span className="mr-1 text-amber-300">•</span>
                Listede bulamıyorsanız, hastalık adını yazıp{" "}
                <span className="font-semibold text-[#18d7b1]">Enter</span> tuşuna basarak
                ekleyebilirsiniz
              </p>

              {chronicConditions.length ? (
                <div className="mt-6 flex flex-wrap gap-3">
                  {chronicConditions.map((condition) => (
                    <button
                      key={condition}
                      type="button"
                      onClick={() => removeCondition(condition)}
                      className="rounded-full border border-pink-400/25 bg-pink-500/10 px-4 py-2 text-sm font-medium text-pink-100"
                    >
                      {condition} x
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex flex-1 items-center justify-center">
              <div className="relative flex h-40 w-40 items-center justify-center">
                <div className="absolute h-40 w-40 rounded-full bg-pink-500/12" />
                <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-pink-400/20">
                  <HeartIcon />
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="pt-14">
              <h1 className="text-4xl font-bold leading-tight tracking-[-0.03em] text-white">
                İlaç alerjiniz var mı?
              </h1>
              <p className="mt-4 text-lg leading-8 text-slate-300">
                İlaç alerjilerinizi listeleyerek güvende kalmanıza yardımcı olun.
              </p>
            </div>

            <div className="mt-16">
              <label className="block text-lg font-medium text-slate-200">
                Alerji ekle
                <div className="relative mt-4">
                  <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-500">
                    <SearchIcon />
                  </span>
                  <input
                    type="text"
                    value={allergyInput}
                    onChange={(event) => setAllergyInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addMedicationAllergy(allergyInput);
                      }
                    }}
                    placeholder="ör. Penisilin, Aspirin"
                    className="h-14 w-full rounded-[18px] border border-white/10 bg-white/[0.05] pl-12 pr-4 text-lg text-white outline-none placeholder:text-slate-500 focus:border-[#18d7b1]"
                  />
                </div>
              </label>

              <p className="mt-3 text-sm text-slate-400">
                <span className="mr-1 text-amber-300">•</span>
                Listede bulamıyorsanız, alerji adını yazıp{" "}
                <span className="font-semibold text-rose-300">Enter</span> tuşuna basarak
                ekleyebilirsiniz
              </p>

              <div className="mt-5">
                <p className="text-sm text-slate-400">İlaç Alerjileri:</p>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {MEDICATION_ALLERGY_SUGGESTIONS.map((item) => {
                    const isSelected = medicationAllergies.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() =>
                          isSelected ? removeMedicationAllergy(item) : addMedicationAllergy(item)
                        }
                        className={[
                          "rounded-[12px] border px-4 py-3 text-left text-sm transition",
                          isSelected
                            ? "border-rose-300/30 bg-rose-500/15 text-white"
                            : "border-white/8 bg-white/[0.05] text-slate-100"
                        ].join(" ")}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4">
                <p className="text-sm text-slate-400">Gıda Alerjileri:</p>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {FOOD_ALLERGY_SUGGESTIONS.map((item) => (
                    <div
                      key={item}
                      className="rounded-[12px] border border-amber-400/10 bg-amber-500/[0.08] px-4 py-3 text-left text-sm text-amber-200"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-1 items-center justify-center">
              <div className="relative flex h-40 w-40 items-center justify-center">
                <div className="absolute h-40 w-40 rounded-full bg-rose-500/12" />
                <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-rose-400/18">
                  <AlertIcon />
                </div>
              </div>
            </div>
          </>
        )}

        <div className="space-y-4">
          <button
            type="button"
            onClick={handleContinue}
            className="flex min-h-[58px] w-full items-center justify-center gap-3 rounded-[18px] bg-[#18d7b1] px-5 text-lg font-semibold text-[#03252d] transition active:scale-[0.99]"
          >
            Devam Et
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
              <path
                d="M10 7.5 14.5 12 10 16.5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </svg>
          </button>

          <button
            type="button"
            onClick={handleSkip}
            className="block w-full text-center text-lg font-medium text-[#14e1bf]"
          >
            Şimdilik atla
          </button>
        </div>
      </div>
    </section>
  );
}
