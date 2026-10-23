#!/usr/bin/env node
/**
 * Deploys the built site (dist/) to the EasyPanel app service as file mounts.
 *
 * Required env vars:
 *   EASYPANEL_URL    e.g. http://192.227.153.54:3000
 *   EASYPANEL_TOKEN  API token from EasyPanel -> Settings -> API
 *
 * Optional env vars:
 *   EASYPANEL_PROJECT  default: automatiza
 *   EASYPANEL_SERVICE  default: guia-html
 *
 * Usage: npm run deploy
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const DIST = path.resolve("dist");
const WEB_ROOT = "/usr/share/nginx/html";
const { EASYPANEL_URL, EASYPANEL_TOKEN } = process.env;
const projectName = process.env.EASYPANEL_PROJECT ?? "automatiza";
const serviceName = process.env.EASYPANEL_SERVICE ?? "guia-html";

if (!EASYPANEL_URL || !EASYPANEL_TOKEN) {
  console.error("Missing EASYPANEL_URL or EASYPANEL_TOKEN.");
  process.exit(1);
}

const api = `${EASYPANEL_URL.replace(/\/$/, "")}/api`;
const headers = { Authorization: `Bearer ${EASYPANEL_TOKEN}` };

async function call(method, endpoint, body) {
  const res = await fetch(`${api}${endpoint}`, {
    method,
    headers: { ...headers, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${endpoint} -> ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

function listFiles(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(full, base) : [path.relative(base, full)];
  });
}

function readTextFile(file) {
  const buf = fs.readFileSync(file);
  if (buf.includes(0)) throw new Error(`Binary file not supported by file mounts: ${file}`);
  return buf.toString("utf8");
}

const build = process.argv.includes("--skip-build") ? "skipped" : "running";
if (build === "running") execSync("npm run build", { stdio: "inherit" });

if (!fs.existsSync(DIST)) throw new Error("dist/ not found. Run `npm run build` first.");

const files = listFiles(DIST);
if (files.length === 0) throw new Error("dist/ is empty.");

const mounts = files.map((rel) => ({
  type: "file",
  mountPath: `${WEB_ROOT}/${rel.split(path.sep).join("/")}`,
  content: readTextFile(path.join(DIST, rel)),
}));

// Replace the mounts that live under the web root; leave any others untouched.
const existing = (await call("GET", `/listMounts?projectName=${projectName}&serviceName=${serviceName}`)) ?? [];
const stale = existing
  .map((mount, index) => ({ index, mountPath: mount.mountPath ?? "" }))
  .filter(({ mountPath }) => mountPath.startsWith(WEB_ROOT))
  .map(({ index }) => index)
  .sort((a, b) => b - a);

for (const index of stale) {
  await call("POST", "/deleteMount", { projectName, serviceName, index });
}

for (const values of mounts) {
  await call("POST", "/createMount", { projectName, serviceName, values });
}

await call("POST", "/deployAppService", { projectName, serviceName });
console.log(`Deployed ${files.length} files to ${projectName}/${serviceName}.`);
