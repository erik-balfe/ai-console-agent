import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

const PROJECT_ROOT = process.cwd();
const DIST_DIR = path.join(PROJECT_ROOT, "dist");
const MAIN_FILE = path.join(PROJECT_ROOT, "src", "index.ts");
const OUTPUT_FILE = path.join(DIST_DIR, "ai-console-agent");

async function build() {
  checkBunVersion();

  console.log("Starting build process...");

  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR);
  }

  console.log("Installing dependencies...");
  const installResult = spawnSync("bun", ["install", "--frozen-lockfile"], { stdio: "inherit" });

  if (installResult.status !== 0) {
    console.error("Failed to install dependencies");
    process.exit(1);
  }

  console.log("Compiling project...");
  const result = spawnSync(
    "bun",
    [
      "build",
      MAIN_FILE,
      "--compile",
      "--minify",
      "--outfile",
      OUTPUT_FILE,
      "--target",
      "bun",
      "--format",
      "esm",
    ],
    { stdio: "inherit" },
  );

  if (result.status !== 0) {
    console.error("Compilation failed");
    process.exit(1);
  }

  console.log(`Build completed successfully. Executable: ${OUTPUT_FILE}`);
}

function checkBunVersion() {
  const result = spawnSync("bun", ["--version"], { encoding: "utf8" });
  const version = result.stdout.trim();
  const requiredVersion = "1.1.30";

  if (version !== requiredVersion) {
    console.warn(
      `Warning: This project is tested with Bun version ${requiredVersion}. You are using ${version}.`,
    );
  }
}

build().catch(console.error);
