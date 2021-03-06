const { join, resolve } = require('path')
const window = require('electron-window')
const { app, ipcMain: ipc } = require('electron')
app.commandLine.appendSwitch('--disable-http-cache')

const Options = require('./cli/options')
const options = new Options(process.argv)

global.mainProcessDebug = function ({ namespaces, args }) {
  const debug = require('debug')
  const log = debug(namespaces)
  log(...args)
}

let win

app.on('ready', () => {
  win = window.createWindow({
    height: 900,
    width: 1000,
    focusable: options.electronDebug,
    show: false,
    webPreferences: { webSecurity: false }
  })

  win.webContents.once('did-finish-load', () => {
    if (options.electronDebug) {
      win.show()
      win.webContents.openDevTools()
      win.webContents.on('devtools-opened', () => {
        // Debugger is not immediately ready
        setTimeout(() => {
          win.webContents.send('run-cucumber')
          // after the first run, reloading the electron window re-runs cucumber
          ipc.on('ready-to-run-cucumber', () => {
            win.webContents.send('run-cucumber')
          })
        }, 250)
      })
    } else {
      win.webContents.send('run-cucumber')
    }
  })

  if (!options.electronDebug && process.platform === 'darwin') {
    app.dock.hide()
  }

  const indexPath = resolve(join(__dirname, 'renderer/index.html'))
  // undocumented call in electron-window
  win._loadURLWithArgs(indexPath, {}, () => {})
})

// in debug mode electron window stays open after ctrc-c
// the code below force quits the window
app.on('before-quit', function () {
  app.exit()
})
