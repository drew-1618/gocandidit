const { app, BrowserWindow } = require('electron')
const path = require('path')
// This line starts your Express server immediately when the app opens
require('./server.js') 

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        icon: path.join(__dirname, 'public/assets/img/icon.ico'),
        title: "GoCandidIt",
        // This ensures the app feels like a real Windows/Mac tool
        autoHideMenuBar: true, 
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    })

    // We point Electron to your local Express server
    win.loadURL('http://localhost:8000')
}

app.whenReady().then(createWindow)

// Standard Electron lifecycle management
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})