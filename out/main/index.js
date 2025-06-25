"use strict";
const PDFParser = require("pdf2json");
const electron = require("electron");
const path = require("path");
const utils = require("@electron-toolkit/utils");
async function pdfToRawTextData(arrayBuffer) {
  const pdfParser = new PDFParser();
  const data = await new Promise((resolve, reject) => {
    pdfParser.on(
      "pdfParser_dataReady",
      (pdfData) => resolve(pdfData)
    );
    pdfParser.on("pdfParser_dataError", (err) => reject(err));
    pdfParser.parseBuffer(Buffer.from(arrayBuffer));
  });
  const result = [];
  for (let pageIndex = 0; pageIndex < data.Pages.length; pageIndex++) {
    const page = data.Pages[pageIndex];
    const pageNum = pageIndex + 1;
    const pageHeight = page.Height;
    for (const textItem of page.Texts) {
      const rawText = textItem.R?.[0]?.T;
      if (!rawText) continue;
      const text = decodeURIComponent(rawText);
      const startX = textItem.x;
      const estimatedWidth = rawText.length * 0.1857;
      const estimatedHeight = Number(textItem.R[0].TS[1]) / 10;
      const endX = startX + estimatedWidth;
      const avgX = (startX + endX) / 2;
      const finalY = textItem.y + pageNum * pageHeight;
      result.push({
        page: pageNum,
        text,
        startX,
        endX,
        avgX,
        y: finalY,
        height: estimatedHeight,
        raw: textItem
      });
    }
  }
  const orderedRes = result.sort((a, b) => {
    if (a.y !== b.y) {
      return a.y - b.y;
    }
    return a.startX - b.startX;
  });
  return orderedRes;
}
const icon = path.join(__dirname, "../../resources/icon.png");
function createWindow() {
  const mainWindow = new electron.BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...process.platform === "linux" ? { icon } : {},
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
      // solo se necessario
    }
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (utils.is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
electron.app.whenReady().then(() => {
  utils.electronApp.setAppUserModelId("com.electron");
  electron.app.on("browser-window-created", (_, window) => {
    utils.optimizer.watchWindowShortcuts(window);
  });
  electron.ipcMain.on("ping", () => console.log("pong"));
  electron.ipcMain.handle("parse-pdf", async (_, arraybuffer) => {
    const res = await pdfToRawTextData(arraybuffer);
    return res;
  });
  createWindow();
  electron.app.on("activate", function() {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
