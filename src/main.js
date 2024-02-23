const { app, BrowserWindow, ipcMain } = require( 'electron' );
const path = require( 'path' );

const { init, processRequest } = require( './app/main' );

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if ( require( 'electron-squirrel-startup' ) ) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow( {
    width: 500,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join( __dirname, "preload.js" ),
      devTools: false,
    }
  } );

  mainWindow.setContentSize( 500, 600 );
  mainWindow.setResizable( false );
  mainWindow.center();

  mainWindow.setMenuBarVisibility( false );

  // and load the index.html of the app.
  mainWindow.loadFile( path.join( __dirname, 'index.html' ) );

  // Open the DevTools.
  //mainWindow.webContents.openDevTools();

  // ...
  init( mainWindow );
};

app.on( 'ready', createWindow )

app.on( 'window-all-closed', () => {
  if ( process.platform !== 'darwin' ) {
    app.quit();
  }
} );

app.on( 'activate', () => {
  if ( BrowserWindow.getAllWindows().length === 0 ) {
    createWindow();
  }
} );

ipcMain.on( 'request', ( event, args ) => {
  processRequest( event, args );
} );