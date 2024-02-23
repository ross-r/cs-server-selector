const { contextBridge, ipcRenderer } = require( 'electron' );

contextBridge.exposeInMainWorld( 'versions', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron
} );

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld( 'api', {
  send: ( channel, data ) => {
    ipcRenderer.send( channel, data );
  },
  receive: ( channel, func ) => {
    ipcRenderer.on( channel, ( event, ...args ) => func( ...args ) );
  }
} );