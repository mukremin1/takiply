import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function dutyPharmacyProxyPlugin(env) {
  return {
    name: "duty-pharmacy-proxy",
    configureServer(server) {
      server.middlewares.use("/api/duty-pharmacies", async (req, res) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");

        if (req.method === "OPTIONS") {
          res.statusCode = 204;
          res.end();
          return;
        }

        if (req.method !== "POST") {
          res.statusCode = 405;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: false, error: "method-not-allowed" }));
          return;
        }

        if (!env.COLLECTAPI_KEY) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: false, error: "missing-collectapi-key" }));
          return;
        }

        try {
          const chunks = [];

          for await (const chunk of req) {
            chunks.push(chunk);
          }

          const rawBody = Buffer.concat(chunks).toString("utf8");
          const body = rawBody ? JSON.parse(rawBody) : {};
          const city = String(body.city ?? "").trim();
          const district = String(body.district ?? "").trim();

          if (!city || !district) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ success: false, error: "missing-city-or-district" }));
            return;
          }

          const url = new URL("https://api.collectapi.com/health/dutyPharmacy");
          url.searchParams.set("il", city);
          url.searchParams.set("ilce", district);

          const upstreamResponse = await fetch(url, {
            headers: {
              "Content-Type": "application/json",
              Authorization: `apikey ${env.COLLECTAPI_KEY}`
            }
          });

          const text = await upstreamResponse.text();
          res.statusCode = upstreamResponse.status;
          res.setHeader("Content-Type", "application/json");
          res.end(text || JSON.stringify({ success: upstreamResponse.ok, result: [] }));
        } catch (error) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              success: false,
              error: "duty-pharmacy-proxy-failed",
              message: error instanceof Error ? error.message : "unknown-error"
            })
          );
        }
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react(), dutyPharmacyProxyPlugin(env)],
    define: {
      __COLLECTAPI_KEY__: JSON.stringify(env.COLLECTAPI_KEY || "")
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) {
              return undefined;
            }

            if (id.includes("react") || id.includes("scheduler")) {
              return "react-vendor";
            }

            if (id.includes("leaflet") || id.includes("@react-google-maps") || id.includes("@googlemaps")) {
              return "maps-vendor";
            }

            if (id.includes("firebase")) {
              return "firebase-vendor";
            }

            return "vendor";
          }
        }
      }
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src")
      }
    }
  };
});
