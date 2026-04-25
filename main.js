const { app, BrowserWindow } = require('electron')
const path = require('path')
const {shell} = require('electron')

// This line starts your Express server immediately when the app opens
require('./server.js') 

function createWindow() {
    const win = new BrowserWindow({
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

    // We point Electron to your local Express server
    win.loadURL('http://localhost:8000')
}

app.whenReady().then(createWindow)

// Standard Electron lifecycle management
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})