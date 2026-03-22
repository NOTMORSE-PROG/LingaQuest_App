/**
 * android.mjs — Android build launcher for Windows
 *
 * Run via: npm run android  (from project root)
 */

import { execSync, spawnSync } from "child_process";
import { existsSync, readdirSync } from "fs";
import { join } from "path";

const PROJECT_ROOT = "C:\\CLIENT PROJECTS\\JERELINE";
const MOBILE_DIR = PROJECT_ROOT;

function log(msg) {
  console.log(`\x1b[36m[android]\x1b[0m ${msg}`);
}

function rmrf(dir) {
  try {
    execSync(`rmdir /s /q "${dir}"`, { shell: "cmd.exe", stdio: "pipe" });
  } catch {}
}

/**
 * CMake bakes absolute paths into .cxx staging dirs. When the project is
 * renamed/moved, these stale caches cause "build.ninja still dirty after 100
 * tries". We scan both the hoisted and .pnpm store node_modules trees.
 */
function cleanCxxCaches() {
  const roots = [
    join(PROJECT_ROOT, "node_modules"),
  ];

  let cleaned = 0;
  for (const nmRoot of roots) {
    if (!existsSync(nmRoot)) continue;

    // Hoisted packages: node_modules/<pkg>/android/.cxx
    for (const pkg of readdirSync(nmRoot)) {
      if (pkg === ".pnpm" || pkg.startsWith(".")) continue;
      const cxx = join(nmRoot, pkg, "android", ".cxx");
      if (existsSync(cxx)) { rmrf(cxx); cleaned++; }
      // Scoped packages (@scope/pkg)
      if (pkg.startsWith("@")) {
        for (const scoped of readdirSync(join(nmRoot, pkg))) {
          const cxx2 = join(nmRoot, pkg, scoped, "android", ".cxx");
          if (existsSync(cxx2)) { rmrf(cxx2); cleaned++; }
        }
      }
    }

    // pnpm store: node_modules/.pnpm/<pkg@ver>/node_modules/<pkg>/android/.cxx
    const pnpmStore = join(nmRoot, ".pnpm");
    if (existsSync(pnpmStore)) {
      for (const entry of readdirSync(pnpmStore)) {
        const innerNm = join(pnpmStore, entry, "node_modules");
        if (!existsSync(innerNm)) continue;
        for (const pkg of readdirSync(innerNm)) {
          if (pkg.startsWith(".")) continue;
          const cxx = join(innerNm, pkg, "android", ".cxx");
          if (existsSync(cxx)) { rmrf(cxx); cleaned++; }
        }
      }
    }
  }

  if (cleaned > 0) log(`Cleaned ${cleaned} stale CMake .cxx cache(s)`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

cleanCxxCaches();

log(`Running expo run:android from ${MOBILE_DIR}`);

const result = spawnSync("npx", ["expo", "run:android"], {
  cwd: MOBILE_DIR,
  shell: true,
  stdio: "inherit",
  env: {
    ...process.env,
    ANDROID_HOME:
      process.env.ANDROID_HOME || "C:\\Users\\ADMIN\\AppData\\Local\\Android\\Sdk",
  },
});

process.exit(result.status ?? 1);
