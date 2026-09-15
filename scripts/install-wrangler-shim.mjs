import { access, chmod, copyFile, writeFile } from "node:fs/promises";
import path from "node:path";

const binDir = path.join(process.cwd(), "node_modules", "wrangler", "bin");
const original = path.join(binDir, "wrangler.js");
const backup = path.join(binDir, "wrangler.upstream.cjs");

try {
  await access(original);
} catch {
  console.warn("install-wrangler-shim: wrangler not installed, skipping");
  process.exit(0);
}

try {
  await access(backup);
} catch {
  await copyFile(original, backup);
}

const wrapper = `#!/usr/bin/env node
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const upstream = path.join(path.dirname(fileURLToPath(import.meta.url)), "wrangler.upstream.cjs");

function run(wranglerArgs) {
  const child = spawn(process.execPath, [upstream, ...wranglerArgs], {
    stdio: "inherit",
    env: process.env,
  });
  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 1);
  });
}

if (args[0] === "versions" && args[1] === "upload") {
  console.log(
    "quality-compass: mapping \`wrangler versions upload\` to \`wrangler deploy\` (Worker must be created with deploy first).",
  );
  run(["deploy", ...args.slice(2)]);
} else {
  run(args);
}
`;

await writeFile(original, wrapper);
await chmod(original, 0o755);
await chmod(backup, 0o755);
