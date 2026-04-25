const { app, BrowserWindow } = require('electron')
const path = require('path')
const {shell} = require('electron')

// prevents multiple instance errors
const gotTheLock = app.releaseSingleInstanceLock()

if (!gotTheLock) {
    app.quit()
} else {
    // starts your Express server immediately when the app opens
    require('./server.js') 

    let win
    function createWindow() {
        win = new BrowserWindow({
            width: 1280,
            height: 800,
            show: false,  // start hidden
            backgroundColor: '#f8f9fa',  // match bg-body-tertiary from bootstrap
            icon: path.join(__dirname, 'public/assets/img/icon.ico'),
            title: "GoCandidIt",
            autoHideMenuBar: true, 
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            }
        })

        win.once('ready-to-show', () => {
            win.show()
        })

        // open links in default browser and prevent electron from trying
        win.webContents.setWindowOpenHandler(({url}) => {
            shell.openExternal(url)
            return {action: 'deny'}
        })

        // point Electron to local express server
        win.loadURL('http://localhost:8000')
    }

    app.whenReady().then(createWindow)

    // focus on existing window if user tries to open another
    app.on('second-instance', () => {
        if (win) {
            if (win.isMinimized()) {
                win.restore()
            }
            win.focus()
        }
    })

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') app.quit()
    })

}