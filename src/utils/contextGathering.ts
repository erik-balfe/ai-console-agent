import { execureCommand } from "./safeExecution";

export async function gatherSystemContext() {
  const osInfo = await execureCommand("uname -a");
  const installedPrograms = await execureCommand("which git ffmpeg"); // Add more programs as needed
  return { osInfo, installedPrograms };
}
