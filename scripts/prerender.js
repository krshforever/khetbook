import { spawn } from "child_process";
import http from "http";
import fs from "fs";
import path from "path";

const PORT = 4173;
const HOST = "127.0.0.1";
const URL = `http://${HOST}:${PORT}/`;
const OUTPUT_FILE = path.resolve("dist/client/index.html");

function fetchWithRetry(url, retriesLeft = 10) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to fetch: Status code ${res.statusCode}`));
        return;
      }
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => resolve(data));
    });
    
    req.on("error", (err) => {
      if (retriesLeft > 0 && err.code === "ECONNREFUSED") {
        console.log(`Connection refused. Retrying in 1s... (${retriesLeft} retries left)`);
        setTimeout(() => {
          fetchWithRetry(url, retriesLeft - 1).then(resolve, reject);
        }, 1000);
      } else {
        reject(err);
      }
    });
  });
}

async function main() {
  console.log(`Starting preview server on ${HOST}:${PORT}...`);
  const child = spawn("node", [
    "node_modules/vite/bin/vite.js",
    "preview",
    "--host", HOST,
    "--port", String(PORT)
  ], {
    stdio: "pipe",
    shell: true
  });

  child.stdout.on("data", (data) => {
    console.log(`[Preview Server]: ${data}`);
  });
  child.stderr.on("data", (data) => {
    console.error(`[Preview Server Error]: ${data}`);
  });

  console.log(`Fetching root page from ${URL}...`);
  try {
    const htmlData = await fetchWithRetry(URL);
    
    // Ensure directory exists
    fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
    fs.writeFileSync(OUTPUT_FILE, htmlData);
    console.log(`Successfully saved HTML to ${OUTPUT_FILE}`);
    child.kill("SIGKILL");
    
    // Cleanup files: move dist/client/* to dist/
    console.log("Moving client assets to dist root...");
    const clientDir = path.resolve("dist/client");
    const distDir = path.resolve("dist");
    
    const files = fs.readdirSync(clientDir);
    for (const file of files) {
      const src = path.join(clientDir, file);
      const dest = path.join(distDir, file);
      if (fs.existsSync(dest)) {
        fs.rmSync(dest, { recursive: true, force: true });
      }
      fs.renameSync(src, dest);
    }
    
    // Remove client and server directories to clean up
    fs.rmSync(clientDir, { recursive: true, force: true });
    fs.rmSync(path.resolve("dist/server"), { recursive: true, force: true });
    console.log("Prerender complete!");
    process.exit(0);
  } catch (err) {
    console.error("Fatal error during fetch:", err.message);
    child.kill("SIGKILL");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
