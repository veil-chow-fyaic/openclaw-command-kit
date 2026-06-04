import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../../../..");
export async function publishCommand(args) {
    const bump = args[0];
    if (bump && !["patch", "minor", "major"].includes(bump)) {
        console.error(`Invalid bump type: ${bump}. Use patch, minor, or major.`);
        process.exit(1);
    }
    const releaseScript = path.join(ROOT, "scripts", "publish", "release.mjs");
    const cmd = `node ${releaseScript} --real`;
    console.log("Running release script...");
    try {
        execSync(cmd, { cwd: ROOT, stdio: "inherit" });
    }
    catch {
        process.exit(1);
    }
}
//# sourceMappingURL=publish.js.map