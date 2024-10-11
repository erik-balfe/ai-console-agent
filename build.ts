import { spawnSync } from "child_process";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const PROJECT_ROOT = process.cwd();
const DIST_DIR = path.join(PROJECT_ROOT, "dist");
const MAIN_FILE = path.join(PROJECT_ROOT, "src", "index.ts");
const OUTPUT_FILE = path.join(DIST_DIR, "ai-console-agent");

const INTERNAL_OUTPUT_DIR = "/tmp/build";
const INTERNAL_OUTPUT_FILE = path.join(INTERNAL_OUTPUT_DIR, "ai-console-agent");

async function build() {
  checkBunVersion();

  console.log("Starting build process...");
  console.log("Build environment:");
  console.log(`Bun version: ${process.versions.bun}`);
  console.log(`Current working directory: ${process.cwd()}`);

  if (!fs.existsSync(INTERNAL_OUTPUT_DIR)) {
    fs.mkdirSync(INTERNAL_OUTPUT_DIR, { recursive: true });
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
      INTERNAL_OUTPUT_FILE,
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

  console.log(`Build completed successfully. Internal executable: ${INTERNAL_OUTPUT_FILE}`);

  // Ensure the dist directory exists
  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }

  // Copy the file to the mounted volume
  fs.copyFileSync(INTERNAL_OUTPUT_FILE, OUTPUT_FILE);
  console.log(`Copied executable to: ${OUTPUT_FILE}`);

  // Log file information
  const stats = fs.statSync(OUTPUT_FILE);
  console.log(`File size: ${stats.size} bytes`);
  const hash = crypto.createHash("sha256");
  const data = fs.readFileSync(OUTPUT_FILE);
  hash.update(data);
  console.log(`SHA256 hash: ${hash.digest("hex")}`);
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
