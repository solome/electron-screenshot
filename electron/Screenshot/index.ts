import * as fs from 'fs'

import {
  BrowserView,
  BrowserWindow,
  clipboard,
  desktopCapturer,
  dialog,
  ipcMain,
  IpcMainEvent,
  nativeImage,
} from 'electron'

import debug, { Debugger } from 'debug'

import TypedEventEmitter from './TypedEventEmitter'
import { ScreenshotData } from './typings'
import padStart from './padStart'


export type ScreenshotEventMap = {
  'ready': (event: IpcMainEvent, buffer: Buffer, data: ScreenshotData) => void,
  'cancel': (event: IpcMainEvent) => void,
  'save': (event: IpcMainEvent, buffer: Buffer, data: ScreenshotData) => void,
}

export interface ScreenshotConfig {
  singleWindow?: boolean
}

export default class Screenshot extends TypedEventEmitter<ScreenshotEventMap> {
  config: ScreenshotConfig = {}
  #logger =  debug('electron-screenshot')

  #ready = new Promise<void>(resolve => {
    ipcMain.once('SCREENSHOT:ready', () => {
      this.#logger('SCREENSHOT:ready')
      resolve()
    })
  })

  browserWindow: BrowserWindow | null = null
  browserView = new BrowserView({
    webPreferences: {
      preload: require.resolve('./preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      // nativeWindowOpen: false
    }
  })

  constructor(config: ScreenshotConfig) {
    super()
    this.config = Object.assign(this.config, config)

    this.#listenIpc()
    this.browserView.webContents.loadURL(`file://${require.resolve('react-screenshots/electron/electron.html')}`)
  }

  #listenIpc() {

    ipcMain.on('SCREENSHOT:ready', (event, buffer: Buffer, data: ScreenshotData) => {
      this.#logger('SCREENSHOT:ready', buffer, data)

      // const event = new CustomEvent()
      this.emit('ready', event, buffer, data)
      if (event.defaultPrevented) {
        return
      }
      clipboard.writeImage(nativeImage.createFromBuffer(buffer))
      // this.endCapture()
    })

    ipcMain.on('SCREENSHOT:cancel', (event) => {
      this.#logger('SCREENSHOT:cancel')

      this.emit('cancel', event)
      if (event.defaultPrevented) {
        return
      }
      // this.endCapture()
    })

    ipcMain.on('SCREENSHOT:save', async (event, buffer: Buffer, data: ScreenshotData) => {
      this.#logger('SCREENSHOTS:save', buffer, data)

      this.emit('save', event, buffer, data)
      if (event.defaultPrevented || !this.browserWindow) {
        return
      }

      const time = new Date()
      const year = time.getFullYear()
      const month = padStart(time.getMonth() + 1, 2, '0')
      const date = padStart(time.getDate(), 2, '0')
      const hours = padStart(time.getHours(), 2, '0')
      const minutes = padStart(time.getMinutes(), 2, '0')
      const seconds = padStart(time.getSeconds(), 2, '0')
      const milliseconds = padStart(time.getMilliseconds(), 3, '0')

      this.browserWindow.setAlwaysOnTop(false)

      const { canceled, filePath } = await dialog.showSaveDialog(this.browserWindow, {
        title: '保存图片',
        defaultPath: `${year}${month}${date}${hours}${minutes}${seconds}${milliseconds}.png`
      })

      if (!this.browserWindow) {
        return
      }
      this.browserWindow.setAlwaysOnTop(true)
      if (canceled || !filePath) {
        return
      }

      await new Promise((resolve, reject) => {
        fs.writeFile(filePath, buffer, (error) => {
          if (error) {
            this.#logger(error)
            return reject(error)
          }
          resolve(true)
        })
      })


      // this.endCapture()
    })

  }
}
