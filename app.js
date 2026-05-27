// Plesk / Phusion Passenger entrypoint.
//
// Plesk's Node.js panel runs `node app.js` (the "Application Startup File"
// you set in the Plesk UI). Next.js doesn't ship a single startup file
// because `next start` is the production server. This file wraps Next.js's
// programmatic API and listens on the port Plesk hands us via process.env.PORT.
//
// Prerequisites on the server:
//   1. npm install  (Plesk: "NPM install" button)
//   2. npm run build  (Plesk: "Run script" → "build")
//   3. Set env vars in Plesk (Environment Variables section):
//        LEGACY_MYSQL_HOST, LEGACY_MYSQL_PORT, LEGACY_MYSQL_USER,
//        LEGACY_MYSQL_PASSWORD, LEGACY_MYSQL_DB, SESSION_SECRET,
//        NEXT_PUBLIC_MEDIA_BASE_URL
//   4. Restart App.

const fs = require("fs");
const { createServer } = require("http");
const { parse } = require("url");

// Windows / Plesk cwd-casing fix: see next.config.ts for the full story.
// Process inherits a lowercased cwd; force it to match the on-disk casing
// so Next.js doesn't load every module twice at runtime.
if (process.platform === "win32") {
  try {
    const real = fs.realpathSync.native(process.cwd());
    if (real !== process.cwd()) {
      process.chdir(real);
    }
  } catch {}
}

const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT, 10) || 3000;
const hostname = "0.0.0.0";

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    createServer(async (req, res) => {
      try {
        await handle(req, res, parse(req.url, true));
      } catch (err) {
        console.error("Error handling", req.url, err);
        res.statusCode = 500;
        res.end("internal server error");
      }
    })
      .once("error", (err) => {
        console.error(err);
        process.exit(1);
      })
      .listen(port, hostname, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
      });
  })
  .catch((err) => {
    console.error("Failed to start Next.js:", err);
    process.exit(1);
  });
