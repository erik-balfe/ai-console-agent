import path from "path";

export function getUserHomeDir(): string {
  if (process.env.HOME) {
    return process.env.HOME;
  }

  // Fallback to constructing path from username
  const username = process.env.USER || process.env.USERNAME || process.env.LOGNAME;
  if (username) {
    const homePath = path.join("/home", username);
    return homePath;
  }

  throw new Error("Could not determine user home directory");
}
