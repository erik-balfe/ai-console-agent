import { expect, test } from "bun:test";
import { runShellCommand } from "../src/utils/runShellCommand";

test("runShellCommand executes pwd command successfully", async () => {
  const { stdout, stderr } = await runShellCommand("pwd", { shell: "bash" });

  console.log("stdout:", stdout);
  console.log("stderr:", stderr);

  // Check if stdout is not empty
  expect(stdout.trim()).not.toBe("");

  // Get the current working directory
  const currentDir = process.cwd();
  console.log("Current directory:", currentDir);

  // Check if the result contains the current working directory
  expect(stdout.trim()).toBe(currentDir);

  // Check if stderr is empty
  expect(stderr).toBe("");
});
