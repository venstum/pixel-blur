/* eslint-disable @typescript-eslint/no-require-imports */
const { app, BrowserWindow } = require("electron");
const path = require("node:path");
const http = require("node:http");
const next = require("next");

const NEXT_PORT = process.env.NEXT_PORT || 3000;
const NEXT_HOST = "127.0.0.1";
const isDev = !app.isPackaged;
const appDir = isDev ? process.cwd() : path.join(process.resourcesPath, "app");
let mainWindow;
let isCreatingWindow = false;
let nextServerReady = false;

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
  if (nextServerReady) return;
  const appNext = next({ dev: false, dir: appDir });
  appNext
    .prepare()
    .then(() => {
      const handle = appNext.getRequestHandler();
      const server = http.createServer((req, res) => {
        handle(req, res, new URL(req.url || "", `http://${NEXT_HOST}:${NEXT_PORT}`));
      });
      server.listen(NEXT_PORT, NEXT_HOST, () => {
        nextServerReady = true;
      });
      server.on("error", (err) => {
        console.error("Next.js server error:", err);
      });
    })
    .catch((err) => {
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
  mainWindow.webContents.on("did-fail-load", async () => {
    setTimeout(async () => {
      await waitForNext();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL(targetUrl).catch(() => {});
      }
    }, 500);
  });
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

app.on("will-quit", () => {
  // No child process to clean up; server is in-process.
});
