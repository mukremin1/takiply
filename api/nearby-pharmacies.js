const OVERPASS_API_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter"
];
const NOMINATIM_SEARCH_URLS = [
  "https://nominatim.openstreetmap.org/search",
  "https://nominatim.openstreetmap.org/search.php"
];

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

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");
  return rawBody ? JSON.parse(rawBody) : {};
}

function mapOverpassElements(elements, origin) {
  const mapped = [];
  const seen = new Set();

  elements.forEach((item, index) => {
    const latitude = item.lat ?? item.center?.lat;
    const longitude = item.lon ?? item.center?.lon;

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return;
    }

    const key = `${String(item.tags?.name || "eczane").toLowerCase()}-${latitude.toFixed(5)}-${longitude.toFixed(5)}`;
    if (seen.has(key)) {
      return;
    }

    seen.add(key);

    const distanceKm = getDistanceKm(origin.latitude, origin.longitude, latitude, longitude);
    const addressParts = [
      item.tags?.["addr:street"],
      item.tags?.["addr:housenumber"],
      item.tags?.["addr:suburb"],
      item.tags?.["addr:district"]
    ].filter(Boolean);

    mapped.push({
      id: `osm-${item.type}-${item.id ?? index}`,
      name: item.tags?.name?.trim() || "Eczane",
      status:
        item.tags?.opening_hours === "24/7"
          ? "24 saat acik"
          : item.tags?.dispensing === "yes"
            ? "Recete hizmeti"
            : "Yakinda",
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

  return mapped.sort((a, b) => a.distanceKm - b.distanceKm);
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

    const name = item.display_name?.split(",")?.[0]?.trim() || item.name?.trim() || "Eczane";
    const key = `${name.toLowerCase()}-${latitude.toFixed(5)}-${longitude.toFixed(5)}`;

    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    const distanceKm = getDistanceKm(origin.latitude, origin.longitude, latitude, longitude);

    mapped.push({
      id: `nominatim-${item.place_id ?? index}`,
      name,
      status: "Yakinda",
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
      fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=UTF-8"
        },
        body: query
      }),
    () =>
      fetch(`${endpoint}?data=${encodedQuery}`, {
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
      // Keep trying alternate transports/endpoints.
    }
  }

  return [];
}

async function fetchFromNominatim(origin, radiusKm) {
  const bbox = getBoundingBox(origin.latitude, origin.longitude, radiusKm);
  const queryVariants = ["eczane", "pharmacy"];

  for (const endpoint of NOMINATIM_SEARCH_URLS) {
    for (const query of queryVariants) {
      try {
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

        const response = await fetch(url.toString(), {
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
      } catch {
        // Try the next endpoint/query variant.
      }
    }
  }

  return [];
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "method-not-allowed" });
    return;
  }

  try {
    const payload = await readJsonBody(req);
    const latitude = Number(payload.latitude);
    const longitude = Number(payload.longitude);
    const radiusKm = Math.max(1, Math.min(Number(payload.radiusKm) || 10, 50));

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      res.status(400).json({ success: false, error: "missing-or-invalid-coordinates" });
      return;
    }

    const radiusMeters = Math.max(1500, Math.min(Math.round(radiusKm * 1000), 50000));
    const searchRadii = [
      radiusMeters,
      Math.min(Math.round(radiusMeters * 1.75), 50000),
      Math.min(Math.round(radiusMeters * 2.5), 50000)
    ];

    const collected = [];
    const seen = new Set();

    for (const meters of searchRadii) {
      const query = `
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

        if (collected.length >= 8) {
          res.status(200).json({ success: true, result: collected });
          return;
        }
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

    res.status(200).json({
      success: true,
      result: collected
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "nearby-pharmacy-proxy-failed",
      message: error instanceof Error ? error.message : "unknown-error"
    });
  }
}
