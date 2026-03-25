import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { CircleF, GoogleMap, InfoWindowF, MarkerClustererF, MarkerF, PolylineF, useJsApiLoader } from "@react-google-maps/api";
import {
  buildFallbackPharmacies,
  getFallbackPharmacies,
  getNearbyPharmacies,
  getPharmaciesByCity,
  getOnDutyPharmacies,
  mergePharmacyCollections
} from "../api/integrations";
import { getAllCities, getDistrictsByCity } from "../data/turkishCities";

const SEARCH_RADIUS_KM = 10;
const FAVORITE_LIMIT = 2;
const FAVORITES_STORAGE_KEY = "takiply-pharmacy-favorites";
const LOCATION_PERMISSION_ERROR = "location-permission-denied";
const LOCATION_SERVICES_DISABLED_ERROR = "location-services-disabled";
const LOCATION_TIMEOUT_ERROR = "location-timeout";
const DEFAULT_MAP_CENTER = { lat: 39.0, lng: 35.0 };
const OSRM_ROUTE_BASE_URL = "https://router.project-osrm.org/route/v1/driving/";
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "";
const PHARMACY_REQUEST_TIMEOUT_MS = 15000;

const MARKER_THEME = {
  default: {
    halo: "#6ee7d2",
    bodyTop: "#34d399",
    bodyBottom: "#0f9f8b",
    glyphBg: "#ecfeff",
    glyphColor: "#0f766e",
    textBg: "#f8fafc",
    textColor: "#0f172a",
    pinStroke: "#0b3b39"
  },
  active: {
    halo: "#94a3b8",
    bodyTop: "#1f2937",
    bodyBottom: "#0f172a",
    glyphBg: "#e2e8f0",
    glyphColor: "#0f172a",
    textBg: "#0f172a",
    textColor: "#f8fafc",
    pinStroke: "#020617"
  },
  onDuty: {
    halo: "#fda4af",
    bodyTop: "#fb7185",
    bodyBottom: "#be123c",
    glyphBg: "#fff1f2",
    glyphColor: "#9f1239",
    textBg: "#881337",
    textColor: "#fff1f2",
    pinStroke: "#4c0519"
  },
  favorite: {
    halo: "#fcd34d",
    bodyTop: "#fbbf24",
    bodyBottom: "#d97706",
    glyphBg: "#fffbeb",
    glyphColor: "#b45309",
    textBg: "#fffbeb",
    textColor: "#78350f",
    pinStroke: "#78350f"
  }
};

function hasGrantedLocationPermission(permissions) {
  return permissions?.location === "granted" || permissions?.coarseLocation === "granted";
}

function isLocationServicesDisabledError(error) {
  const code = String(error?.code || "");
  const message = String(error?.message || "");
  return (
    code === "OS-PLUG-GLOC-0007" ||
    code === "OS-PLUG-GLOC-0009" ||
    code === "OS-PLUG-GLOC-0016" ||
    code === "OS-PLUG-GLOC-0017" ||
    foldText(message).includes("location services are not enabled") ||
    foldText(message).includes("request to enable location was denied")
  );
}

function isLocationTimeoutError(error) {
  const code = String(error?.code || "");
  const message = String(error?.message || "");
  return code === "OS-PLUG-GLOC-0010" || foldText(message).includes("could not obtain location in time");
}

function isPermissionDeniedError(error) {
  const code = String(error?.code || "");
  const message = String(error?.message || "");
  return (
    code === "OS-PLUG-GLOC-0003" ||
    foldText(message).includes("permission") && foldText(message).includes("denied")
  );
}

function foldText(value) {
  return String(value ?? "")
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getDirectionsUrl(item, userCoords) {
  if (
    userCoords &&
    typeof userCoords.latitude === "number" &&
    typeof userCoords.longitude === "number"
  ) {
    return `https://www.google.com/maps/dir/?api=1&origin=${userCoords.latitude},${userCoords.longitude}&destination=${item.latitude},${item.longitude}&travelmode=driving`;
  }

  return `https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`;
}

function formatRouteDistance(meters) {
  if (typeof meters !== "number" || !Number.isFinite(meters)) {
    return "";
  }

  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  return `${(meters / 1000).toFixed(1)} km`;
}

function formatRouteDuration(seconds) {
  if (typeof seconds !== "number" || !Number.isFinite(seconds)) {
    return "";
  }

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} dk`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours} sa ${remainingMinutes} dk` : `${hours} sa`;
}

function withTimeout(promise, timeoutMs, errorMessage) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => {
        reject(new Error(errorMessage));
      }, timeoutMs);
    })
  ]);
}

function loadFavoriteIds() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const saved = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    const parsed = JSON.parse(saved ?? "[]");

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item) => typeof item === "string" && item.trim())
      .slice(0, FAVORITE_LIMIT);
  } catch {
    return [];
  }
}

function sanitizeSvgText(value, fallback = "") {
  const normalized = String(value ?? "").trim() || fallback;
  return normalized.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return char;
    }
  });
}

function getMarkerTheme({ isActive, isOnDuty, isFavorite }) {
  if (isActive) {
    return MARKER_THEME.active;
  }

  if (isOnDuty) {
    return MARKER_THEME.onDuty;
  }

  if (isFavorite) {
    return MARKER_THEME.favorite;
  }

  return MARKER_THEME.default;
}

function createPharmacyMarkerIcon({ name, isActive, isOnDuty, isFavorite }) {
  const theme = getMarkerTheme({ isActive, isOnDuty, isFavorite });
  const label = sanitizeSvgText(name, "Eczane").slice(0, 18);
  const favoriteBadge = isFavorite
    ? `<circle cx="98" cy="14" r="12" fill="#fff7ed" stroke="rgba(120,53,15,0.18)" />
       <text x="98" y="18" text-anchor="middle" font-size="12" font-weight="700" fill="#b45309">★</text>`
    : "";
  const dutyBadge = isOnDuty
    ? `<rect x="8" y="10" rx="8" ry="8" width="32" height="16" fill="#fff1f2" />
       <text x="24" y="21" text-anchor="middle" font-size="9" font-weight="800" fill="#9f1239">NÖB</text>`
    : "";

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="120" height="92" viewBox="0 0 120 92">
      <ellipse cx="60" cy="26" rx="24" ry="24" fill="${theme.halo}" fill-opacity="0.28" />
      ${favoriteBadge}
      ${dutyBadge}
      <path d="M60 14
               C48 14 38 24 38 36
               C38 52 55 63 60 78
               C65 63 82 52 82 36
               C82 24 72 14 60 14Z"
            fill="url(#pinGradient)" stroke="${theme.pinStroke}" stroke-width="2.5" />
      <circle cx="60" cy="36" r="14" fill="${theme.glyphBg}" />
      <path d="M52 36h16M60 28v16" stroke="${theme.glyphColor}" stroke-width="3.6" stroke-linecap="round" />
      <rect x="14" y="76" width="92" height="14" rx="7" ry="7" fill="${theme.textBg}" fill-opacity="0.96" />
      <text x="60" y="86" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" font-weight="700" fill="${theme.textColor}">${label}</text>
      <defs>
        <linearGradient id="pinGradient" x1="60" y1="14" x2="60" y2="78" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="${theme.bodyTop}" />
          <stop offset="100%" stop-color="${theme.bodyBottom}" />
        </linearGradient>
      </defs>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function createClusterIconSvg({ size, fill, ring }) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 3}" fill="${ring}" fill-opacity="0.24" />
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 9}" fill="${fill}" />
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 13}" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="2" />
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const CLUSTER_STYLES = [
  {
    url: createClusterIconSvg({ size: 52, fill: "#0f766e", ring: "#5eead4" }),
    width: 52,
    height: 52,
    textColor: "#f8fafc",
    textSize: 15
  },
  {
    url: createClusterIconSvg({ size: 60, fill: "#0f766e", ring: "#2dd4bf" }),
    width: 60,
    height: 60,
    textColor: "#f8fafc",
    textSize: 16
  },
  {
    url: createClusterIconSvg({ size: 68, fill: "#115e59", ring: "#14b8a6" }),
    width: 68,
    height: 68,
    textColor: "#f8fafc",
    textSize: 18
  }
];

function getClusterCalculator(markers, numStyles) {
  const count = markers.length;
  const index = count < 10 ? 1 : count < 25 ? 2 : Math.min(3, numStyles);

  return {
    text: String(count),
    index,
    title: `${count} eczane`
  };
}

function getPharmacyMarkerOptions({ item, isActive, isOnDuty, isFavorite }) {
  return {
    position: { lat: Number(item.latitude), lng: Number(item.longitude) },
    title: item.name,
    icon: {
      url: createPharmacyMarkerIcon({
        name: item.name,
        isActive,
        isOnDuty,
        isFavorite
      }),
      scaledSize: new window.google.maps.Size(120, 92),
      anchor: new window.google.maps.Point(60, 78),
      labelOrigin: new window.google.maps.Point(60, 84)
    }
  };
}

function focusCluster(cluster, map) {
  if (!cluster || !map) {
    return;
  }

  const bounds = typeof cluster.getBounds === "function" ? cluster.getBounds() : null;

  if (bounds && !bounds.isEmpty()) {
    map.fitBounds(bounds, 72);

    const nextZoom = Math.min((map.getZoom() ?? 13) + 1, 17);
    window.setTimeout(() => {
      map.setZoom(nextZoom);
    }, 180);
    return;
  }

  const center = typeof cluster.getCenter === "function" ? cluster.getCenter() : null;

  if (center) {
    map.panTo(center);
    const nextZoom = Math.min((map.getZoom() ?? 13) + 2, 17);
    window.setTimeout(() => {
      map.setZoom(nextZoom);
    }, 180);
  }
}

function SummaryIcon({ kind }) {
  const commonProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true"
  };

  if (kind === "duty") {
    return (
      <svg {...commonProps}>
        <path d="M12 4v16" />
        <path d="M4 12h16" />
      </svg>
    );
  }

  if (kind === "favorite") {
    return (
      <svg {...commonProps}>
        <path d="m12 17.27-4.15 2.18.79-4.6L5.3 11.6l4.62-.67L12 6.73l2.08 4.2 4.62.67-3.34 3.25.79 4.6L12 17.27z" />
      </svg>
    );
  }

  if (kind === "search") {
    return (
      <svg {...commonProps}>
        <circle cx="11" cy="11" r="6" />
        <path d="m20 20-4.2-4.2" />
      </svg>
    );
  }

  if (kind === "gps") {
    return (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
        <path d="M12 2v3" />
        <path d="M12 19v3" />
        <path d="M2 12h3" />
        <path d="M19 12h3" />
      </svg>
    );
  }

  if (kind === "active") {
    return (
      <svg {...commonProps}>
        <path d="M12 21c4-5 6-8.2 6-11a6 6 0 1 0-12 0c0 2.8 2 6 6 11Z" />
        <circle cx="12" cy="10" r="2.2" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M12 21c4-5 6-8.2 6-11a6 6 0 1 0-12 0c0 2.8 2 6 6 11Z" />
    </svg>
  );
}

function PharmacyMap({
  pharmacies,
  activePharmacy,
  userCoords,
  favoriteIds,
  summaryItems,
  onMarkerClick,
  onRouteSummaryChange,
  onMarkerStatsChange
}) {
  const mapRef = useRef(null);
  const hasFitBoundsRef = useRef(false);
  const [routeState, setRouteState] = useState({ loading: false, error: "", summary: "" });
  const [routePath, setRoutePath] = useState([]);
  const { isLoaded, loadError } = useJsApiLoader({
    id: "takiply-pharmacy-map",
    googleMapsApiKey: GOOGLE_MAPS_API_KEY
  });
  const validPharmacies = useMemo(
    () =>
      pharmacies.filter((item) => {
        const latitude = Number(item.latitude);
        const longitude = Number(item.longitude);
        return Number.isFinite(latitude) && Number.isFinite(longitude);
      }),
    [pharmacies]
  );
  const clusteredPharmacies = useMemo(
    () => validPharmacies.filter((item) => item.id !== activePharmacy?.id),
    [activePharmacy?.id, validPharmacies]
  );

  useEffect(() => {
    onMarkerStatsChange({
      totalPharmacies: pharmacies.length,
      validCoordinatePharmacies: validPharmacies.length,
      renderedMarkers: isLoaded ? validPharmacies.length : 0
    });

    return () => {
      onMarkerStatsChange({
        totalPharmacies: 0,
        validCoordinatePharmacies: 0,
        renderedMarkers: 0
      });
    };
  }, [isLoaded, onMarkerStatsChange, pharmacies.length, validPharmacies.length]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !activePharmacy) {
      return;
    }

    const latitude = Number(activePharmacy.latitude);
    const longitude = Number(activePharmacy.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return;
    }

    map.panTo({ lat: latitude, lng: longitude });

    const currentZoom = map.getZoom() ?? 13;
    if (currentZoom < 15) {
      map.setZoom(15);
    }
  }, [activePharmacy]);

  useEffect(() => {
    if (!activePharmacy || !userCoords) {
      const resetRouteState = window.setTimeout(() => {
        setRoutePath([]);
        setRouteState({ loading: false, error: "", summary: "" });
      }, 0);

      return () => {
        window.clearTimeout(resetRouteState);
      };
    }

    const map = mapRef.current;
    if (!map) {
      return;
    }

    const controller = new AbortController();
    const from = `${userCoords.longitude},${userCoords.latitude}`;
    const to = `${activePharmacy.longitude},${activePharmacy.latitude}`;
    const loadingTimer = window.setTimeout(() => {
      setRouteState({ loading: true, error: "", summary: "" });
    }, 0);

    fetch(`${OSRM_ROUTE_BASE_URL}${from};${to}?overview=full&geometries=geojson`, {
      signal: controller.signal
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("route-request-failed");
        }

        return response.json();
      })
      .then((payload) => {
        const route = Array.isArray(payload?.routes) ? payload.routes[0] : null;
        const coordinates = Array.isArray(route?.geometry?.coordinates) ? route.geometry.coordinates : [];

        if (!route || !coordinates.length) {
          throw new Error("route-unavailable");
        }

        setRoutePath(
          coordinates.map(([longitude, latitude]) => ({
            lat: latitude,
            lng: longitude
          }))
        );

        const distanceText = formatRouteDistance(route.distance);
        const durationText = formatRouteDuration(route.duration);
        const summary = [distanceText, durationText].filter(Boolean).join(" - ");

        setRouteState({ loading: false, error: "", summary });
      })
      .catch((error) => {
        if (error?.name === "AbortError") {
          return;
        }

        setRoutePath([]);

        setRouteState({
          loading: false,
          error: "Canli rota su an olusturulamadi.",
          summary: ""
        });
      });

    return () => {
      window.clearTimeout(loadingTimer);
      controller.abort();
    };
  }, [activePharmacy, userCoords]);

  useEffect(() => {
    onRouteSummaryChange(routeState);
  }, [onRouteSummaryChange, routeState]);

  useEffect(() => {
    if (!isLoaded || !window.google) {
      return;
    }

    const map = mapRef.current;
    if (!map) {
      return;
    }

    const bounds = new window.google.maps.LatLngBounds();
    let hasPoint = false;

    validPharmacies.forEach((item) => {
      bounds.extend({
        lat: Number(item.latitude),
        lng: Number(item.longitude)
      });
      hasPoint = true;
    });

    if (userCoords) {
      bounds.extend({
        lat: userCoords.latitude,
        lng: userCoords.longitude
      });
      hasPoint = true;
    }

    if (!hasPoint) {
      return;
    }

    if (!hasFitBoundsRef.current) {
      map.fitBounds(bounds, 60);
      hasFitBoundsRef.current = true;
      return;
    }

    if (!activePharmacy && validPharmacies.length <= 1) {
      map.fitBounds(bounds, 60);
    }
  }, [activePharmacy, isLoaded, userCoords, validPharmacies]);

  if (!GOOGLE_MAPS_API_KEY) {
    return <div className="pharmacy-map-fallback">Google Maps API anahtari tanimli degil.</div>;
  }

  if (loadError) {
    return <div className="pharmacy-map-fallback">Google Maps su anda yuklenemedi.</div>;
  }

  if (!isLoaded) {
    return <div className="pharmacy-map-fallback">Harita yukleniyor...</div>;
  }

  return (
    <div className="pharmacy-map-frame">
      {summaryItems.length ? (
        <div className="pharmacy-map-summary">
          {summaryItems.map((item) => (
            <span key={`${item.kind}-${item.text}`} className={`pharmacy-map-summary__item is-${item.kind}`}>
              <span className="pharmacy-map-summary__icon">
                <SummaryIcon kind={item.kind} />
              </span>
              <span>{item.text}</span>
            </span>
          ))}
        </div>
      ) : null}
      <GoogleMap
        mapContainerClassName="pharmacy-map"
        center={DEFAULT_MAP_CENTER}
        zoom={6}
        onLoad={(map) => {
          mapRef.current = map;
        }}
        onUnmount={() => {
          mapRef.current = null;
        }}
        options={{
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
          gestureHandling: "greedy"
        }}
      >
        {userCoords ? (
          <>
            <CircleF
              center={{ lat: userCoords.latitude, lng: userCoords.longitude }}
              radius={120}
              options={{
                fillColor: "#0f172a",
                fillOpacity: 0.12,
                strokeColor: "#0f172a",
                strokeOpacity: 0.28,
                strokeWeight: 1
              }}
            />
            <MarkerF
              position={{ lat: userCoords.latitude, lng: userCoords.longitude }}
              title="Konumunuz"
              icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 7,
                fillColor: "#0f172a",
                fillOpacity: 1,
                strokeColor: "#ffffff",
                strokeWeight: 2
              }}
            />
          </>
        ) : null}

        <MarkerClustererF
          averageCenter
          gridSize={64}
          minimumClusterSize={2}
          maxZoom={15}
          styles={CLUSTER_STYLES}
          calculator={getClusterCalculator}
          onClick={(cluster) => {
            focusCluster(cluster, mapRef.current);
          }}
        >
          {(clusterer) => (
            <>
              {clusteredPharmacies.map((item) => {
                const isFavorite = favoriteIds.includes(item.id);
                const isOnDuty = foldText(item.status).includes("nobet");
                const markerOptions = getPharmacyMarkerOptions({
                  item,
                  isActive: false,
                  isOnDuty,
                  isFavorite
                });

                return (
                  <MarkerF
                    key={item.id}
                    clusterer={clusterer}
                    position={markerOptions.position}
                    title={markerOptions.title}
                    onClick={() => onMarkerClick(item.id)}
                    icon={markerOptions.icon}
                  />
                );
              })}
            </>
          )}
        </MarkerClustererF>

        {activePharmacy && Number.isFinite(Number(activePharmacy.latitude)) && Number.isFinite(Number(activePharmacy.longitude)) ? (
          (() => {
            const isFavorite = favoriteIds.includes(activePharmacy.id);
            const isOnDuty = foldText(activePharmacy.status).includes("nobet");
            const markerOptions = getPharmacyMarkerOptions({
              item: activePharmacy,
              isActive: true,
              isOnDuty,
              isFavorite
            });

            return (
              <MarkerF
                key={activePharmacy.id}
                position={markerOptions.position}
                title={markerOptions.title}
                onClick={() => onMarkerClick(activePharmacy.id)}
                icon={markerOptions.icon}
                animation={window.google.maps.Animation.DROP}
              >
                <InfoWindowF
                  position={markerOptions.position}
                  onCloseClick={() => onMarkerClick("")}
                >
                  <div className="pharmacy-map-popup">
                    <strong>{activePharmacy.name}</strong>
                    {activePharmacy.address ? <span>Adres: {activePharmacy.address}</span> : null}
                    <span>Durum: {activePharmacy.status}</span>
                    <span>
                      {activePharmacy.distanceText ? `Uzaklik: ${activePharmacy.distanceText}` : "Uzaklik: Bilinmiyor"}
                    </span>
                    {isFavorite ? <span>Favori eczane</span> : null}
                  </div>
                </InfoWindowF>
              </MarkerF>
            );
          })()
        ) : null}

        {routePath.length ? (
          <PolylineF
            path={routePath}
            options={{
              strokeColor: "#14d7b5",
              strokeOpacity: 0.82,
              strokeWeight: 5
            }}
          />
        ) : null}
      </GoogleMap>
      {routeState.loading ? (
        <div className="pharmacy-route-chip">Rota hesaplaniyor...</div>
      ) : null}
      {routeState.error ? (
        <div className="pharmacy-route-chip is-error">{routeState.error}</div>
      ) : null}
      {routeState.summary ? <div className="pharmacy-route-chip">{routeState.summary}</div> : null}
    </div>
  );
}

export default function Pharmacy() {
  const geolocationSupported =
    Capacitor.isNativePlatform() || (typeof navigator !== "undefined" && "geolocation" in navigator);
  const initialFallbackPharmacies = useMemo(() => buildFallbackPharmacies({ force: true }), []);
  const listRef = useRef(null);
  const cardRefs = useRef(new Map());
  const [pharmacies, setPharmacies] = useState(() => initialFallbackPharmacies);
  const [onDutyPharmacies, setOnDutyPharmacies] = useState(() =>
    initialFallbackPharmacies.filter((item) => foldText(item.status).includes("nobet"))
  );
  const [activePharmacyId, setActivePharmacyId] = useState(() => initialFallbackPharmacies[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [userCoords, setUserCoords] = useState(null);
  const [locationAccuracy, setLocationAccuracy] = useState(null);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("map");
  const [favoriteIds, setFavoriteIds] = useState(() => loadFavoriteIds());
  const [manualCity, setManualCity] = useState("");
  const [manualDistrict, setManualDistrict] = useState("");
  const [routeSummary, setRouteSummary] = useState({ loading: false, error: "", summary: "" });
  const [debugStats, setDebugStats] = useState({
    nearbyCount: 0,
    onDutyCount: 0,
    mergedCount: 0,
    totalPharmacies: 0,
    validCoordinatePharmacies: 0,
    renderedMarkers: 0
  });
  const [debugSamples, setDebugSamples] = useState(() =>
    initialFallbackPharmacies.slice(0, 5).map((item) => ({
      id: item.id,
      name: item.name,
      source: item.source || "offline",
      latitude: item.latitude,
      longitude: item.longitude,
      status: item.status
    }))
  );
  const handleMarkerStatsChange = useCallback((stats) => {
    setDebugStats((current) => ({
      ...current,
      ...stats
    }));
  }, []);
  const [locationStatus, setLocationStatus] = useState(() =>
    geolocationSupported
      ? "Konum izni bekleniyor..."
      : "Bu cihazda konum desteği yok."
  );
  const cityOptions = useMemo(() => getAllCities(), []);
  const districtOptions = useMemo(() => getDistrictsByCity(manualCity), [manualCity]);

  const hasPermissionDeniedStatus = useMemo(() => {
    const normalizedStatus = foldText(locationStatus);
    return normalizedStatus.includes("izin reddedildi") || normalizedStatus.includes("izin bekleniyor");
  }, [locationStatus]);

  const requestNearbyPharmacies = useCallback(async (coords) => {
    setLoading(true);
    setLocationStatus("Yakındaki eczaneler getiriliyor...");

    try {
      const nearbyData = await withTimeout(
        getNearbyPharmacies({
          latitude: coords.latitude,
          longitude: coords.longitude,
          radiusKm: SEARCH_RADIUS_KM
        }),
        PHARMACY_REQUEST_TIMEOUT_MS,
        "nearby-pharmacies-timeout"
      );
      const data = mergePharmacyCollections(nearbyData);
      const dutyData = [];
      const dutyResult = { status: "rejected" };
      setDebugStats((current) => ({
        ...current,
        nearbyCount: nearbyData.length,
        onDutyCount: 0,
        mergedCount: data.length
      }));
      setDebugSamples(
        data.slice(0, 5).map((item) => ({
          id: item.id,
          name: item.name,
          source: item.source || "unknown",
          latitude: item.latitude,
          longitude: item.longitude,
          status: item.status
        }))
      );

      if (!data.length) {
        throw new Error("pharmacy-data-unavailable");
      }

      setOnDutyPharmacies([]);
      setPharmacies(data);
      setActivePharmacyId((currentId) => currentId || data[0]?.id || "");

      if (dutyData.length) {
        setLocationStatus(
          `Konuma göre ${data.length} eczane bulundu. ${dutyData.length} nöbetçi eczane aktif listelendi.`
        );
      } else if (nearbyData.length && dutyResult.status === "rejected") {
        setLocationStatus(
          `Konuma göre ${data.length} eczane bulundu. Nöbetçi eczane verisi şu anda alınamadı.`
        );
      } else if (data.length) {
        setLocationStatus(`Konuma göre ${data.length} eczane bulundu. Nöbetçi eczane verisi şu anda alınamadı.`);
      } else {
        setLocationStatus("Konum çevresinde eczane bulunamadı.");
      }
      withTimeout(
        getOnDutyPharmacies({
          latitude: coords.latitude,
          longitude: coords.longitude
        }),
        PHARMACY_REQUEST_TIMEOUT_MS,
        "duty-pharmacies-timeout"
      )
        .then((nextDutyData) => {
          const mergedData = mergePharmacyCollections(nearbyData, nextDutyData);
          setOnDutyPharmacies(nextDutyData);
          setPharmacies(mergedData);
          setActivePharmacyId((currentId) => currentId || nextDutyData[0]?.id || mergedData[0]?.id || "");
          setDebugStats((current) => ({
            ...current,
            onDutyCount: nextDutyData.length,
            mergedCount: mergedData.length
          }));
          setDebugSamples(
            mergedData.slice(0, 5).map((item) => ({
              id: item.id,
              name: item.name,
              source: item.source || "unknown",
              latitude: item.latitude,
              longitude: item.longitude,
              status: item.status
            }))
          );

          if (nextDutyData.length) {
            setLocationStatus(`Konuma gore ${mergedData.length} eczane bulundu. ${nextDutyData.length} nobetci eczane listelendi.`);
          }
        })
        .catch(() => {
          setOnDutyPharmacies([]);
        });
    } catch (error) {
      const fallback = buildFallbackPharmacies({ ...coords, force: true });
      const errorMessage =
        error instanceof Error && error.message
          ? `Eczane verisi alınamadı: ${error.message}`
          : "Eczane verisi alınamadı. İnternet bağlantınızı kontrol edin.";
      setLocationStatus(errorMessage);
      setPharmacies(fallback);
      setOnDutyPharmacies(fallback.filter((item) => foldText(item.status).includes("nobet")));
      setActivePharmacyId(fallback[0]?.id ?? "");
      setDebugSamples(
        fallback.slice(0, 5).map((item) => ({
          id: item.id,
          name: item.name,
          source: item.source || "offline",
          latitude: item.latitude,
          longitude: item.longitude,
          status: item.status
        }))
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOnDutyByManualLocation = useCallback(async () => {
    const city = manualCity.trim();
    const district = manualDistrict.trim();

    if (!city || !district) {
      setLocationStatus("Nöbetçi eczane için şehir ve ilçe bilgisi girin.");
      setActiveTab("onDuty");
      return;
    }

    setLoading(true);
    setActiveTab("onDuty");
    setLocationStatus(`${city} / ${district} için nöbetçi eczaneler getiriliyor...`);

    try {
      const dutyData = await getOnDutyPharmacies({ city, district });

      // ✅ DEBUG: Nöbetçi Eczane Koordinat Kontrolü
      console.log("📍 NÖBETÇI ECZANE VERİ ANALIZI");
      console.log("─".repeat(50));
      console.log(`✅ Toplam nöbetçi eczane: ${dutyData.length}`);

      if (dutyData.length > 0) {
        console.log("\n📌 İlk 3 Eczane Örneği:");
        dutyData.slice(0, 3).forEach((pharmacy, idx) => {
          console.log(`\n  ${idx + 1}. ${pharmacy.name}`);
          console.log(`     Enlem: ${pharmacy.latitude} (${typeof pharmacy.latitude})`);
          console.log(`     Boylam: ${pharmacy.longitude} (${typeof pharmacy.longitude})`);
          console.log(`     Adres: ${pharmacy.address}`);
          console.log(`     Durum: ${pharmacy.status}`);
          console.log(`     Kaynak: ${pharmacy.source}`);
        });
        console.log("\n" + "─".repeat(50));
      }

      // Tüm eczanelerin koordinat geçerliliğini kontrol et
      const validCoords = dutyData.filter(p =>
        Number.isFinite(p.latitude) && Number.isFinite(p.longitude)
      );
      const invalidCoords = dutyData.filter(p =>
        !Number.isFinite(p.latitude) || !Number.isFinite(p.longitude)
      );

      console.log(`\n✅ Geçerli koordinatlı: ${validCoords.length}`);
      console.log(`❌ Geçersiz koordinatlı: ${invalidCoords.length}`);

      if (invalidCoords.length > 0) {
        console.warn("⚠️ Geçersiz koordinatlı eczaneler:", invalidCoords.map(p => ({
          name: p.name,
          lat: p.latitude,
          lng: p.longitude
        })));
      }

      setDebugStats((current) => ({
        ...current,
        nearbyCount: 0,
        onDutyCount: dutyData.length,
        mergedCount: dutyData.length
      }));
      setDebugSamples(
        dutyData.slice(0, 5).map((item) => ({
          id: item.id,
          name: item.name,
          source: item.source || "unknown",
          latitude: item.latitude,
          longitude: item.longitude,
          status: item.status
        }))
      );
      setOnDutyPharmacies([]);
      setPharmacies(dutyData);
      setUserCoords(null);
      setLocationAccuracy(null);
      setActivePharmacyId(dutyData[0]?.id ?? "");

      if (dutyData.length) {
        setLocationStatus(`${city} / ${district} için ${dutyData.length} nöbetçi eczane listelendi.`);
      } else {
        setLocationStatus(`${city} / ${district} için nöbetçi eczane bulunamadı.`);
      }
    } catch (error) {
      console.error("❌ Nöbetçi eczane alınırken hata:", error);
      const fallback = buildFallbackPharmacies({ force: true });
      const errorMessage =
        error instanceof Error && error.message
          ? `Nöbetçi eczane verisi alınamadı: ${error.message}`
          : "Nöbetçi eczane verisi alınamadı. Şehir ve ilçe bilgisini kontrol edin.";
      setLocationStatus(errorMessage);
      setOnDutyPharmacies(fallback.filter((item) => foldText(item.status).includes("nobet")));
      setPharmacies(fallback);
      setActivePharmacyId(fallback[0]?.id ?? "");
      setDebugSamples(
        fallback.slice(0, 5).map((item) => ({
          id: item.id,
          name: item.name,
          source: item.source || "offline",
          latitude: item.latitude,
          longitude: item.longitude,
          status: item.status
        }))
      );
    } finally {
      setLoading(false);
    }
  }, [manualCity, manualDistrict]);

  const loadPharmaciesByManualLocation = useCallback(async () => {
    const city = manualCity.trim();
    const district = manualDistrict.trim();

    if (!city) {
      setLocationStatus("Tum eczaneler icin once sehir girin.");
      setActiveTab("map");
      return;
    }

    setLoading(true);
    setActiveTab("map");
    setUserCoords(null);
    setLocationAccuracy(null);
    setLocationStatus(
      district
        ? `${city} / ${district} icin eczaneler getiriliyor...`
        : `${city} icin eczaneler getiriliyor...`
    );

    try {
      const cityData = await getPharmaciesByCity({ city, district });

      setPharmacies(cityData);
      setOnDutyPharmacies(cityData.filter((item) => foldText(item.status).includes("nobet")));
      setActivePharmacyId(cityData[0]?.id ?? "");
      setDebugStats((current) => ({
        ...current,
        nearbyCount: cityData.length,
        onDutyCount: cityData.filter((item) => foldText(item.status).includes("nobet")).length,
        mergedCount: cityData.length
      }));
      setDebugSamples(
        cityData.slice(0, 5).map((item) => ({
          id: item.id,
          name: item.name,
          source: item.source || "unknown",
          latitude: item.latitude,
          longitude: item.longitude,
          status: item.status
        }))
      );

      if (cityData.length) {
        setLocationStatus(
          district
            ? `${city} / ${district} icin ${cityData.length} eczane listelendi.`
            : `${city} icin ${cityData.length} eczane listelendi.`
        );
      } else {
        setLocationStatus(
          district
            ? `${city} / ${district} icin eczane bulunamadi.`
            : `${city} icin eczane bulunamadi.`
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error && error.message
          ? `Sehre gore eczane verisi alinamadi: ${error.message}`
          : "Sehre gore eczane verisi alinamadi.";
      setLocationStatus(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [manualCity, manualDistrict]);

  const getCurrentCoordinates = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      let permissions;

      try {
        permissions = await Geolocation.checkPermissions();
      } catch (error) {
        if (isLocationServicesDisabledError(error)) {
          throw new Error(LOCATION_SERVICES_DISABLED_ERROR);
        }

        throw error;
      }

      if (!hasGrantedLocationPermission(permissions)) {
        try {
          permissions = await Geolocation.requestPermissions({
            permissions: ["location", "coarseLocation"]
          });
        } catch (error) {
          if (isLocationServicesDisabledError(error)) {
            throw new Error(LOCATION_SERVICES_DISABLED_ERROR);
          }

          if (isPermissionDeniedError(error)) {
            throw new Error(LOCATION_PERMISSION_ERROR);
          }

          throw error;
        }
      }

      if (!hasGrantedLocationPermission(permissions)) {
        throw new Error(LOCATION_PERMISSION_ERROR);
      }

      let position;

      try {
        position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          enableLocationFallback: true,
          timeout: 20000,
          maximumAge: 300000
        });
      } catch (error) {
        if (isPermissionDeniedError(error)) {
          throw new Error(LOCATION_PERMISSION_ERROR);
        }

        if (isLocationServicesDisabledError(error)) {
          throw new Error(LOCATION_SERVICES_DISABLED_ERROR);
        }

        if (isLocationTimeoutError(error)) {
          throw new Error(LOCATION_TIMEOUT_ERROR);
        }

        throw error;
      }

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      };
    }

    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      throw new Error("geolocation-not-supported");
    }

    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 300000
      });
    });

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy
    };
  }, []);

  const checkLocationPermission = useCallback(async () => {
    if (!geolocationSupported) {
      return "unsupported";
    }

    if (Capacitor.isNativePlatform()) {
      let permissions;

      try {
        permissions = await Geolocation.checkPermissions();
      } catch (error) {
        if (isLocationServicesDisabledError(error)) {
          return "services-disabled";
        }

        return "unknown";
      }

      if (hasGrantedLocationPermission(permissions)) {
        return "granted";
      }

      if (permissions.location === "denied" || permissions.coarseLocation === "denied") {
        return "denied";
      }

      return "prompt";
    }

    if (typeof navigator !== "undefined" && navigator.permissions?.query) {
      try {
        const permissionStatus = await navigator.permissions.query({ name: "geolocation" });
        return permissionStatus.state;
      } catch {
        return "unknown";
      }
    }

    return "unknown";
  }, [geolocationSupported]);

  const detectLocationAndLoad = useCallback(async () => {
    setLoading(true);
    setLocationStatus("Konum alınıyor...");

    try {
      const coords = await getCurrentCoordinates();
      setUserCoords(coords);
      setLocationAccuracy(typeof coords.accuracy === "number" ? coords.accuracy : null);
      await requestNearbyPharmacies(coords);
    } catch (error) {
      console.error("Location detection failed", error);
      setLocationAccuracy(null);
      if (error?.message === LOCATION_PERMISSION_ERROR) {
        setLocationStatus("Konum izni reddedildi. Ayarlardan izin vererek tekrar deneyin.");
      } else if (error?.message === LOCATION_SERVICES_DISABLED_ERROR) {
        setLocationStatus("Cihazda konum servisleri kapalı. GPS veya konum servislerini açıp tekrar deneyin.");
      } else if (error?.message === LOCATION_TIMEOUT_ERROR) {
        setLocationStatus("Konum zamanında alınamadı. Açık alanda tekrar deneyin.");
      } else {
        setLocationStatus("Konum alınamadı. Yakındaki örnek eczaneler gösteriliyor.");
      }
      const fallback = await getNearbyPharmacies();
      setPharmacies(fallback);
      setOnDutyPharmacies(fallback.filter((item) => foldText(item.status).includes("nobet")));
      setActivePharmacyId(fallback[0]?.id ?? "");
      setDebugSamples(
        fallback.slice(0, 5).map((item) => ({
          id: item.id,
          name: item.name,
          source: item.source || "unknown",
          latitude: item.latitude,
          longitude: item.longitude,
          status: item.status
        }))
      );
      setLoading(false);
    }
  }, [getCurrentCoordinates, requestNearbyPharmacies]);

  const refreshWhenPermissionReady = useCallback(async () => {
    if (!geolocationSupported || loading) {
      return;
    }

    const permissionState = await checkLocationPermission();

    if (
      permissionState === "granted" &&
      (!userCoords || !pharmacies.length || hasPermissionDeniedStatus)
    ) {
      await detectLocationAndLoad();
    }
  }, [
    checkLocationPermission,
    detectLocationAndLoad,
    geolocationSupported,
    hasPermissionDeniedStatus,
    loading,
    pharmacies.length,
    userCoords
  ]);

  useEffect(() => {
    getFallbackPharmacies()
      .then((fallback) => {
        setPharmacies((current) => (current.length ? current : fallback));
        setOnDutyPharmacies((current) =>
          current.length ? current : fallback.filter((item) => foldText(item.status).includes("nobet"))
        );
        setActivePharmacyId((current) => current || fallback[0]?.id || "");
        setDebugSamples((current) =>
          current.length
            ? current
            : fallback.slice(0, 5).map((item) => ({
                id: item.id,
                name: item.name,
                source: item.source || "unknown",
                latitude: item.latitude,
                longitude: item.longitude,
                status: item.status
              }))
        );
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!geolocationSupported) {
      getNearbyPharmacies()
        .then((fallback) => {
          setPharmacies(fallback);
          setOnDutyPharmacies(fallback.filter((item) => foldText(item.status).includes("nobet")));
          setActivePharmacyId(fallback[0]?.id ?? "");
          setDebugSamples(
            fallback.slice(0, 5).map((item) => ({
              id: item.id,
              name: item.name,
              source: item.source || "unknown",
              latitude: item.latitude,
              longitude: item.longitude,
              status: item.status
            }))
          );
          setLocationStatus("Bu cihazda konum desteği yok. Varsayılan eczane listesi gösteriliyor.");
        })
        .catch(() => {
          setLocationStatus("Eczane verisi alınamadı.");
          setDebugSamples([]);
        });
      return undefined;
    }

    detectLocationAndLoad().catch(() => undefined);

    return undefined;
  }, [detectLocationAndLoad, geolocationSupported]);

  useEffect(() => {
    if (!geolocationSupported || typeof window === "undefined" || typeof document === "undefined") {
      return undefined;
    }

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "hidden") {
        return;
      }

      refreshWhenPermissionReady().catch(() => undefined);
    };

    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    let permissionStatus;

    if (!Capacitor.isNativePlatform() && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((result) => {
          permissionStatus = result;
          permissionStatus.onchange = () => {
            refreshWhenPermissionReady().catch(() => undefined);
          };
        })
        .catch(() => undefined);
    }

    return () => {
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);

      if (permissionStatus) {
        permissionStatus.onchange = null;
      }
    };
  }, [geolocationSupported, refreshWhenPermissionReady]);

  const activePharmacy = useMemo(
    () => pharmacies.find((item) => item.id === activePharmacyId) ?? pharmacies[0] ?? null,
    [activePharmacyId, pharmacies]
  );

  const baseTabPharmacies = useMemo(() => {
    if (activeTab === "favorites") {
      return pharmacies.filter((item) => favoriteIds.includes(item.id));
    }

    if (activeTab === "onDuty") {
      return onDutyPharmacies.length
        ? onDutyPharmacies
        : pharmacies.filter((item) => foldText(item.status).includes("nobet"));
    }

    if (activeTab === "prescriptions") {
      return [];
    }

    return pharmacies;
  }, [activeTab, favoriteIds, onDutyPharmacies, pharmacies]);

  const filteredPharmacies = useMemo(() => {
    const normalizedQuery = foldText(query.trim());
    if (!normalizedQuery) {
      return baseTabPharmacies;
    }
    return baseTabPharmacies.filter((item) => {
      const name = foldText(item.name);
      const status = foldText(item.status);
      const address = foldText(item.address);
      return (
        name.includes(normalizedQuery) ||
        status.includes(normalizedQuery) ||
        address.includes(normalizedQuery)
      );
    });
  }, [baseTabPharmacies, query]);

  const mapPharmacies = useMemo(() => {
    if (activeTab === "map" && !query.trim()) {
      return pharmacies;
    }

    return filteredPharmacies;
  }, [activeTab, filteredPharmacies, pharmacies, query]);

  const mapCenterPharmacy =
    mapPharmacies.find((item) => item.id === activePharmacyId) ?? mapPharmacies[0] ?? activePharmacy;
  const mapSummaryItems = useMemo(() => {
    const visibleCount = mapPharmacies.length;
    const onDutyCount = mapPharmacies.filter((item) => foldText(item.status).includes("nobet")).length;
    const favoriteCountInView = mapPharmacies.filter((item) => favoriteIds.includes(item.id)).length;
    const items = [];

    if (activeTab === "favorites") {
      items.push({ kind: "favorite", text: `${visibleCount} favori eczane` });
    } else if (activeTab === "onDuty") {
      items.push({ kind: "duty", text: `${visibleCount} nobetci eczane` });
    } else {
      items.push({ kind: "nearby", text: `Yakinda ${visibleCount} eczane` });
    }

    if (activeTab === "map" && onDutyCount) {
      items.push({ kind: "duty", text: `${onDutyCount} nobetci` });
    }

    if (favoriteCountInView && activeTab !== "favorites") {
      items.push({ kind: "favorite", text: `${favoriteCountInView} favori` });
    }

    if (query.trim()) {
      items.push({ kind: "search", text: `Arama: ${query.trim()}` });
    } else if (activePharmacy?.name) {
      items.push({ kind: "active", text: `Secili: ${activePharmacy.name}` });
    }

    if (userCoords && locationAccuracy) {
      items.push({ kind: "gps", text: `GPS ±${Math.round(locationAccuracy)} m` });
    }

    return items;
  }, [activePharmacy?.name, activeTab, favoriteIds, locationAccuracy, mapPharmacies, query, userCoords]);

  const favoriteCount = favoriteIds.length;

  useEffect(() => {
    setDebugStats((current) => ({
      ...current,
      mergedCount: pharmacies.length
    }));
  }, [pharmacies.length]);

  useEffect(() => {
    if (!filteredPharmacies.length) {
      setActivePharmacyId("");
      return;
    }

    if (!filteredPharmacies.some((item) => item.id === activePharmacyId)) {
      setActivePharmacyId(filteredPharmacies[0].id);
    }
  }, [activePharmacyId, filteredPharmacies]);

  useEffect(() => {
    if (!activePharmacyId) {
      return;
    }

    const listElement = listRef.current;
    const cardElement = cardRefs.current.get(activePharmacyId);

    if (!listElement || !cardElement) {
      return;
    }

    const listRect = listElement.getBoundingClientRect();
    const cardRect = cardElement.getBoundingClientRect();
    const isFullyVisible = cardRect.top >= listRect.top && cardRect.bottom <= listRect.bottom;

    if (isFullyVisible) {
      return;
    }

    cardElement.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest"
    });
  }, [activePharmacyId, activeTab, filteredPharmacies]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteIds));
    } catch {
      // Ignore storage write failures and keep in-memory favorites.
    }
  }, [favoriteIds]);

  const toggleFavorite = (pharmacyId) => {
    setFavoriteIds((prev) => {
      if (prev.includes(pharmacyId)) {
        return prev.filter((id) => id !== pharmacyId);
      }

      if (prev.length >= FAVORITE_LIMIT) {
        return prev;
      }

      return [...prev, pharmacyId];
    });
  };

  return (
    <section className="pharmacy-screen">
      <div className="pharmacy-header">
        <h2 className="pharmacy-title">Eczane</h2>
        <p className="pharmacy-subtitle">e-Reçeteler ve eczane işlemleri</p>
      </div>

      <div className="pharmacy-tab-strip">
        <button
          type="button"
          onClick={() => setActiveTab("map")}
          className={["pharmacy-tab", activeTab === "map" ? "is-active" : ""].join(" ").trim()}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10z" />
            <circle cx="12" cy="11" r="2" />
          </svg>
          <span>Harita</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("favorites")}
          className={["pharmacy-tab", activeTab === "favorites" ? "is-active" : ""].join(" ").trim()}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="m12 17.27-4.15 2.18.79-4.6L5.3 11.6l4.62-.67L12 6.73l2.08 4.2 4.62.67-3.34 3.25.79 4.6L12 17.27z" />
          </svg>
          <span>Favoriler</span>
          <small>
            {favoriteCount}/{FAVORITE_LIMIT}
          </small>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("onDuty")}
          className={["pharmacy-tab", activeTab === "onDuty" ? "is-active" : ""].join(" ").trim()}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M21 12.79A9 9 0 1 1 11.21 3c.5 0 1 .04 1.49.12A7 7 0 0 0 21 12.79z" />
          </svg>
          <span>Nöbetçi</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("prescriptions")}
          className={["pharmacy-tab", activeTab === "prescriptions" ? "is-active" : ""].join(" ").trim()}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
            <path d="M16 13H8" />
            <path d="M16 17H8" />
          </svg>
          <span>Reçeteler</span>
        </button>
      </div>

      {activeTab !== "prescriptions" ? (
        <article className="pharmacy-map-shell">
          <PharmacyMap
            pharmacies={mapPharmacies}
            activePharmacy={mapCenterPharmacy}
            userCoords={userCoords}
            favoriteIds={favoriteIds}
            summaryItems={mapSummaryItems}
            onMarkerClick={setActivePharmacyId}
            onRouteSummaryChange={setRouteSummary}
            onMarkerStatsChange={handleMarkerStatsChange}
          />
        </article>
      ) : (
        <article className="pharmacy-empty-state pharmacy-prescriptions-panel">
          E-reçete entegrasyonu yakında. Burada reçeteleriniz listelenecek.
        </article>
      )}

      <section className="pharmacy-sheet">
        <span className="pharmacy-sheet-handle" aria-hidden="true" />
        <div className="pharmacy-sheet-head">
          <h3>{activeTab === "prescriptions" ? "Reçeteler" : "Eczane Seç"}</h3>
          <p>
            {activeTab === "prescriptions"
              ? "Reçete işlemleri bu bölümde görünecek."
              : `En fazla ${FAVORITE_LIMIT} eczane ekleyebilirsiniz`}
          </p>
          <p className="pharmacy-sheet-status">{locationStatus}</p>
          <p className="pharmacy-sheet-status">
            Debug: yakin {debugStats.nearbyCount}, nobetci {debugStats.onDutyCount}, toplam {debugStats.mergedCount}, koordinatli {debugStats.validCoordinatePharmacies}, marker {debugStats.renderedMarkers}
          </p>
          {debugSamples.length ? (
            <div className="pharmacy-debug-block">
              {debugSamples.map((item) => (
                <p key={item.id} className="pharmacy-sheet-status">
                  {item.name} | {item.source} | {String(item.latitude)}, {String(item.longitude)} | {item.status}
                </p>
              ))}
            </div>
          ) : null}
          {userCoords ? (
            <p className="pharmacy-sheet-status">
              Arama yarıçapı: {SEARCH_RADIUS_KM} km
              {typeof locationAccuracy === "number" ? ` (±${Math.round(locationAccuracy)} m)` : ""}
            </p>
          ) : null}
          {routeSummary.summary ? (
            <p className="pharmacy-sheet-status">Secili rota: {routeSummary.summary}</p>
          ) : null}
          {routeSummary.error ? (
            <p className="pharmacy-sheet-status">{routeSummary.error}</p>
          ) : null}
          <button type="button" onClick={detectLocationAndLoad} className="pharmacy-refresh-btn">
            Konumu yenile
          </button>
        </div>

        {activeTab !== "prescriptions" ? (
          <>
            <label className="pharmacy-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Eczane veya adres ara..."
              />
            </label>
            {activeTab === "map" ? (
              <div className="pharmacy-manual-location">
                <select
                  value={manualCity}
                  onChange={(event) => {
                    setManualCity(event.target.value);
                    setManualDistrict("");
                  }}
                >
                  <option value="">Sehir sec</option>
                  {cityOptions.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
                <select
                  value={manualDistrict}
                  onChange={(event) => setManualDistrict(event.target.value)}
                  disabled={!districtOptions.length}
                >
                  <option value="">{districtOptions.length ? "Ilce sec (opsiyonel)" : "Once sehir sec"}</option>
                  {districtOptions.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={loadPharmaciesByManualLocation} disabled={loading}>
                  Sehre gore eczane ara
                </button>
              </div>
            ) : null}
            {activeTab === "onDuty" ? (
              <div className="pharmacy-manual-location">
                <select
                  value={manualCity}
                  onChange={(event) => {
                    setManualCity(event.target.value);
                    setManualDistrict("");
                  }}
                >
                  <option value="">Sehir sec</option>
                  {cityOptions.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
                <select
                  value={manualDistrict}
                  onChange={(event) => setManualDistrict(event.target.value)}
                  disabled={!districtOptions.length}
                >
                  <option value="">{districtOptions.length ? "Ilce sec" : "Once sehir sec"}</option>
                  {districtOptions.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={loadOnDutyByManualLocation}
                  disabled={loading || !manualCity || !manualDistrict}
                >
                  Sehre gore nobetci ara
                </button>
              </div>
            ) : null}
          </>
        ) : null}

        <div ref={listRef} className="pharmacy-list">
          {activeTab === "prescriptions" ? (
            <article className="pharmacy-empty-state">Henüz reçete kaydı bulunamadı.</article>
          ) : null}

          {activeTab !== "prescriptions" &&
            filteredPharmacies.map((item) => (
            <article
              key={item.id}
              ref={(element) => {
                if (element) {
                  cardRefs.current.set(item.id, element);
                  return;
                }

                cardRefs.current.delete(item.id);
              }}
              className={["pharmacy-card", item.id === activePharmacyId ? "is-active" : ""].join(" ").trim()}
            >
              <div>
                <h4>{item.name}</h4>
                <p>Durum: {item.status}</p>
                <p>Uzaklık: {item.distanceText ?? "Bilinmiyor"}</p>
                {item.address ? <p>{item.address}</p> : null}
                {item.phone ? <p>Tel: {item.phone}</p> : null}
              </div>
              <div className="pharmacy-card-actions">
                <button type="button" onClick={() => setActivePharmacyId(item.id)}>
                  Haritada göster
                </button>
                <button
                  type="button"
                  onClick={() => window.open(getDirectionsUrl(item, userCoords), "_blank", "noopener,noreferrer")}
                >
                  Yol tarifi
                </button>
                <button
                  type="button"
                  className={["pharmacy-fav-btn", favoriteIds.includes(item.id) ? "is-on" : ""].join(" ").trim()}
                  onClick={() => toggleFavorite(item.id)}
                  disabled={!favoriteIds.includes(item.id) && favoriteIds.length >= FAVORITE_LIMIT}
                >
                  {favoriteIds.includes(item.id) ? "Favoriden çıkar" : "Favoriye ekle"}
                </button>
              </div>
            </article>
            ))}

          {!loading && !filteredPharmacies.length && activeTab !== "prescriptions" ? (
            <article className="pharmacy-empty-state">Eczane verisi bulunamadı.</article>
          ) : null}
        </div>
      </section>
    </section>
  );
}
