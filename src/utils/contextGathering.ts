import { safeExecute } from "./safeExecution";

export async function gatherSystemContext() {
  const osInfo = await safeExecute("uname -a");
  const installedPrograms = await safeExecute("which git ffmpeg"); // Add more programs as needed
  return { osInfo, installedPrograms };
}
