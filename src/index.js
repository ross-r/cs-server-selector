const process = require( 'node:process' );
const { spawnSync } = require( 'node:child_process' );
const fs = require( 'node:fs' );
const axios = require( 'axios' );

const cmd = require( './app/cmd' );
const firewall = require( './app/firewall' );
const ping = require( './app/ping' );

// Parse servers into a nicer format to use.
//   const server = {
//     location: '',
//     geo: [],
//     ips: []
//  };
const servers = [];

const getServers = () => servers;

const toBase64 = ( str ) => {
  return Buffer.from( str ).toString( 'base64' );
}

const getRelays = async ( response ) => {
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
}

const filterServers = ( filter ) => {
  for ( let i = 0; i < servers.length; ++i ) {
    const server = servers[ i ];
    const id = toBase64( server.location.toLowerCase() );

    if ( filter.length == 0 ) {
      document.getElementById( id ).classList.remove( 'd-none' );
      continue;
    }

    const matches = server.location.toLowerCase().includes( filter.toLowerCase() );
    if ( matches ) {
      // Remove the 'd-none' class IF it was present from a previous filtering.
      document.getElementById( id ).classList.remove( 'd-none' );
      continue;
    }

    // This element doesn't match so hide it by adding 'd-none'.
    document.getElementById( id ).classList.add( 'd-none' );
  }
}

const updateButtonState = ( button, blocked ) => {
  if ( blocked ) {
    button.classList.remove( 'btn-success' );
    button.classList.add( 'btn-danger' );
    button.innerHTML = "Unblock";
    return;
  }

  button.classList.add( 'btn-success' );
  button.classList.remove( 'btn-danger' );
  button.innerHTML = "Block";
}

// This function is called when the UI has created the block/unblock button,
// the purpose of this function is to query all IPs for the given server and update the button
// to reflect if it's been blocked already, perhaps in future we can cache this result.
const checkIfBlockedAndUpdate = ( index, button ) => {
  const server = servers[ index ];

  // If any single IP address has been blocked, that's enough to change the button.
  for ( let i = 0; i < server.ips.length; ++i ) {
    firewall.existsAsync( server.ips[ i ] ).then( ( exists ) => {
      if ( !exists ) {
        return;
      }

      updateButtonState( button, true );
      console.log( server.ips[ i ], 'is blocked' );
    } );
  }
}

// The callback to be used for each of the buttons created to block or unblock a server.
const buttonBlockOrUnblock = async ( index, button ) => {
  const server = servers[ index ];

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

    //console.log( output );
  }

  // Update the button to show whether the servers are blocked or unblocked.
  const blockedAll = numBlockedIPs == server.ips.length;
  updateButtonState( button, blockedAll );
}

const createServers = async ( parent ) => {
  // Remove all children elements.
  parent.replaceChildren();

  // Create main accordion, all entries will be appended to this.
  const accordion = document.createElement( 'div' );
  accordion.classList.add( 'accordion', 'accordion-flush' );

  for ( let i = 0; i < servers.length; ++i ) {
    const server = servers[ i ];

    // <div class="accordion-item">
    const accordion_item = document.createElement( 'div' );
    accordion_item.setAttribute( 'id', toBase64( server.location.toLowerCase() ) );
    accordion_item.classList.add( 'accordion-item' );

    // <h2 class="accordion-header">
    const accordion_header = document.createElement( 'h2' );
    accordion_header.classList.add( 'accordion-header' );

    const accordionId = `accordion_collapse_${ i }`;

    // <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="...">
    const accordion_button = document.createElement( 'button' );
    accordion_button.classList.add( 'accordion-button', 'collapsed' );
    accordion_button.type = 'button';
    accordion_button.setAttribute( 'data-bs-toggle', 'collapse' );
    accordion_button.setAttribute( 'data-bs-target', `#${ accordionId }` );
    accordion_button.innerHTML = server.location;
    accordion_header.appendChild( accordion_button ); // accordion-button -> accordion-header
    accordion_item.appendChild( accordion_header ); // accordion-header -> accordion-item

    // <div id="..." class="accordion-collapse collapse">
    const accordion_collapse = document.createElement( 'div' );
    accordion_collapse.classList.add( 'accordion-collapse', 'collapse' );
    accordion_collapse.setAttribute( 'id', `${ accordionId }` );

    // <div class="accordion-body">
    const accordion_body = document.createElement( 'div' );
    accordion_body.classList.add( 'accordion-body' );

    const ul = document.createElement( 'ul' );
    ul.classList.add( 'list-group', 'mb-3' );

    for ( let j = 0; j < server.ips.length; ++j ) {
      const ip = server.ips[ j ];

      const li = document.createElement( 'li' );
      li.classList.add( 'list-group-item', 'd-flex' );

      const ipDiv = document.createElement( 'div' );
      ipDiv.classList.add( 'flex-grow-1' );
      ipDiv.innerHTML = ip;
      li.appendChild( ipDiv );

      const pingDiv = document.createElement( 'div' );
      pingDiv.setAttribute( 'id', `ping_${ ip }` );
      pingDiv.classList.add( 'd-inline-flex', 'align-items-center' );

      const spinnerDiv = document.createElement( 'div' ); // <div class="spinner-grow spinner-grow-sm"></div>
      spinnerDiv.setAttribute( 'id', `ping_${ ip }_spinner` );
      spinnerDiv.classList.add( 'spinner-border', 'spinner-border-sm' );

      const latencyDiv = document.createElement( 'div' );
      latencyDiv.setAttribute( 'id', `ping_${ ip }_latency` );
      latencyDiv.classList.add( 'invisible' );
      latencyDiv.innerHTML = '0ms';

      pingDiv.appendChild( latencyDiv );
      pingDiv.appendChild( spinnerDiv );
      li.appendChild( pingDiv );

      ul.appendChild( li );
    }

    accordion_body.appendChild( ul );

    // Create the block/unblock server button.
    const button = document.createElement( 'div' ); // <div class="btn btn-success w-100">Block</div>
    button.setAttribute( 'onclick', `buttonBlockOrUnblock( ${ i }, this )` ); // callback
    button.classList.add( 'btn' );
    button.classList.add( 'btn-success' );
    button.classList.add( 'w-100' );
    button.innerHTML = "Block";

    // We need to check if the IPs have already been added to the firewall and updated the UI to reflect that.
    checkIfBlockedAndUpdate( i, button );

    accordion_body.appendChild( button );
    accordion_collapse.appendChild( accordion_body );
    accordion_item.appendChild( accordion_collapse );

    accordion.appendChild( accordion_item );
  }

  parent.appendChild( accordion );
}

module.exports.start = async () => {
  // if ( await firewall.exists( '103.10.124.121' ) ) {
  //   console.log( 'This server is already blocked' );

  //   let result = await firewall.remove( '103.10.124.121' );
  //   console.log( result );

  //   console.log( cmd.stdout( result ) );
  // }
  // else {
  //   let result = await firewall.add( '103.10.124.121' );
  //   console.log( result );

  //   console.log( cmd.stdout( result ) );
  // }

  // Query for the list of CS:GO / CS2 servers.
  const response = await axios.get( 'https://api.steampowered.com/ISteamApps/GetSDRConfig/v1/?appid=730' );

  // Parse all the servers into a neater array.
  await getRelays( response );

  // Display all the servers in the UI and begin to ping them.
  await createServers( document.getElementById( 'servers' ) );

  // Attach the event listener for filtering servers.
  document.getElementById( 'search' ).addEventListener( 'input', ( event ) => {
    const { target } = event;
    const value = target.value;

    // Show all servers if the input field has been cleared.
    if ( value.length == 0 ) {
      filterServers( '' );
      return;
    }

    filterServers( value );
  } );

  // TODO: Maybe make it an option to "ping on startup"?
  ping.build( servers );
  ping.run();
};