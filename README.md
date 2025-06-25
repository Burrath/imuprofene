const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')
