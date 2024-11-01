import { spawnSync } from "child_process";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const PROJECT_ROOT = process.cwd();
const DIST_DIR = path.join(PROJECT_ROOT, "dist");
const MAIN_FILE = path.join(PROJECT_ROOT, "src", "index.ts");
const OUTPUT_FILE = path.join(DIST_DIR, "ai-console-agent");
const TEMP_OUTPUT_FILE = path.join(PROJECT_ROOT, "temp-ai-console-agent");

async function build() {
  console.log("Starting build process...");
  console.log("Build environment:");
  console.log(`Bun version: ${process.versions.bun}`);
  console.log(`Current working directory: ${process.cwd()}`);
  console.log(`PROJECT_ROOT: ${PROJECT_ROOT}`);
  console.log(`DIST_DIR: ${DIST_DIR}`);
  console.log(`MAIN_FILE: ${MAIN_FILE}`);
  console.log(`OUTPUT_FILE: ${OUTPUT_FILE}`);
  console.log(`TEMP_OUTPUT_FILE: ${TEMP_OUTPUT_FILE}`);

  checkBunVersion();
  ensureDirectoryExists(DIST_DIR);

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
      "--sourcemap",
      "--target",
      "bun",
      "--format",
      "esm",
      "--outfile",
      TEMP_OUTPUT_FILE,
    ],
    {
      stdio: "inherit",
      env: { ...process.env, NODE_ENV: "production" },
    },
  );

  if (result.status !== 0) {
    console.error("Compilation failed");
    process.exit(1);
  }

  // Move the compiled file to the dist directory
  try {
    fs.copyFileSync(TEMP_OUTPUT_FILE, OUTPUT_FILE);
    fs.unlinkSync(TEMP_OUTPUT_FILE); // Remove the temporary file
  } catch (error) {
    console.error("Error moving compiled file:", error);
    process.exit(1);
  }

  console.log(`Build completed successfully. Executable: ${OUTPUT_FILE}`);

  try {
    const stats = fs.statSync(OUTPUT_FILE);
    console.log(`File size: ${stats.size} bytes`);
    const hash = crypto.createHash("sha256");
    const data = fs.readFileSync(OUTPUT_FILE);
    hash.update(data);
    console.log(`SHA256 hash: ${hash.digest("hex")}`);
  } catch (error) {
    console.error("Error reading compiled file:", error);
  }
}

const getBunVersionFromPackageJson = () => {
  const packageJsonPath = path.join(PROJECT_ROOT, "package.json");

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

  if (!packageJson?.engines?.bun) {
    throw new Error("Bun version is not specified in package.json");
  }

  return packageJson.engines.bun;
};

function checkBunVersion() {
  const requiredVersion = getBunVersionFromPackageJson();
  const result = spawnSync("bun", ["--version"], { encoding: "utf8" });
  const version = result.stdout.trim();

  if (version !== requiredVersion) {
    console.warn(
      `Warning: This project is tested with Bun version ${requiredVersion}. You are using ${version}.`,
    );
  }
}

function ensureDirectoryExists(dir: string) {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    } catch (error) {
      console.error(`Error creating directory ${dir}:`, error);
      process.exit(1);
    }
  } else {
    console.log(`Directory already exists: ${dir}`);
  }
}

build().catch(console.error);
