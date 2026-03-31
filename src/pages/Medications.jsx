import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getDrugInfoByBarcode, getMedications } from "../api/integrations";

function PillIcon({ className = "h-8 w-8" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.5 13.5L13.5 10.5" />
      <path d="M8.8 19.2a4.5 4.5 0 0 1 0-6.4l4-4a4.5 4.5 0 1 1 6.4 6.4l-4 4a4.5 4.5 0 0 1-6.4 0z" />
    </svg>
  );
}

function CameraIcon({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M3 8a2 2 0 0 1 2-2h3l1.5-2h5L16 6h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

const BARCODE_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf", "codabar", "qr_code"];

async function createBarcodeDetector() {
  if (!("BarcodeDetector" in window)) {
    return null;
  }

  const BarcodeDetectorApi = window.BarcodeDetector;
  let formats = BARCODE_FORMATS;

  if (typeof BarcodeDetectorApi.getSupportedFormats === "function") {
    try {
      const supported = await BarcodeDetectorApi.getSupportedFormats();
      const preferred = BARCODE_FORMATS.filter((format) => supported.includes(format));

      if (preferred.length > 0) {
        formats = preferred;
      } else if (supported.length > 0) {
        formats = supported;
      }
    } catch {
      // Some WebView versions can fail here; fall back to default detector init.
    }
  }

  try {
    if (formats.length > 0) {
      return new BarcodeDetectorApi({ formats });
    }
  } catch {
    // Fallback to default initialization when explicit format list is not accepted.
  }

  try {
    return new BarcodeDetectorApi();
  } catch {
    return null;
  }
}

export default function Medications() {
  const navigate = useNavigate();
  const [medications, setMedications] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const [lastScannedCode, setLastScannedCode] = useState("");

  const videoRef = useRef(null);
  const imageInputRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const resolvingBarcodeRef = useRef(false);

  useEffect(() => {
    let active = true;

    getMedications().then((data) => {
      if (active) {
        setMedications(data);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const filteredMedications = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) {
      return medications;
    }

    return medications.filter((item) => {
      return item.name.toLowerCase().includes(term) || item.schedule.toLowerCase().includes(term);
    });
  }, [medications, searchTerm]);

  const stopScanner = useCallback(() => {
    if (rafRef.current) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const handleBarcodeDetected = useCallback(async (rawValue) => {
    if (resolvingBarcodeRef.current) {
      return;
    }

    const barcode = String(rawValue || "").trim();

    if (!barcode) {
      return;
    }

    resolvingBarcodeRef.current = true;
    setLastScannedCode(barcode);
    setScannerOpen(false);

    let prefetchedDrug = null;

    try {
      prefetchedDrug = await getDrugInfoByBarcode(barcode);
    } catch {
      prefetchedDrug = null;
    }

    navigate(`/drug-info?barcode=${encodeURIComponent(barcode)}`, {
      state: prefetchedDrug
        ? {
            prefetchedDrug
          }
        : undefined
    });
  }, [navigate]);

  const handleManualBarcodeEntry = () => {
    const entered = window.prompt("Barkodu elle girin");
    const barcode = String(entered || "").trim();

    if (!barcode) {
      return;
    }

    handleBarcodeDetected(barcode);
  };

  useEffect(() => {
    if (!scannerOpen) {
      stopScanner();
      return;
    }

    let isActive = true;
    let barcodeDetector = null;

    const scanVideoFrame = async () => {
      if (!isActive || !videoRef.current || !barcodeDetector) {
        return;
      }

      try {
        const barcodes = await barcodeDetector.detect(videoRef.current);

        if (barcodes.length > 0) {
          const rawValue = barcodes[0].rawValue;

          if (rawValue) {
            handleBarcodeDetected(rawValue);
            return;
          }
        }
      } catch {
        setScannerError("Barkod tarama sırasında hata oluştu.");
      }

      rafRef.current = window.requestAnimationFrame(scanVideoFrame);
    };

    const startScanner = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setScannerError("Bu cihazda kamera erişimi desteklenmiyor.");
          return;
        }

        barcodeDetector = await createBarcodeDetector();

        if (!barcodeDetector) {
          setScannerError("Bu cihazda barkod algılama desteği bulunamadı.");
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" }
          },
          audio: false
        });

        if (!isActive || !videoRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        rafRef.current = window.requestAnimationFrame(scanVideoFrame);
      } catch {
        setScannerError("Kamera izni alınamadı. Fotoğraftan barkod okumayı deneyin.");
      }
    };

    startScanner();

    return () => {
      isActive = false;
      stopScanner();
    };
  }, [handleBarcodeDetected, scannerOpen, stopScanner]);

  const handleOpenScanner = () => {
    resolvingBarcodeRef.current = false;
    setScannerError("");
    setScannerOpen(true);
  };

  const handleImageScan = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      const bitmap = await createImageBitmap(file);
      const barcodeDetector = await createBarcodeDetector();

      if (!barcodeDetector) {
        setScannerError("Bu cihazda barkod algılama desteği yok.");
        return;
      }

      const detected = await barcodeDetector.detect(bitmap);

      if (!detected.length || !detected[0].rawValue) {
        setScannerError("Fotoğrafta barkod bulunamadı.");
        return;
      }

      handleBarcodeDetected(detected[0].rawValue);
      setScannerError("");
    } catch {
      setScannerError("Fotoğraftan barkod okunamadı.");
    }
  };

  return (
    <section className="medications-screen">
      <h2 className="medications-title">İlaçlarım</h2>

      <label className="medications-search" htmlFor="medications-search-input">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          id="medications-search-input"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="İlaç ara..."
        />
      </label>

      <div className="medications-actions">
        <Link to="/add-medication" className="medications-primary-btn">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          Manuel Ekle
        </Link>

        <button type="button" className="medications-secondary-btn" onClick={handleOpenScanner}>
          <CameraIcon />
          Barkod Tara
        </button>
      </div>

      <article className="medications-info-card">
        <div className="medications-info-icon">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 10v6" />
            <circle cx="12" cy="7" r="0.4" fill="currentColor" />
          </svg>
        </div>
        <div>
          <h3>İlaç Bilgi Sistemi</h3>
          <p>Barkod tarayarak ilaç etkileşimlerini ve uyarıları görün</p>
        </div>
      </article>

      {lastScannedCode ? (
        <article className="medications-scanned-card">
          <span>Son barkod:</span>
          <strong>{lastScannedCode}</strong>
        </article>
      ) : null}

      {filteredMedications.length ? (
        <div className="mt-4 space-y-3">
          {filteredMedications.map((item) => (
            <article key={item.id} className="rounded-xl border border-[#21406d] bg-[#0b223f] p-4">
              <h3 className="text-base font-semibold" style={{ color: "#ffffff" }}>{item.name}</h3>
              <p className="mt-1 text-sm text-[#9bb0cc]">Program: {item.schedule}</p>
              <p className="mt-1 text-sm text-[#9bb0cc]">Stok: {item.stockText}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="medications-empty-state">
          <div className="medications-empty-icon">
            <PillIcon />
          </div>
          <h4>Henüz ilaç eklenmedi</h4>
          <p>İlaçlarınızı ekleyerek başlayın</p>
        </div>
      )}

      <Link to="/add-medication" className="medications-fab" aria-label="İlaç ekle">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      </Link>

      {scannerOpen ? (
        <div className="medications-scanner-overlay" role="dialog" aria-modal="true">
          <div className="medications-scanner-panel">
            <div className="medications-scanner-header">
              <h3>Barkod Tara</h3>
              <button type="button" onClick={() => setScannerOpen(false)}>
                Kapat
              </button>
            </div>

            <div className="medications-scanner-video-wrap">
              <video ref={videoRef} muted playsInline className="medications-scanner-video" />
            </div>

            <p className="medications-scanner-hint">Kamerayı barkoda yaklaştırın.</p>

            <div className="medications-scanner-actions">
              <button type="button" onClick={() => imageInputRef.current?.click()} className="medications-upload-btn">
                Fotoğraftan Tara
              </button>
              <button type="button" onClick={handleManualBarcodeEntry} className="medications-upload-btn mt-2">
                Barkodu Elle Gir
              </button>
            </div>

            {scannerError ? <p className="medications-scanner-error">{scannerError}</p> : null}
          </div>
        </div>
      ) : null}

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleImageScan}
      />
    </section>
  );
}
