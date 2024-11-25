interface SanitizedCommand {
  sanitizedString: string;
}

export function sanitizeShellCommand(command: string): SanitizedCommand {
  const warnings: string[] = [];

  // Trim whitespace but preserve intentional newlines
  let sanitized = command.trim();

  // Escape special characters that could break command execution
  sanitized = sanitized
    // Escape backticks
    .replace(/`/g, "\\`")
    // Escape dollar signs (except in recognized variable patterns)
    .replace(/\$(?!{[^}]+}|\w+)/g, "\\$")
    // Escape double quotes within command properly
    .replace(/(?<!\\)"/g, '\\"');

  // Handle multi-line commands by preserving the integrity of the command
  if (command.includes("\n")) {
    sanitized = sanitized
      .split("\n")
      .map((line) => line.trim())
      .join(" \\\n");
    warnings.push("Multi-line command detected - added line continuations");
  }

  return {
    sanitizedString: sanitized,
  };
}
