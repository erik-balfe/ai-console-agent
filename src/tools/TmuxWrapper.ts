import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export class TmuxWrapper {
  static async run(command: string, interactions: string[]): Promise<string> {
    const sessionName = `ai-agent-${Date.now()}`;
    await this.createSession(sessionName, command);

    for (const interaction of interactions) {
      const [, send] = interaction.split("|");
      if (send) {
        await this.sendKeys(sessionName, send);
      } else {
        // If there's no '|', it means we just need to wait
        await new Promise((resolve) => setTimeout(resolve, 500)); // Wait for 500ms
      }
    }

    const output = await this.captureOutput(sessionName);
    await this.killSession(sessionName);

    return output;
  }

  private static async createSession(sessionName: string, command: string): Promise<void> {
    await execAsync(`tmux new-session -d -s ${sessionName} "${command}"`);
  }

  private static async sendKeys(sessionName: string, keys: string): Promise<void> {
    const escapedKeys = keys.replace(/"/g, '\\"');
    await execAsync(`tmux send-keys -t ${sessionName} "${escapedKeys}"`);
    await execAsync(`tmux send-keys -t ${sessionName} "Enter"`);
  }

  private static async captureOutput(sessionName: string): Promise<string> {
    return execAsync(`tmux capture-pane -p -t ${sessionName}`).then(({ stdout }) => stdout);
  }

  private static async killSession(sessionName: string): Promise<void> {
    await execAsync(`tmux kill-session -t ${sessionName}`);
  }
}
