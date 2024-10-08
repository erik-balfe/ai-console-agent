import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export class TmuxWrapper {
  private static currentSession: string | null = null;

  static async initializeSession(): Promise<void> {
    if (!this.currentSession) {
      this.currentSession = `ai-agent-${Date.now()}`;
      await this.createSession(this.currentSession);
    }
  }

  static async run(command: string, interactions: string[]): Promise<string> {
    if (!this.currentSession) {
      throw new Error("Tmux session not initialized");
    }

    await this.sendCommand(this.currentSession, command);

    for (const interaction of interactions) {
      const [expect, send] = interaction.split("|");
      if (send) {
        await this.waitForOutput(this.currentSession, expect);
        await this.sendKeys(this.currentSession, send);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    return this.captureOutput(this.currentSession);
  }

  static async cleanup(): Promise<void> {
    if (this.currentSession) {
      await this.killSession(this.currentSession);
      this.currentSession = null;
    }
  }

  private static async createSession(sessionName: string): Promise<void> {
    await execAsync(`tmux new-session -d -s ${sessionName}`);
  }

  private static async sendCommand(sessionName: string, command: string): Promise<void> {
    await this.sendKeys(sessionName, command);
  }

  private static async sendKeys(sessionName: string, keys: string): Promise<void> {
    const escapedKeys = keys.replace(/"/g, '\\"');
    await execAsync(`tmux send-keys -t ${sessionName} "${escapedKeys}"`);
    await execAsync(`tmux send-keys -t ${sessionName} "Enter"`);
  }

  private static async waitForOutput(sessionName: string, expect: string): Promise<void> {
    let retries = 10;
    while (retries > 0) {
      const output = await this.captureOutput(sessionName);
      if (output.includes(expect)) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      retries--;
    }
    throw new Error(`Timed out waiting for output: ${expect}`);
  }

  private static async captureOutput(sessionName: string): Promise<string> {
    return execAsync(`tmux capture-pane -p -t ${sessionName}`).then(({ stdout }) => stdout);
  }

  private static async killSession(sessionName: string): Promise<void> {
    await execAsync(`tmux kill-session -t ${sessionName}`);
  }
}
