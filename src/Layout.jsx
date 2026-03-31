import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useTheme } from "./components/theme-context";
import { routes } from "./pages.config";
import { useAuth } from "./lib/useAuth";

const navRoutes = routes.filter((item) => item.showInNav);

function NavIcon({ path }) {
  if (path === "/home") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11.5L12 4l9 7.5" />
        <path d="M5 10.5V20h14v-9.5" />
      </svg>
    );
  }

  if (path === "/medications") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.5 13.5L13.5 10.5" />
        <path d="M8.8 19.2a4.5 4.5 0 0 1 0-6.4l4-4a4.5 4.5 0 1 1 6.4 6.4l-4 4a4.5 4.5 0 0 1-6.4 0z" />
      </svg>
    );
  }

  if (path === "/pharmacy") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10z" />
        <circle cx="12" cy="11" r="2" />
      </svg>
    );
  }

  if (path === "/progress") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 16l5-5 4 4 7-7" />
        <path d="M14 8h6v6" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export default function Layout() {
  const { currentUser, signOut } = useAuth();
  const { isDark } = useTheme();
  const location = useLocation();
  const immersiveRoutes = new Set(
    routes
      .map((item) => item.path)
      .filter((path) => path !== "/onboarding" && path !== "/profile-setup")
  );
  const isImmersiveRoute = immersiveRoutes.has(location.pathname);

  return (
    <div
      className={[
        "flex h-[100dvh] flex-col overflow-hidden",
        isImmersiveRoute ? (isDark ? "app-shell-home" : "app-shell-home app-shell-home-light") : "bg-slate-50 text-slate-900"
      ].join(" ")}
    >
      {!isImmersiveRoute ? (
        <header className="border-b border-slate-200 bg-white" style={{ paddingTop: "var(--safe-top)" }}>
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Takiply</h1>
              <span className="text-sm text-slate-500">İlaç ve sağlık takibi</span>
            </div>

            {currentUser ? (
              <div className="text-right">
                <p className="text-xs text-slate-500">{currentUser.email}</p>
                <button type="button" onClick={signOut} className="text-sm font-medium underline">
                  Çıkış Yap
                </button>
              </div>
            ) : null}
          </div>
        </header>
      ) : null}

      <main
        className={[
          "mx-auto w-full min-h-0 flex-1 overflow-y-auto",
          isImmersiveRoute ? ["max-w-none px-3 py-4 home-main", isDark ? "" : "home-main-light"].join(" ").trim() : "max-w-5xl px-4 py-6"
        ].join(" ")}
        style={isImmersiveRoute ? { paddingTop: "max(0.75rem, var(--safe-top))" } : undefined}
      >
        <Outlet />
      </main>

      <nav className={isImmersiveRoute ? ["home-nav", isDark ? "" : "home-nav-light"].join(" ").trim() : "border-t border-slate-200 bg-white/95 backdrop-blur"}>
        <div
          className={[
            "mx-auto flex items-center justify-between gap-1 px-2 py-2",
            isImmersiveRoute ? "max-w-none" : "max-w-5xl"
          ].join(" ")}
          style={{ paddingBottom: "max(0.5rem, var(--safe-bottom))" }}
        >
          {navRoutes.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                isImmersiveRoute
                  ? ["home-nav-item", isDark ? "" : "home-nav-item-light", isActive ? "is-active" : ""].join(" ").trim()
                  : [
                      "flex-1 rounded-md px-3 py-2 text-center text-sm font-medium transition",
                      isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                    ].join(" ")
              }
            >
              {isImmersiveRoute ? (
                <>
                  <NavIcon path={item.path} />
                  <span>{item.label}</span>
                </>
              ) : (
                item.label
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
