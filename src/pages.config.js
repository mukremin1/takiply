import { lazy } from "react";
import AddMedication from "./pages/AddMedication";
import AddVital from "./pages/AddVital";
import DrugInfo from "./pages/DrugInfo";
import EditMedication from "./pages/EditMedication";
import EditProfile from "./pages/EditProfile";
import ENabizConnect from "./pages/ENabizConnect";
import Family from "./pages/Family";
import HealthProfile from "./pages/HealthProfile";
import HealthTrend from "./pages/HealthTrend";
import Help from "./pages/Help";
import Home from "./pages/Home";
import MedicalDisclaimer from "./pages/MedicalDisclaimer";
import Medications from "./pages/Medications";
import NotificationSettings from "./pages/NotificationSettings";
import OfflineMode from "./pages/OfflineMode";
import Onboarding from "./pages/Onboarding";
import Privacy from "./pages/Privacy";
import Profile from "./pages/Profile";
import ProfileSetup from "./pages/ProfileSetup";
import Progress from "./pages/Progress";
import RefillOrder from "./pages/RefillOrder";
import Report from "./pages/Report";
import ScanPrescription from "./pages/ScanPrescription";
import SymptomDiary from "./pages/SymptomDiary";
import Terms from "./pages/Terms";

const Pharmacy = lazy(() => import("./pages/Pharmacy"));

export const routes = [
  { path: "/home", label: "Ana Sayfa", showInNav: true, component: Home },
  { path: "/medications", label: "İlaçlar", showInNav: true, component: Medications },
  { path: "/add-medication", label: "Ekle", showInNav: false, component: AddMedication },
  { path: "/pharmacy", label: "Eczane", showInNav: true, component: Pharmacy },
  { path: "/progress", label: "İlerleme", showInNav: true, component: Progress },
  { path: "/profile", label: "Profil", showInNav: true, component: Profile },
  { path: "/help", label: "Yardım", showInNav: false, component: Help },
  { path: "/add-vital", label: "Sağlık Verisi Ekle", showInNav: false, component: AddVital },
  { path: "/drug-info", label: "İlaç Bilgisi", showInNav: false, component: DrugInfo },
  { path: "/edit-medication", label: "İlaç Düzenle", showInNav: false, component: EditMedication },
  { path: "/edit-profile", label: "Profil Düzenle", showInNav: false, component: EditProfile },
  { path: "/e-nabiz-connect", label: "e-Nabız Bağlantı", showInNav: false, component: ENabizConnect },
  { path: "/family", label: "Aile", showInNav: false, component: Family },
  { path: "/health-profile", label: "Sağlık Profili", showInNav: false, component: HealthProfile },
  { path: "/health-trend", label: "Sağlık Eğilimi", showInNav: false, component: HealthTrend },
  {
    path: "/medical-disclaimer",
    label: "Tıbbi Sorumluluk Reddi",
    showInNav: false,
    component: MedicalDisclaimer
  },
  {
    path: "/notification-settings",
    label: "Bildirim Ayarları",
    showInNav: false,
    component: NotificationSettings
  },
  { path: "/offline-mode", label: "Çevrimdışı Mod", showInNav: false, component: OfflineMode },
  { path: "/onboarding", label: "Başlangıç", showInNav: false, component: Onboarding },
  { path: "/privacy", label: "Gizlilik", showInNav: false, component: Privacy },
  { path: "/profile-setup", label: "Profil Kurulumu", showInNav: false, component: ProfileSetup },
  { path: "/refill-order", label: "Yenileme Siparişi", showInNav: false, component: RefillOrder },
  { path: "/report", label: "Rapor", showInNav: false, component: Report },
  { path: "/scan-prescription", label: "Reçete Tara", showInNav: false, component: ScanPrescription },
  { path: "/symptom-diary", label: "Semptom Günlüğü", showInNav: false, component: SymptomDiary },
  { path: "/terms", label: "Kullanım Koşulları", showInNav: false, component: Terms }
];
