const COLLECTAPI_BASE_URL = "https://api.collectapi.com";

function getText(value) {
  return String(value ?? "").trim();
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

  const apiKey = process.env.COLLECTAPI_KEY;

  if (!apiKey) {
    res.status(500).json({ success: false, error: "missing-collectapi-key" });
    return;
  }

  try {
    const payload = await readJsonBody(req);
    const city = getText(payload.city);
    const district = getText(payload.district);

    if (!city || !district) {
      res.status(400).json({ success: false, error: "missing-city-or-district" });
      return;
    }

    const url = new URL("/health/dutyPharmacy", COLLECTAPI_BASE_URL);
    url.searchParams.set("il", city);
    url.searchParams.set("ilce", district);

    const upstreamResponse = await fetch(url.toString(), {
      headers: {
        "Content-Type": "application/json",
        Authorization: `apikey ${apiKey}`
      }
    });

    const text = await upstreamResponse.text();
    const data = text ? JSON.parse(text) : {};

    if (!upstreamResponse.ok) {
      res.status(upstreamResponse.status).json({
        success: false,
        error: "collectapi-request-failed",
        details: data
      });
      return;
    }

    res.status(200).json({
      success: true,
      result: Array.isArray(data.result) ? data.result : []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "duty-pharmacy-proxy-failed",
      message: error instanceof Error ? error.message : "unknown-error"
    });
  }
}
