/* global __COLLECTAPI_KEY__ */
import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { request } from "./base44Client";
import { medications, pharmacies, vitals } from "./entities";
import { decodeMojibakeText, getCityByName, normalizeLocationName } from "../data/turkishCities";

const OVERPASS_API_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter"
];
const NOMINATIM_SEARCH_URLS = [
  "https://nominatim.openstreetmap.org/search",
  "https://nominatim.openstreetmap.org/search.php"
];
const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";
const COLLECTAPI_BASE_URL = "https://api.collectapi.com";
const NATIVE_COLLECTAPI_KEY = typeof __COLLECTAPI_KEY__ === "string" ? __COLLECTAPI_KEY__ : "";
const GOOGLE_PLACES_API_URL = "https://places.googleapis.com/v1/places:searchNearby";
const GOOGLE_PLACES_LEGACY_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json";
const ENABLE_PHARMACY_FALLBACK = String(import.meta.env.VITE_ENABLE_PHARMACY_FALLBACK || "").trim() === "true";
const GOOGLE_LEGACY_MAX_PAGES = 3;
const OSM_COLLECTION_TARGET = 200;
const CITY_WIDE_NOMINATIM_LIMIT = 200;

const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function getDistanceKm(fromLat, fromLon, toLat, toLon) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(toLat - fromLat);
  const dLon = toRadians(toLon - fromLon);
  const lat1 = toRadians(fromLat);
  const lat2 = toRadians(toLat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

function mapFallbackPharmacies(origin) {
  const mapped = pharmacies.map((item) => {
    const distanceKm =
      origin && typeof origin.latitude === "number" && typeof origin.longitude === "number"
        ? getDistanceKm(origin.latitude, origin.longitude, item.latitude, item.longitude)
        : item.distanceKm;

    return {
      ...item,
      address: item.address ?? "",
      phone: item.phone ?? "",
      openingHours: item.openingHours ?? "",
      source: "offline",
      distanceKm,
      distanceText: `${distanceKm.toFixed(1)} km`
    };
  });

  return mapped.sort((a, b) => a.distanceKm - b.distanceKm);
}

export function buildFallbackPharmacies(options = {}) {
  const { force = false } = options;

  if (!ENABLE_PHARMACY_FALLBACK && !force) {
    return [];
  }

  const { latitude, longitude } = options;

  if (typeof latitude === "number" && typeof longitude === "number") {
    return mapFallbackPharmacies({ latitude, longitude });
  }

  return mapFallbackPharmacies();
}

function withFallbackPharmacies(items, origin) {
  return mergePharmacyCollections(items, buildFallbackPharmacies(origin));
}

function mapOverpassElements(elements, origin) {
  const mapped = [];

  elements.forEach((item, index) => {
    const latitude = item.lat ?? item.center?.lat;
    const longitude = item.lon ?? item.center?.lon;

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return;
    }

    const distanceKm = getDistanceKm(origin.latitude, origin.longitude, latitude, longitude);
    const name = item.tags?.name?.trim() || "Eczane";
    const addressParts = [
      item.tags?.["addr:street"],
      item.tags?.["addr:housenumber"],
      item.tags?.["addr:suburb"],
      item.tags?.["addr:district"]
    ].filter(Boolean);

    mapped.push({
      id: `osm-${item.type}-${item.id ?? index}`,
      name,
      status:
        item.tags?.opening_hours === "24/7"
          ? "24 saat açık"
          : item.tags?.dispensing === "yes"
            ? "Reçete hizmeti"
            : "Yakında",
      latitude,
      longitude,
      address: addressParts.join(" "),
      phone: item.tags?.phone || item.tags?.["contact:phone"] || "",
      openingHours: item.tags?.opening_hours || "",
      source: "openstreetmap",
      distanceKm,
      distanceText: `${distanceKm.toFixed(1)} km`
    });
  });

  const deduped = [];
  const seen = new Set();

  mapped.forEach((item) => {
    const key = `${item.name.toLowerCase()}-${item.latitude.toFixed(5)}-${item.longitude.toFixed(5)}`;

    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    deduped.push(item);
  });

  return deduped.sort((a, b) => a.distanceKm - b.distanceKm);
}

function getBoundingBox(latitude, longitude, radiusKm) {
  const latDelta = radiusKm / 111;
  const lonDelta = radiusKm / (111 * Math.cos(toRadians(latitude)) || 1);

  return {
    minLat: latitude - latDelta,
    maxLat: latitude + latDelta,
    minLon: longitude - lonDelta,
    maxLon: longitude + lonDelta
  };
}

function getDisplayText(value) {
  return String(value ?? "").trim();
}

function getNumericCoordinate(value) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : null;
}

function normalizeDutyLocationPart(value) {
  return decodeMojibakeText(getDisplayText(value))
    .replace(/\s+ilcesi$/i, "")
    .replace(/\s+ilçe(si)?$/i, "")
    .replace(/\s+ilçe(si)?$/i, "")
    .replace(/\s+merkez$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getInternalApiUrl(pathname) {
  const configuredBaseUrl = getDisplayText(import.meta.env.VITE_SERVER_API_BASE_URL);

  if (configuredBaseUrl) {
    return new URL(pathname, configuredBaseUrl).toString();
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return new URL(pathname, window.location.origin).toString();
  }

  return pathname;
}

function normalizeHttpResponseData(data) {
  if (typeof data === "string") {
    const trimmed = data.trim();

    if (!trimmed) {
      return null;
    }

    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }

  return data ?? null;
}

async function requestJson(url, options = {}) {
  const { method = "GET", headers = {}, body, responseType = "json", timeoutMs = 12000 } = options;
  const normalizedContentType =
    headers["Content-Type"] || headers["content-type"] || headers["CONTENT-TYPE"] || "";

  const withTimeout = (promise, label) =>
    Promise.race([
      promise,
      new Promise((_, reject) => {
        window.setTimeout(() => {
          reject(new Error(`${label}-timeout`));
        }, timeoutMs);
      })
    ]);

  if (Capacitor.isNativePlatform()) {
    const response = await withTimeout(
      CapacitorHttp.request({
        url,
        method,
        headers,
        data: body,
        responseType
      }),
      "native-http"
    );

    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      json: async () => normalizeHttpResponseData(response.data),
      text: async () =>
        typeof response.data === "string" ? response.data : JSON.stringify(response.data ?? "")
    };
  }

  const webBody =
    typeof body === "string"
      ? body
      : body && normalizedContentType.toLowerCase().includes("application/json")
        ? JSON.stringify(body)
        : body;
  const controller = new AbortController();

  return withTimeout(
    fetch(url, {
      method,
      headers,
      body: webBody,
      signal: controller.signal
    }).finally(() => {
      controller.abort();
    }),
    "fetch"
  ).catch((error) => {
    controller.abort();
    throw error;
  });
}

async function fetchDutyPharmaciesFromCollectApi(city, district) {
  if (!NATIVE_COLLECTAPI_KEY) {
    return [];
  }

  const url = new URL("/health/dutyPharmacy", COLLECTAPI_BASE_URL);
  url.searchParams.set("il", city);
  url.searchParams.set("ilce", district);

  const response = await requestJson(url.toString(), {
    headers: {
      "Content-Type": "application/json",
      Authorization: `apikey ${NATIVE_COLLECTAPI_KEY}`
    }
  });

  if (!response.ok) {
    return [];
  }

  const payload = await response.json();
  return Array.isArray(payload?.result) ? payload.result : [];
}

function mergePharmacyCollections(...collections) {
  const merged = [];
  const seen = new Map();

  collections.flat().forEach((item) => {
    const latitude = getNumericCoordinate(item?.latitude);
    const longitude = getNumericCoordinate(item?.longitude);

    if (!item || latitude === null || longitude === null) {
      return;
    }

    const key = `${String(item.name || "").toLowerCase()}-${latitude.toFixed(5)}-${longitude.toFixed(5)}`;
    const existingIndex = seen.get(key);
    const normalizedItem = {
      ...item,
      latitude,
      longitude,
      distanceKm: getNumericCoordinate(item.distanceKm)
    };

    if (typeof existingIndex !== "number") {
      seen.set(key, merged.length);
      merged.push(normalizedItem);
      return;
    }

    const existing = merged[existingIndex];
    merged[existingIndex] = {
      ...existing,
      ...normalizedItem,
      status:
        String(normalizedItem.status || "").toLocaleLowerCase("tr").includes("nöbet") ||
        String(normalizedItem.status || "").toLocaleLowerCase("tr").includes("nobet")
          ? normalizedItem.status
          : existing.status,
      address: normalizedItem.address || existing.address,
      phone: normalizedItem.phone || existing.phone,
      openingHours: normalizedItem.openingHours || existing.openingHours,
      source: normalizedItem.source || existing.source
    };
  });

  return merged.sort((a, b) => (a.distanceKm ?? Number.MAX_SAFE_INTEGER) - (b.distanceKm ?? Number.MAX_SAFE_INTEGER));
}

function mapNominatimElements(items, origin) {
  const mapped = [];
  const seen = new Set();

  items.forEach((item, index) => {
    const latitude = Number(item.lat);
    const longitude = Number(item.lon);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return;
    }

    const distanceKm = getDistanceKm(origin.latitude, origin.longitude, latitude, longitude);
    const name = item.display_name?.split(",")?.[0]?.trim() || item.name?.trim() || "Eczane";
    const key = `${name.toLowerCase()}-${latitude.toFixed(5)}-${longitude.toFixed(5)}`;

    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    mapped.push({
      id: `nominatim-${item.place_id ?? index}`,
      name,
      status: "Yakında",
      latitude,
      longitude,
      address: item.display_name || "",
      phone: "",
      openingHours: "",
      source: "nominatim",
      distanceKm,
      distanceText: `${distanceKm.toFixed(1)} km`
    });
  });

  return mapped.sort((a, b) => a.distanceKm - b.distanceKm);
}

async function fetchOverpassResults(endpoint, query) {
  const encodedQuery = encodeURIComponent(query);

  const attempts = [
    () =>
      requestJson(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=UTF-8"
        },
        body: query
      }),
    () =>
      requestJson(`${endpoint}?data=${encodedQuery}`, {
        method: "GET",
        headers: {
          Accept: "application/json"
        }
      })
  ];

  for (const attempt of attempts) {
    try {
      const response = await attempt();

      if (!response.ok) {
        continue;
      }

      const payload = await response.json();
      return Array.isArray(payload?.elements) ? payload.elements : [];
    } catch {
      // Try the next transport/endpoint combination.
    }
  }

  return [];
}

function mapGooglePlacesResults(items, origin) {
  const mapped = [];
  const seen = new Set();

  (Array.isArray(items) ? items : []).forEach((item, index) => {
    const latitude = Number(item.location?.latitude);
    const longitude = Number(item.location?.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return;
    }

    const name =
      getDisplayText(item.displayName?.text) ||
      getDisplayText(item.displayName) ||
      "Eczane";
    const key = `${name.toLowerCase()}-${latitude.toFixed(5)}-${longitude.toFixed(5)}`;

    if (seen.has(key)) {
      return;
    }

    seen.add(key);

    const distanceKm = getDistanceKm(origin.latitude, origin.longitude, latitude, longitude);
    mapped.push({
      id: `google-${item.id ?? index}`,
      name,
      status: item.regularOpeningHours?.openNow ? "Acik" : "Yakinda",
      latitude,
      longitude,
      address: getDisplayText(item.formattedAddress),
      phone: getDisplayText(item.nationalPhoneNumber),
      openingHours: "",
      source: "google-places",
      distanceKm,
      distanceText: `${distanceKm.toFixed(1)} km`
    });
  });

  return mapped.sort((a, b) => a.distanceKm - b.distanceKm);
}

function mapGoogleLegacyPlacesResults(items, origin) {
  const mapped = [];
  const seen = new Set();

  (Array.isArray(items) ? items : []).forEach((item, index) => {
    const latitude = Number(item.geometry?.location?.lat);
    const longitude = Number(item.geometry?.location?.lng);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return;
    }

    const name = getDisplayText(item.name) || "Eczane";
    const key = `${name.toLowerCase()}-${latitude.toFixed(5)}-${longitude.toFixed(5)}`;

    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    const distanceKm = getDistanceKm(origin.latitude, origin.longitude, latitude, longitude);

    mapped.push({
      id: `google-legacy-${item.place_id ?? index}`,
      name,
      status: item.business_status === "OPERATIONAL" ? "Yakinda" : "Bilinmiyor",
      latitude,
      longitude,
      address: getDisplayText(item.vicinity),
      phone: "",
      openingHours: "",
      source: "google-places-legacy",
      distanceKm,
      distanceText: `${distanceKm.toFixed(1)} km`
    });
  });

  return mapped.sort((a, b) => a.distanceKm - b.distanceKm);
}

async function fetchFromGooglePlaces(origin, radiusKm) {
  const apiKey = getDisplayText(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);

  if (!apiKey) {
    return [];
  }

  const radiusMeters = Math.max(1000, Math.min(Math.round(radiusKm * 1000), 50000));
  const response = await requestJson(GOOGLE_PLACES_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.nationalPhoneNumber,places.regularOpeningHours.openNow"
    },
    body: {
      includedTypes: ["pharmacy"],
      maxResultCount: 20,
      rankPreference: "DISTANCE",
      regionCode: "TR",
      languageCode: "tr",
      locationRestriction: {
        circle: {
          center: {
            latitude: origin.latitude,
            longitude: origin.longitude
          },
          radius: radiusMeters
        }
      }
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`google-places-${response.status}:${errorText}`);
  }

  const payload = await response.json();
  return mapGooglePlacesResults(payload?.places, origin);
}

async function fetchFromGooglePlacesLegacy(origin, radiusKm) {
  const apiKey = getDisplayText(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);

  if (!apiKey) {
    return [];
  }

  const radiusMeters = Math.max(1000, Math.min(Math.round(radiusKm * 1000), 50000));
  const url = new URL(GOOGLE_PLACES_LEGACY_URL);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("location", `${origin.latitude},${origin.longitude}`);
  url.searchParams.set("radius", String(radiusMeters));
  url.searchParams.set("type", "pharmacy");
  url.searchParams.set("language", "tr");

  const results = [];
  let nextPageToken = "";

  for (let page = 0; page < GOOGLE_LEGACY_MAX_PAGES; page += 1) {
    if (nextPageToken) {
      url.searchParams.set("pagetoken", nextPageToken);
    } else {
      url.searchParams.delete("pagetoken");
    }

    if (page > 0) {
      await new Promise((resolve) => {
        window.setTimeout(resolve, 2200);
      });
    }

    const response = await requestJson(url.toString(), {
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`google-legacy-${response.status}:${errorText}`);
    }

    const payload = await response.json();

    if (payload?.status === "INVALID_REQUEST" && nextPageToken) {
      continue;
    }

    if (payload?.status && payload.status !== "OK" && payload.status !== "ZERO_RESULTS") {
      throw new Error(`google-legacy-${payload.status}:${payload?.error_message ?? ""}`);
    }

    if (Array.isArray(payload?.results) && payload.results.length) {
      results.push(...payload.results);
    }

    nextPageToken = getDisplayText(payload?.next_page_token);
    if (!nextPageToken) {
      break;
    }
  }

  return mapGoogleLegacyPlacesResults(results, origin);
}

async function fetchFromNominatim(origin, radiusKm) {
  const bbox = getBoundingBox(origin.latitude, origin.longitude, radiusKm);
  const queryVariants = ["eczane", "pharmacy"];

  for (const endpoint of NOMINATIM_SEARCH_URLS) {
    for (const query of queryVariants) {
      const url = new URL(endpoint);
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("limit", "60");
      url.searchParams.set("q", query);
      url.searchParams.set("bounded", "1");
      url.searchParams.set("dedupe", "1");
      url.searchParams.set("accept-language", "tr");
      url.searchParams.set(
        "viewbox",
        `${bbox.minLon},${bbox.maxLat},${bbox.maxLon},${bbox.minLat}`
      );

      const response = await requestJson(url.toString(), {
        headers: {
          Accept: "application/json"
        }
      });

      if (!response.ok) {
        continue;
      }

      const payload = await response.json();
      const mapped = mapNominatimElements(Array.isArray(payload) ? payload : [], origin);

      if (mapped.length) {
        return mapped;
      }
    }
  }

  return [];
}

async function fetchFromContextualNominatim(origin, radiusKm) {
  const location = await reverseGeocodeLocation(origin.latitude, origin.longitude);
  const city = normalizeDutyLocationPart(location.city);
  const district = normalizeDutyLocationPart(location.district);
  const queries = [
    [district, city, "eczane"].filter(Boolean).join(" "),
    [district, city, "pharmacy"].filter(Boolean).join(" "),
    [city, "eczane"].filter(Boolean).join(" ")
  ].filter(Boolean);

  for (const endpoint of NOMINATIM_SEARCH_URLS) {
    for (const query of queries) {
      try {
        const url = new URL(endpoint);
        url.searchParams.set("format", "jsonv2");
        url.searchParams.set("limit", "60");
        url.searchParams.set("q", query);
        url.searchParams.set("dedupe", "1");
        url.searchParams.set("accept-language", "tr");
        url.searchParams.set("countrycodes", "tr");

        const response = await requestJson(url.toString(), {
          headers: {
            Accept: "application/json"
          }
        });

        if (!response.ok) {
          continue;
        }

        const payload = await response.json();
        const mapped = mapNominatimElements(Array.isArray(payload) ? payload : [], origin).filter(
          (item) => (item.distanceKm ?? Number.MAX_SAFE_INTEGER) <= Math.max(radiusKm * 1.5, 15)
        );

        if (mapped.length) {
          return mapped;
        }
      } catch {
        // Try the next query/endpoint pair.
      }
    }
  }

  return [];
}

async function reverseGeocodeLocation(latitude, longitude) {
  const url = new URL(NOMINATIM_REVERSE_URL);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("zoom", "18");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "tr");

  const response = await requestJson(url.toString(), {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error("reverse-geocode-failed");
  }

  const payload = await response.json();
  const address = payload?.address ?? {};

  return {
    city: getDisplayText(address.city || address.province || address.state),
    district: getDisplayText(address.town || address.city_district || address.suburb || address.county)
  };
}

async function geocodeNamedLocation(query) {
  const normalizedQuery = getDisplayText(query);

  if (!normalizedQuery) {
    return null;
  }

  for (const endpoint of NOMINATIM_SEARCH_URLS) {
    try {
      const url = new URL(endpoint);
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("limit", "1");
      url.searchParams.set("q", normalizedQuery);
      url.searchParams.set("accept-language", "tr");
      url.searchParams.set("countrycodes", "tr");

      const response = await requestJson(url.toString(), {
        headers: {
          Accept: "application/json"
        }
      });

      if (!response.ok) {
        continue;
      }

      const payload = await response.json();
      const item = Array.isArray(payload) ? payload[0] : null;
      const latitude = getNumericCoordinate(item?.lat);
      const longitude = getNumericCoordinate(item?.lon);

      if (latitude !== null && longitude !== null) {
        return { latitude, longitude };
      }
    } catch {
      // Try next endpoint.
    }
  }

  return null;
}

async function fetchFromNamedLocation(city, district, origin) {
  const queries = [
    [district, city, "eczane"].filter(Boolean).join(" "),
    [district, city, "pharmacy"].filter(Boolean).join(" "),
    [city, "eczane"].filter(Boolean).join(" "),
    [city, "pharmacy"].filter(Boolean).join(" ")
  ].filter(Boolean);

  const merged = [];
  const seen = new Set();

  for (const endpoint of NOMINATIM_SEARCH_URLS) {
    for (const query of queries) {
      try {
        const url = new URL(endpoint);
        url.searchParams.set("format", "jsonv2");
        url.searchParams.set("limit", String(CITY_WIDE_NOMINATIM_LIMIT));
        url.searchParams.set("q", query);
        url.searchParams.set("dedupe", "1");
        url.searchParams.set("accept-language", "tr");
        url.searchParams.set("countrycodes", "tr");

        const response = await requestJson(url.toString(), {
          headers: {
            Accept: "application/json"
          }
        });

        if (!response.ok) {
          continue;
        }

        const payload = await response.json();
        const mapped = mapNominatimElements(Array.isArray(payload) ? payload : [], origin);

        mapped.forEach((item) => {
          const key = `${item.name.toLowerCase()}-${item.latitude.toFixed(5)}-${item.longitude.toFixed(5)}`;

          if (seen.has(key)) {
            return;
          }

          seen.add(key);
          merged.push(item);
        });
      } catch {
        // Try next query.
      }
    }
  }

  return merged.sort((a, b) => (a.distanceKm ?? Number.MAX_SAFE_INTEGER) - (b.distanceKm ?? Number.MAX_SAFE_INTEGER));
}

function mapDutyPharmacyResults(items, origin) {
  return (Array.isArray(items) ? items : [])
    .map((item, index) => {
      // DEBUG: Veri yapısını kontrol et - ilk item'i logla
      if (index === 0) {
        console.log("🔍 CollectAPI Sample Item (İlk Eczane):", JSON.stringify(item, null, 2));
      }

      // Koordinat ayrıştırma - birden fazla format destekle
      let latitude = null;
      let longitude = null;

      // Format 1: "lat,lng" string (LOC alanı)
      if (item.loc && typeof item.loc === 'string') {
        const locParts = item.loc.split(',');
        if (locParts.length === 2) {
          const parsedLat = parseFloat(locParts[0]?.trim());
          const parsedLng = parseFloat(locParts[1]?.trim());
          if (Number.isFinite(parsedLat) && Number.isFinite(parsedLng)) {
            latitude = parsedLat;
            longitude = parsedLng;
          }
        }
      }

      // Format 2: Ayrı latitude/longitude alanları
      if (latitude === null || longitude === null) {
        const lat = parseFloat(item.latitude ?? item.lat);
        const lng = parseFloat(item.longitude ?? item.lng ?? item.lon);
        if (Number.isFinite(lat)) latitude = lat;
        if (Number.isFinite(lng)) longitude = lng;
      }

      // Koordinat validasyonu
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        console.warn(`⚠️ UYARI: Koordinat bulunamadı veya geçersiz - ${item.name}`, {
          name: item.name,
          loc: item.loc,
          latitude: item.latitude,
          latitude_type: typeof item.latitude,
          longitude: item.longitude,
          longitude_type: typeof item.longitude,
          lat: item.lat,
          lat_type: typeof item.lat,
          lng: item.lng,
          lng_type: typeof item.lng,
          lon: item.lon,
          lon_type: typeof item.lon,
          parsed_latitude: latitude,
          parsed_longitude: longitude
        });
        return null;
      }

      // Distance hesapla
      const hasOrigin =
        origin && typeof origin.latitude === "number" && typeof origin.longitude === "number";
      const distanceKm = hasOrigin
        ? getDistanceKm(origin.latitude, origin.longitude, latitude, longitude)
        : null;

      // Sonuç objesi - KOORDİNATLAR HER ZAMAN NUMBER
      return {
        id: `duty-${item.name ?? "eczane"}-${index}`,
        name: getDisplayText(item.name) || "Nöbetçi Eczane",
        status: "Nöbetçi",
        latitude: Number(latitude),     // ✅ FLOAT (number)
        longitude: Number(longitude),   // ✅ FLOAT (number)
        address: getDisplayText(item.address),
        phone: getDisplayText(item.phone),
        openingHours: getDisplayText(item.openingHours || item.opening),
        district: getDisplayText(item.dist),
        source: "collectapi",
        distanceKm,
        distanceText: typeof distanceKm === "number" ? `${distanceKm.toFixed(1)} km` : ""
      };
    })
    .filter(Boolean)
    .sort(
      (a, b) => (a.distanceKm ?? Number.MAX_SAFE_INTEGER) - (b.distanceKm ?? Number.MAX_SAFE_INTEGER)
    );
}

export async function getDashboardSummary() {
  const dueToday = medications.length;
  const refillSoon = medications.filter((item) => item.stock <= 12).length;

  return request([
    { title: "Bugünkü dozlar", value: String(dueToday), note: "1 doz 18:00" },
    { title: "Yaklaşan yenileme", value: String(refillSoon), note: "48 saat içinde" },
    { title: "Kaydedilen vital", value: String(vitals.length), note: "Son 7 gün" }
  ]);
}

export async function getMedications() {
  return request(
    medications.map((item) => ({
      ...item,
      stockText: `${item.stock} ${item.unit}`
    }))
  );
}

const medicationBarcodeIndex = {
  "8699546350012": {
    name: "Parol 500 mg Tablet",
    manufacturer: "Atabay",
    activeIngredient: "Parasetamol",
    dosageForm: "Tablet",
    strength: "500 mg",
    usage: "Ateş ve hafif-orta şiddetli ağrı tedavisi",
    warnings: [
      "Günlük maksimum dozu aşmayın.",
      "Karaciğer hastalığınız varsa doktora danışın."
    ]
  },
  "8699522090017": {
    name: "Ventolin İnhaler",
    manufacturer: "GlaxoSmithKline",
    activeIngredient: "Salbutamol",
    dosageForm: "İnhaler",
    strength: "100 mcg",
    usage: "Astım semptomlarının giderilmesi",
    warnings: [
      "Çarpıntı yapabilir.",
      "Sık kullanım ihtiyacında doktor kontrolü gerekir."
    ]
  },
  "8699832090011": {
    name: "B12 Vitamini Tablet",
    manufacturer: "Koçak Farma",
    activeIngredient: "Siyanokobalamin",
    dosageForm: "Tablet",
    strength: "1000 mcg",
    usage: "B12 eksikliği tedavisi",
    warnings: ["Hamilelik veya emzirme döneminde hekime danışın."]
  }
};

export async function getDrugInfoByBarcode(barcode) {
  const normalized = String(barcode || "").trim();

  if (!normalized) {
    throw new Error("Barkod bilgisi bulunamadı.");
  }

  const item = medicationBarcodeIndex[normalized];

  if (!item) {
    return request(null);
  }

  return request({
    barcode: normalized,
    ...item
  });
}

export async function getNearbyPharmacies(options = {}) {
  const { latitude, longitude, radiusKm = 10 } = options;
  const hasServerApiBaseUrl = Boolean(getDisplayText(import.meta.env.VITE_SERVER_API_BASE_URL));
  const canQueryGoogleDirectly = Capacitor.isNativePlatform();

  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return request(mapFallbackPharmacies());
  }

  const sourceCollections = [];
  const sourceErrors = [];
  const fastSources = canQueryGoogleDirectly
    ? [
        fetchFromGooglePlaces({ latitude, longitude }, radiusKm),
        fetchFromGooglePlacesLegacy({ latitude, longitude }, radiusKm)
      ]
    : [];

  if (hasServerApiBaseUrl) {
    fastSources.push(
      (async () => {
        const proxyResponse = await requestJson(getInternalApiUrl("/api/nearby-pharmacies"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: { latitude, longitude, radiusKm }
        });

        if (!proxyResponse.ok) {
          const errorText = await proxyResponse.text();
          throw new Error(`nearby-proxy-${proxyResponse.status}:${errorText}`);
        }

        const payload = await proxyResponse.json();
        return Array.isArray(payload?.result) ? payload.result : [];
      })()
    );
  }

  const fastResults = await Promise.allSettled(fastSources);

  fastResults.forEach((result) => {
    if (result.status === "fulfilled") {
      if (Array.isArray(result.value) && result.value.length) {
        sourceCollections.push(result.value);
      }
      return;
    }

    if (result.reason instanceof Error) {
      sourceErrors.push(result.reason);
    }
  });

  if (sourceCollections.length) {
    return request(withFallbackPharmacies(mergePharmacyCollections(...sourceCollections), { latitude, longitude }));
  }

  const radiusMeters = Math.max(1500, Math.min(Math.round(radiusKm * 1000), 50000));
  const searchRadii = [
    radiusMeters,
    Math.min(Math.round(radiusMeters * 1.75), 50000),
    Math.min(Math.round(radiusMeters * 2.5), 50000)
  ];

  const buildQuery = (meters) => `
[out:json][timeout:25];
(
  node["amenity"="pharmacy"](around:${meters},${latitude},${longitude});
  way["amenity"="pharmacy"](around:${meters},${latitude},${longitude});
  relation["amenity"="pharmacy"](around:${meters},${latitude},${longitude});
  node["healthcare"="pharmacy"](around:${meters},${latitude},${longitude});
  way["healthcare"="pharmacy"](around:${meters},${latitude},${longitude});
  relation["healthcare"="pharmacy"](around:${meters},${latitude},${longitude});
  node["shop"="chemist"](around:${meters},${latitude},${longitude});
  way["shop"="chemist"](around:${meters},${latitude},${longitude});
  relation["shop"="chemist"](around:${meters},${latitude},${longitude});
  node["name"~"eczane|pharmacy",i](around:${meters},${latitude},${longitude});
  way["name"~"eczane|pharmacy",i](around:${meters},${latitude},${longitude});
  relation["name"~"eczane|pharmacy",i](around:${meters},${latitude},${longitude});
);
out center;
`;

  const collected = [];
  const seen = new Set();

  try {
    for (const meters of searchRadii) {
      const query = buildQuery(meters);

      for (const endpoint of OVERPASS_API_URLS) {
        const elements = await fetchOverpassResults(endpoint, query);
        const mapped = mapOverpassElements(elements, { latitude, longitude });

        mapped.forEach((item) => {
          const key = `${item.name.toLowerCase()}-${item.latitude.toFixed(5)}-${item.longitude.toFixed(5)}`;

          if (seen.has(key)) {
            return;
          }

          seen.add(key);
          collected.push(item);
        });

        if (collected.length >= OSM_COLLECTION_TARGET) {
          break;
        }
      }

      if (collected.length >= OSM_COLLECTION_TARGET) {
        break;
      }
    }

    const nominatimResults = await fetchFromNominatim({ latitude, longitude }, radiusKm);

    nominatimResults.forEach((item) => {
      const key = `${item.name.toLowerCase()}-${item.latitude.toFixed(5)}-${item.longitude.toFixed(5)}`;

      if (seen.has(key)) {
        return;
      }

      seen.add(key);
      collected.push(item);
    });

    if (collected.length) {
      sourceCollections.push(collected);
    }

    if (!sourceCollections.length) {
      const contextualNominatimResults = await fetchFromContextualNominatim(
        { latitude, longitude },
        radiusKm
      );

      if (contextualNominatimResults.length) {
        sourceCollections.push(contextualNominatimResults);
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      sourceErrors.push(error);
    }
  }

  if (sourceCollections.length) {
    return request(withFallbackPharmacies(mergePharmacyCollections(...sourceCollections), { latitude, longitude }));
  }

  if (sourceErrors.length) {
    throw sourceErrors[0];
  }

  return request(mapFallbackPharmacies({ latitude, longitude }));
}

export async function getFallbackPharmacies(options = {}) {
  return request(buildFallbackPharmacies({ ...options, force: true }));
}

export async function getPharmaciesByCity(options = {}) {
  const city = normalizeDutyLocationPart(options.city);
  const district = normalizeDutyLocationPart(options.district);
  const normalizedCity = normalizeLocationName(city);

  if (!normalizedCity) {
    return request([]);
  }

  const cityRecord = getCityByName(city);
  const districtCenter = district ? await geocodeNamedLocation(`${district}, ${city}, Turkiye`) : null;
  const cityCenter = cityRecord
    ? { latitude: cityRecord.latitude, longitude: cityRecord.longitude }
    : await geocodeNamedLocation(`${city}, Turkiye`);
  const origin = districtCenter || cityCenter;

  if (!origin) {
    throw new Error("city-location-not-found");
  }

  const radiusKm = district ? 12 : 45;
  const sourceCollections = [];

  try {
    const nearbyResults = await getNearbyPharmacies({
      latitude: origin.latitude,
      longitude: origin.longitude,
      radiusKm
    });

    if (nearbyResults.length) {
      sourceCollections.push(nearbyResults);
    }
  } catch {
    // Continue with named location search.
  }

  const namedLocationResults = await fetchFromNamedLocation(city, district, origin);

  if (namedLocationResults.length) {
    sourceCollections.push(namedLocationResults);
  }

  const merged = mergePharmacyCollections(...sourceCollections);

  if (merged.length) {
    return request(merged);
  }

  return request(buildFallbackPharmacies({ ...origin, force: true }));
}

export async function getOnDutyPharmacies(options = {}) {
  const { latitude, longitude } = options;
  const cityOverride = normalizeDutyLocationPart(options.city);
  const districtOverride = normalizeDutyLocationPart(options.district);
  const hasCoords = typeof latitude === "number" && typeof longitude === "number";

  try {
    const location =
      cityOverride && districtOverride
        ? { city: cityOverride, district: districtOverride }
          : hasCoords
          ? await reverseGeocodeLocation(latitude, longitude)
          : { city: "", district: "" };

    const city = normalizeDutyLocationPart(location.city);
    const district = normalizeDutyLocationPart(location.district);

    if (!city || !district) {
      return request([]);
    }

    let upstreamItems = [];

    if (Capacitor.isNativePlatform() && !getDisplayText(import.meta.env.VITE_SERVER_API_BASE_URL)) {
      upstreamItems = await fetchDutyPharmaciesFromCollectApi(city, district);
    } else {
      const response = await fetch(getInternalApiUrl("/api/duty-pharmacies"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ city, district })
      });

      if (response.ok) {
        const payload = await response.json();
        upstreamItems = Array.isArray(payload?.result) ? payload.result : [];
      } else if (Capacitor.isNativePlatform()) {
        upstreamItems = await fetchDutyPharmaciesFromCollectApi(city, district);
      }
    }

    const result = mapDutyPharmacyResults(upstreamItems, hasCoords ? { latitude, longitude } : null);
    return request(result);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error("duty-pharmacy-request-failed");
  }
}

export { mergePharmacyCollections };

function stripMarkdownCodeFence(text) {
  const trimmed = text.trim();

  if (!trimmed.startsWith("```")) {
    return trimmed;
  }

  return trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

function normalizeAnalysisPayload(payload = {}) {
  const medicationsList = Array.isArray(payload.medications)
    ? payload.medications.map((item, index) => ({
        name: item?.name || `İlaç ${index + 1}`,
        dosage: item?.dosage || "",
        frequency: item?.frequency || "",
        usage: item?.usage || ""
      }))
    : [];

  return {
    patient: payload.patient || "",
    doctor: payload.doctor || "",
    date: payload.date || "",
    medications: medicationsList,
    warnings: Array.isArray(payload.warnings) ? payload.warnings.filter(Boolean) : [],
    interactions: Array.isArray(payload.interactions) ? payload.interactions.filter(Boolean) : [],
    notes: Array.isArray(payload.notes) ? payload.notes.filter(Boolean) : []
  };
}

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Dosya okunamadı."));

    reader.readAsDataURL(file);
  });
}

export async function analyzePrescriptionWithAI(file) {
  if (!(file instanceof File)) {
    throw new Error("Geçerli bir reçete görseli seçilmedi.");
  }

  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  const baseUrl = import.meta.env.VITE_OPENAI_BASE_URL || DEFAULT_OPENAI_BASE_URL;
  const model = import.meta.env.VITE_OPENAI_MODEL || DEFAULT_OPENAI_MODEL;

  if (!apiKey) {
    throw new Error("AI ayarları eksik. .env dosyasına VITE_OPENAI_API_KEY ekleyin.");
  }

  const imageDataUrl = await fileToDataUrl(file);

  const prompt = [
    "Aşağıdaki reçete görselini Türkçe olarak analiz et.",
    "Sadece JSON döndür, açıklama yazma.",
    "JSON şeması:",
    "{",
    '  "patient": "string",',
    '  "doctor": "string",',
    '  "date": "string",',
    '  "medications": [',
    '    {"name":"string","dosage":"string","frequency":"string","usage":"string"}',
    "  ],",
    '  "warnings": ["string"],',
    '  "interactions": ["string"],',
    '  "notes": ["string"]',
    "}",
    "Alan bulunamazsa boş string veya boş dizi döndür."
  ].join("\n");

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: imageDataUrl
              }
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI analiz hatası: ${response.status} ${errorText}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;

  if (!content || typeof content !== "string") {
    throw new Error("AI cevabı boş veya geçersiz.");
  }

  const parsed = JSON.parse(stripMarkdownCodeFence(content));
  return normalizeAnalysisPayload(parsed);
}
