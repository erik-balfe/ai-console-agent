import path from "path";

export function getUserHomeDir(): string {
  // First try standard environment variables
  if (process.env.HOME) {
    return process.env.HOME;
  }

  // Fallback to constructing path from username
  const username = process.env.USER || process.env.USERNAME;
  if (username) {
    return path.join("/home", username);
  }
  throw new Error("Could not determine user home directory");
}
