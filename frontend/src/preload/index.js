import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Expose electron APIs to renderer via context bridge
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', {
      // File dialog for saving reports
      showSaveDialog: (options) => ipcRenderer.invoke('dialog:showSave', options),
      getAppPath: () => ipcRenderer.invoke('app:getPath')
    })
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
}
