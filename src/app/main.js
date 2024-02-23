const axios = require( 'axios' );
const firewall = require( './firewall' );
const ping = require('./ping');
const cmd = require( './cmd' );

// BrowserWindow instance.
let mainWindow = null;

// Array of servers retrieved from steam web api.
const servers = [];

const pingServers = () => {
  ping.build( servers );
  ping.run( mainWindow );
}

const apiResponse = ( response ) => {
  if ( !response.hasOwnProperty( 'data' ) ) {
    return;
  }

  const data = response.data;
  if ( !data.hasOwnProperty( 'pops' ) ) {
    return;
  }

  const pops = data.pops;

  // Iterate over all 'pops' objects and check if they have a 'relays' property.
  for ( let i = 0; i < Object.keys( pops ).length; ++i ) {
    const entry = Object.keys( pops )[ i ];
    const obj = pops[ entry ];
    if ( !obj.hasOwnProperty( 'relays' ) ) {
      continue;
    }

    const server = {
      location: obj.desc,
      geo: obj.geo,
      ips: []
    };

    for ( let j = 0; j < Object.keys( obj.relays ).length; ++j ) {
      const ipv4 = obj.relays[ j ].ipv4;
      server.ips.push( ipv4 );
    }

    servers.push( server );
  }

  // We now need to send the server data through to the renderer to create the DOM elements.
  mainWindow.webContents.send( 'servers', servers );

  // Now we want to asynchronously ping all the servers and send the response back to the renderer.
  pingServers();
}

const apiError = ( error ) => {
  console.log( error );
}

module.exports.init = ( window ) => {
  mainWindow = window;

  // Query the SDR config for CS2 (formerly CS:GO)
  axios.get( 'https://api.steampowered.com/ISteamApps/GetSDRConfig/v1/?appid=730' ).then( apiResponse ).catch( apiError );
}

const processFirewallExistsRequest = ( data ) => {
  if ( !( data.hasOwnProperty( 'ip' ) && data.hasOwnProperty( 'buttonId' ) && data.hasOwnProperty( 'iconId' ) ) ) {
    return;
  }

  firewall.existsAsync( data.ip ).then( ( exists ) => {
    if( !exists ) {
      return;
    }

    // Send back a message to update the button state.
    mainWindow.webContents.send( 'updateButtonState', {
      buttonId: data.buttonId,
      iconId: data.iconId,
      state: true
    } );
  } );
}

const processBlockOrUnblock = async ( data ) => {
  if ( !( data.hasOwnProperty( 'server' ) && data.hasOwnProperty( 'buttonId' ) && data.hasOwnProperty( 'iconId' ) ) ) {
    return;
  }

  const server = servers[ data.server ];

  let numBlockedIPs = 0;

  for ( let i = 0; i < server.ips.length; ++i ) {
    const blocked = await firewall.exists( server.ips[ i ] );

    let output = "";

    // If the IP was already blocked, remove it from the firewall.
    if ( blocked ) {
      output = cmd.stdout( await firewall.remove( server.ips[ i ] ) );
    }
    else {
      // Otherwise, add it to the firewall.
      ++numBlockedIPs;

      output = cmd.stdout( await firewall.add( server.ips[ i ] ) );
    }
  }

  // Update the button to show whether the servers are blocked or unblocked.
  const blockedAll = numBlockedIPs == server.ips.length;

  mainWindow.webContents.send( 'updateButtonState', {
    buttonId: data.buttonId,
    iconId: data.iconId,
    state: blockedAll
  } );
}

module.exports.processRequest = ( event, args ) => {
  // The format for 'args' is an object described as such:
  //    action:
  //      The action that is being requested.
  //
  //    data:
  //      The data being passed through.

  // Block any other request that doesn't match our requirements.
  if ( !( args.hasOwnProperty( 'action' ) && args.hasOwnProperty( 'data' ) ) ) {
    return;
  }

  const action = args.action;
  const data = args.data;

  switch ( action ) {
    case 'firewall.exists':
      processFirewallExistsRequest( data );
      break;

    case 'block_or_unblock':
      processBlockOrUnblock( data );
      break;
  }
}