/* eslint-disable @typescript-eslint/no-require-imports */
// Ensure the main process never inherits a "run as node" flag, which would
// make Electron behave like plain Node and break the app boot.
if (process.env.ELECTRON_RUN_AS_NODE) {
  delete process.env.ELECTRON_RUN_AS_NODE;
}

const { app, BrowserWindow } = require("electron");
const path = require("node:path");
const http = require("node:http");
const { spawn } = require("node:child_process");

const NEXT_PORT = process.env.NEXT_PORT || 3000;
const NEXT_HOST = process.env.NEXT_HOST || "localhost";
const isDev = !app.isPackaged;
// In production, __dirname sits inside app.asar/electron, so step up to the app root.
const appDir = isDev ? process.cwd() : path.join(process.resourcesPath, "app");
let mainWindow;
let isCreatingWindow = false;

const singleInstance = app.requestSingleInstanceLock();
if (!singleInstance) {
  app.quit();
  process.exit(0);
}

app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

function waitForNext() {
  const target = `http://${NEXT_HOST}:${NEXT_PORT}`;
  return new Promise((resolve) => {
    const check = () => {
      http
        .get(target, () => resolve(true))
        .on("error", () => setTimeout(check, 250));
    };
    check();
  });
}

function startNextProd() {
  const nextBin = require.resolve("next/dist/bin/next");
  const env = {
    ...process.env,
    PORT: NEXT_PORT,
    HOSTNAME: NEXT_HOST,
    // Force the Electron binary to act as Node when spawning the Next.js server,
    // avoiding extra Electron windows or recursive launches.
    ELECTRON_RUN_AS_NODE: "1",
  };
  const proc = spawn(
    process.execPath,
    [nextBin, "start", "-H", NEXT_HOST, "-p", NEXT_PORT],
    {
      cwd: appDir,
      env,
      stdio: "ignore",
      windowsHide: true,
    },
  );
  proc.on("error", (err) => {
    console.error("Failed to start Next.js server", err);
  });
}

async function createWindow() {
  if (isCreatingWindow) return;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.focus();
    return;
  }
  isCreatingWindow = true;
  const targetUrl = `http://${NEXT_HOST}:${NEXT_PORT}`;

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Pixel Blur",
    backgroundColor: "#050505",
    autoHideMenuBar: true,
    icon: path.join(appDir, "public", "icon.png"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  await waitForNext();
  await mainWindow.loadURL(targetUrl);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  isCreatingWindow = false;
}

app.whenReady().then(async () => {
  if (!isDev) {
    startNextProd();
  }
  await createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", () => {});
