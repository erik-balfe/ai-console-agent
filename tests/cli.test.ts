import { expect, test } from "bun:test";
import { getPipedInput, parseArguments } from "../src/cli/interface";

test("parseArguments handles direct input", () => {
  const args = ["node", "src/index.ts", "show", "all", "running", "docker", "containers"];
  const result = parseArguments(args);
  expect(result).toEqual({ command: "direct", input: "show all running docker containers" });
});

test("parseArguments handles piped input", () => {
  const args = ["node", "src/index.ts", "|", "show", "all", "running", "containers"];
  const result = parseArguments(args);
  expect(result).toEqual({ command: "pipe", input: "show all running containers" });
});
