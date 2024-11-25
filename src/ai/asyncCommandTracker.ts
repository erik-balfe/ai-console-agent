import { EventEmitter } from "events";
import fs from "fs";

export interface AsyncCommand {
  id: string;
  command: string;
  startTime: number;
  status: "running" | "completed" | "failed";
  outputFiles: {
    stdout: string;
    stderr: string;
    combined: string;
  };
  pid?: number;
  error?: {
    code: number;
    message: string;
  };
}

export class AsyncCommandTracker extends EventEmitter {
  private static instance: AsyncCommandTracker;
  private commands: Map<string, AsyncCommand> = new Map();

  private constructor() {
    super();
  }

  static getInstance(): AsyncCommandTracker {
    if (!AsyncCommandTracker.instance) {
      AsyncCommandTracker.instance = new AsyncCommandTracker();
    }
    return AsyncCommandTracker.instance;
  }

  addCommand(command: AsyncCommand): void {
    this.commands.set(command.id, command);
  }

  updateCommandStatus(
    id: string,
    status: AsyncCommand["status"],
    error?: { code: number; message: string },
  ): void {
    const command = this.commands.get(id);
    if (command) {
      command.status = status;
      if (error) command.error = error;
      this.commands.set(id, command);
      this.emit("commandStatusChanged", command);
    }
  }

  getActiveCommands(): AsyncCommand[] {
    return Array.from(this.commands.values()).filter((cmd) => cmd.status === "running");
  }

  getCommandStatus(id: string): AsyncCommand | undefined {
    return this.commands.get(id);
  }

  // Check command status by reading output files
  async checkCommandStatus(id: string): Promise<void> {
    const command = this.commands.get(id);
    if (!command) return;

    try {
      // Check if process is still running
      if (command.pid && !process.kill(command.pid, 0)) {
        // Process no longer exists
        const stderr = fs.readFileSync(command.outputFiles.stderr, "utf8");
        if (stderr.length > 0) {
          this.updateCommandStatus(id, "failed", {
            code: 1,
            message: stderr,
          });
        } else {
          this.updateCommandStatus(id, "completed");
        }
      }
    } catch (error) {
      // Process no longer exists
      const stderr = fs.readFileSync(command.outputFiles.stderr, "utf8");
      if (stderr.length > 0) {
        this.updateCommandStatus(id, "failed", {
          code: 1,
          message: stderr,
        });
      } else {
        this.updateCommandStatus(id, "completed");
      }
    }
  }
}
