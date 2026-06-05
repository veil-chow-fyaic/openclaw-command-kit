#!/usr/bin/env node
// Safe release script for openclaw-command-kit workspace.
// Usage:
//   node scripts/publish/release.mjs --dry-run   (default, safe preview)
//   node scripts/publish/release.mjs --real      (actually publish)

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");

const DRY_RUN = !process.argv.includes("--real");
const PACKAGES = ["packages/core", "packages/plugin", "packages/cli"];
const PACKAGE_NAMES = [
  "@fyaic/core",
  "@fyaic/openclaw-command-kit",
  "openclaw-slash-kit",
];

function run(cmd, opts = {}) {
  const { cwd = ROOT, capture = true } = opts;
  console.log(`  $ ${cmd}`);
  if (DRY_RUN && cmd.startsWith("npm publish")) {
    console.log(`  [DRY-RUN] would execute: ${cmd}`);
    return "";
  }
  if (capture) {
    return execSync(cmd, { cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  }
  execSync(cmd, { cwd, stdio: "inherit" });
  return "";
}

function step(title) {
  console.log(`\n▶ ${title}`);
}

function fail(msg) {
  console.error(`\n✖ ${msg}`);
  process.exit(1);
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf-8"));
}

function writeJson(p, data) {
  const full = path.join(ROOT, p);
  fs.writeFileSync(full, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

async function confirm(question) {
  const readline = (await import("node:readline")).createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    readline.question(`${question} [y/N] `, (answer) => {
      readline.close();
      resolve(answer.trim().toLowerCase() === "y");
    });
  });
}

async function main() {
  console.log("========================================");
  console.log("OpenClaw Command Kit Release Script");
  console.log(`Mode: ${DRY_RUN ? "DRY-RUN (safe preview)" : "REAL (will publish!)"}`);
  console.log("========================================");

  if (!DRY_RUN) {
    const ok = await confirm("⚠️  This is a REAL release. Continue?");
    if (!ok) fail("Aborted by user.");
  }

  // 1. Git checks
  step("Checking git status");
  const branch = run("git rev-parse --abbrev-ref HEAD");
  if (branch !== "main") fail(`Must be on main branch, currently on: ${branch}`);

  const status = run("git status --porcelain");
  if (status !== "") fail("Working tree is not clean. Commit or stash changes first.\n" + status);

  const ahead = run("git rev-list --count origin/main..main");
  if (ahead !== "0") {
    console.log(`  Warning: main is ${ahead} commit(s) ahead of origin/main.`);
    const ok = await confirm("Push main to origin first?");
    if (ok) run("git push origin main", { capture: false });
  }

  // 2. Npm login check
  step("Checking npm login");
  if (DRY_RUN) {
    console.log("  [DRY-RUN] skipping npm login check");
  } else {
    try {
      const whoami = run("npm whoami");
      console.log(`  Logged in as: ${whoami}`);
    } catch {
      fail("Not logged into npm. Run: npm login");
    }
  }

  // 3. Test + build
  step("Running tests");
  if (DRY_RUN) {
    console.log("  [DRY-RUN] skipping tests");
  } else {
    run("npm run test:run", { capture: false });
  }

  step("Running build");
  if (DRY_RUN) {
    console.log("  [DRY-RUN] skipping build");
  } else {
    run("npm run build", { capture: false });
  }

  // 4. Version bump
  step("Current versions");
  const currentVersions = {};
  for (let i = 0; i < PACKAGES.length; i++) {
    const pkg = readJson(`${PACKAGES[i]}/package.json`);
    currentVersions[PACKAGE_NAMES[i]] = pkg.version;
    console.log(`  ${PACKAGE_NAMES[i]}: ${pkg.version}`);
  }

  const readline = (await import("node:readline")).createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const bumpType = await new Promise((resolve) => {
    readline.question("Bump type [patch|minor|major]: ", (answer) => {
      readline.close();
      resolve(answer.trim().toLowerCase());
    });
  });
  if (!["patch", "minor", "major"].includes(bumpType)) {
    fail(`Invalid bump type: ${bumpType}`);
  }

  step(`Bumping ${bumpType} version`);
  const newVersions = {};
  for (let i = 0; i < PACKAGES.length; i++) {
    const pkgPath = `${PACKAGES[i]}/package.json`;
    const pkg = readJson(pkgPath);
    const [major, minor, patch] = pkg.version.split(".").map(Number);
    let next;
    if (bumpType === "major") next = `${major + 1}.0.0`;
    else if (bumpType === "minor") next = `${major}.${minor + 1}.0`;
    else next = `${major}.${minor}.${patch + 1}`;

    pkg.version = next;
    newVersions[PACKAGE_NAMES[i]] = next;

    if (DRY_RUN) {
      console.log(`  [DRY-RUN] would bump ${PACKAGE_NAMES[i]} to ${next}`);
    } else {
      writeJson(pkgPath, pkg);
      console.log(`  Bumped ${PACKAGE_NAMES[i]} to ${next}`);
    }
  }

  // 5. Commit version bump
  const tagName = `v${newVersions[PACKAGE_NAMES[1]]}`;
  if (!DRY_RUN) {
    step("Committing version bump");
    run("git add -A");
    run(`git commit -m "chore(release): bump version to ${tagName}"`);
  } else {
    console.log(`  [DRY-RUN] would commit and tag ${tagName}`);
  }

  // 6. Publish packages
  for (let i = 0; i < PACKAGES.length; i++) {
    step(`Publishing ${PACKAGE_NAMES[i]}@${newVersions[PACKAGE_NAMES[i]]}`);
    if (DRY_RUN) {
      console.log(`  [DRY-RUN] npm publish ${PACKAGES[i]} --access public`);
    } else {
      run(`npm publish --access public`, { cwd: path.join(ROOT, PACKAGES[i]), capture: false });
    }
  }

  // 7. Tag + push
  if (!DRY_RUN) {
    step(`Tagging ${tagName}`);
    run(`git tag -a ${tagName} -m "Release ${tagName}"`);
    run("git push origin main", { capture: false });
    run(`git push origin ${tagName}`, { capture: false });
    console.log(`\n✅ Released ${tagName}`);
    console.log(`   - ${PACKAGE_NAMES[0]}@${newVersions[PACKAGE_NAMES[0]]}`);
    console.log(`   - ${PACKAGE_NAMES[1]}@${newVersions[PACKAGE_NAMES[1]]}`);
    console.log(`\n   GitHub Actions will run: https://github.com/veil-chow-fyaic/openclaw-command-kit/actions`);
  } else {
    console.log(`\n🏁 DRY-RUN complete. To execute for real, run:`);
    console.log(`   node scripts/publish/release.mjs --real`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
