import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backendDir = path.resolve(frontendDir, "..", "..", "backend");
const backendPort = Number(process.env.TASKIFY_BACKEND_PORT || 8000);
const backendUrl = `http://127.0.0.1:${backendPort}`;
const windows = process.platform === "win32";
const venvPython = path.join(
  backendDir,
  "venv",
  windows ? "Scripts" : "bin",
  windows ? "python.exe" : "python",
);
const python = existsSync(venvPython) ? venvPython : (process.env.PYTHON || "python");
const nextBin = path.join(frontendDir, "node_modules", "next", "dist", "bin", "next");

let backendProcess;
let frontendProcess;
let stopping = false;

function stopChild(child) {
  if (child && child.exitCode === null && !child.killed) {
    child.kill("SIGTERM");
  }
}

function stopAll(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  stopChild(frontendProcess);
  stopChild(backendProcess);
  process.exitCode = exitCode;
}

async function backendIsReady() {
  try {
    const response = await fetch(`${backendUrl}/`, { signal: AbortSignal.timeout(1000) });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForBackend(child) {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error("The backend stopped before it became ready.");
    }
    if (await backendIsReady()) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`The backend did not become ready at ${backendUrl} within 20 seconds.`);
}

process.on("SIGINT", () => stopAll(130));
process.on("SIGTERM", () => stopAll(143));

try {
  if (await backendIsReady()) {
    console.log(`Taskify backend is already running at ${backendUrl}`);
  } else {
    if (!existsSync(path.join(backendDir, "main.py"))) {
      throw new Error(`Could not find the backend project at ${backendDir}.`);
    }
    console.log(`Starting Taskify backend at ${backendUrl}...`);
    backendProcess = spawn(
      python,
      ["-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", String(backendPort)],
      { cwd: backendDir, stdio: "inherit" },
    );
    backendProcess.on("error", (error) => {
      console.error(`Could not start the backend: ${error.message}`);
      stopAll(1);
    });
    backendProcess.on("exit", (code, signal) => {
      if (!stopping) {
        console.error(
          `The backend exited${signal ? ` after ${signal}` : ` with code ${code ?? 1}`}.`,
        );
        stopAll(code ?? 1);
      }
    });
    await waitForBackend(backendProcess);
    console.log("Taskify backend is ready.");
  }

  console.log("Starting Next.js frontend...");
  frontendProcess = spawn(process.execPath, [nextBin, "dev", ...process.argv.slice(2)], {
    cwd: frontendDir,
    stdio: "inherit",
  });
  frontendProcess.on("error", (error) => {
    console.error(`Could not start the frontend: ${error.message}`);
    stopAll(1);
  });
  frontendProcess.on("exit", (code, signal) => {
    stopAll(signal ? 1 : (code ?? 0));
  });
} catch (error) {
  console.error(error.message);
  stopAll(1);
}
