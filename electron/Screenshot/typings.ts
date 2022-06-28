import { Rectangle } from 'electron'

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}


export interface Display extends Rectangle {
  id: number
}

export interface ScreenshotData {
  bounds: Bounds
  display: Display
}
