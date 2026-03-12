import { Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./Layout";
import { routes } from "./pages.config";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import ProfileSetup from "./pages/ProfileSetup";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import { useAuth } from "./lib/useAuth";
import { readInitialSetupComplete } from "./lib/profile-storage";

const ONBOARDING_STORAGE_KEY = "takiply-onboarding-seen";

function renderRouteElement(Component) {
  return (
    <Suspense fallback={null}>
      <Component />
    </Suspense>
  );
}

function getPostAuthRoute() {
  const hasSeenOnboarding = window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
  const hasCompletedInitialSetup = readInitialSetupComplete();

  if (!hasSeenOnboarding) {
    return "/onboarding";
  }

  if (!hasCompletedInitialSetup) {
    return "/profile-setup";
  }

  return "/home";
}

export default function App() {
  const { isAuthenticated, loading } = useAuth();
  const postAuthRoute = getPostAuthRoute();

  if (loading) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/profile-setup" element={<ProfileSetup />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/home" replace />} />
          {routes.map((route) => {
            const Component = route.component;

            return <Route key={route.path} path={route.path} element={renderRouteElement(Component)} />;
          })}
        </Route>
        <Route path="*" element={<Navigate to={postAuthRoute} replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/auth" element={<Navigate to={postAuthRoute} replace />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/profile-setup" element={<ProfileSetup />} />
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/home" replace />} />
        {routes.map((route) => {
          const Component = route.component;

          return <Route key={route.path} path={route.path} element={renderRouteElement(Component)} />;
        })}
      </Route>
      <Route path="*" element={<Navigate to={postAuthRoute} replace />} />
    </Routes>
  );
}
