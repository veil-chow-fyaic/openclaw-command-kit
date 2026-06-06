import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
const HOME = os.homedir();
const EXT_DIR = path.join(HOME, ".openclaw", "extensions", "openclaw-command-kit");
const CONFIG_PATH = path.join(HOME, ".openclaw", "openclaw.json");
function run(cmd, opts = {}) {
    const { cwd = process.cwd(), capture = true } = opts;
    console.log(`  $ ${cmd}`);
    if (capture) {
        return execSync(cmd, { cwd, encoding: "utf-8" }).trim();
    }
    execSync(cmd, { cwd, stdio: "inherit" });
    return "";
}
function hasCommand(cmd) {
    try {
        execSync(`${cmd} --version`, { stdio: "ignore" });
        return true;
    }
    catch {
        return false;
    }
}
function readConfig() {
    if (!fs.existsSync(CONFIG_PATH))
        return {};
    try {
        return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
    }
    catch {
        return {};
    }
}
function writeConfig(config) {
    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n", "utf-8");
}
export async function installCommand(_args) {
    console.log("OpenClaw Command Kit Installer\n");
    // 1. Check OpenClaw
    if (!hasCommand("openclaw")) {
        console.error("openclaw CLI not found. Please install OpenClaw first.");
        process.exit(1);
    }
    const version = run("openclaw --version");
    console.log(`  OpenClaw: ${version}\n`);
    // 2. Prefer openclaw plugins install if package is on npm
    const npmCheck = await isPackageOnNpm("@fyaic/openclaw-command-kit");
    if (npmCheck) {
        if (isPluginInstalled()) {
            console.log("Plugin already installed. Updating from npm...");
            run("openclaw plugins update @fyaic/openclaw-command-kit", { capture: false });
        }
        else {
            console.log("Installing from npm...");
            run("openclaw plugins install @fyaic/openclaw-command-kit", { capture: false });
        }
    }
    else {
        console.log("npm package not found; falling back to source install.");
        console.log("Please run this from the openclaw-command-kit repo root:");
        console.log("  git clone <repo-url> openclaw-command-kit");
        console.log("  cd openclaw-command-kit");
        console.log("  npm install && npm run build");
        console.log(`  ln -s $(pwd)/packages/plugin ${EXT_DIR}`);
        if (!fs.existsSync(path.join(process.cwd(), "packages", "plugin", "package.json"))) {
            console.error("\nNot running from the repo root. Aborting.");
            process.exit(1);
        }
        const repoPluginPath = path.resolve(process.cwd(), "packages", "plugin");
        if (fs.existsSync(EXT_DIR)) {
            console.log(`  Extension path already exists: ${EXT_DIR}`);
        }
        else {
            fs.symlinkSync(repoPluginPath, EXT_DIR, "dir");
            console.log(`  Linked ${repoPluginPath} -> ${EXT_DIR}`);
        }
        // Update openclaw.json
        const config = readConfig();
        config.plugins = config.plugins ?? {};
        config.plugins.allow = Array.from(new Set([...(config.plugins.allow ?? []), "openclaw-command-kit"]));
        config.plugins.load = config.plugins.load ?? {};
        config.plugins.load.paths = Array.from(new Set([...(config.plugins.load.paths ?? []), EXT_DIR]));
        config.plugins.entries = config.plugins.entries ?? {};
        config.plugins.entries["openclaw-command-kit"] = { enabled: true };
        writeConfig(config);
        console.log(`  Updated ${CONFIG_PATH}`);
    }
    // 3. Restart gateway
    console.log("\nRestarting OpenClaw gateway...");
    const platform = process.platform;
    try {
        if (platform === "darwin") {
            run(`launchctl kickstart -k gui/$(id -u)/ai.openclaw.gateway`, { capture: false });
            console.log("  Gateway restarted.");
        }
        else if (platform === "win32") {
            run(`powershell -Command "Get-Process *openclaw* | Stop-Process -Force; Start-Sleep -s 2; Start-Process openclaw"`, { capture: false });
            console.log("  Gateway restarted.");
        }
        else {
            console.log("  Please restart OpenClaw manually to apply changes.");
        }
    }
    catch {
        console.log("  Could not restart gateway automatically. Please restart OpenClaw manually.");
    }
    console.log("\n✅ Installation complete. Try sending /sessions in any OpenClaw channel.");
}
async function isPackageOnNpm(name) {
    try {
        execSync(`npm view ${name} version`, { stdio: "ignore" });
        return true;
    }
    catch {
        return false;
    }
}
function isPluginInstalled() {
    try {
        const out = execSync("openclaw plugins list", { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] });
        return out.includes("openclaw-command-kit");
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=install.js.map