import { spawn } from "child_process";

export class ExpectWrapper {
  static async run(command: string, interactions: string[]): Promise<string> {
    const expectScript = this.generateExpectScript(command, interactions);
    return new Promise((resolve, reject) => {
      const child = spawn("expect", ["-c", expectScript]);
      let output = "";

      child.stdout.on("data", (data) => {
        output += data.toString();
      });

      child.stderr.on("data", (data) => {
        console.error(`expect stderr: ${data}`);
      });

      child.on("close", (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`expect process exited with code ${code}`));
        }
      });
    });
  }

  private static generateExpectScript(command: string, interactions: string[]): string {
    let script = `
      set timeout -1
      spawn ${command}
    `;

    for (const interaction of interactions) {
      const [expect, send] = interaction.split("|");
      script += `
        expect "${expect}"
        send "${send}\\r"
      `;
    }

    script += `
      expect eof
    `;

    return script;
  }
}
