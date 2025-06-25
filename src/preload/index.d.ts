import { ElectronAPI } from '@electron-toolkit/preload'
import { pdfToRawTextDataRes } from 'src/main/lib/pdf'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      parsePdf: (arraybuffer: ArrayBuffer) => Promise<pdfToRawTextDataRes[]>
    }
  }
}
