// const information = document.getElementById( 'info' );
// information.innerText = `This app is using Chrome (v${ versions.chrome() }), Node.js (v${ versions.node() }), and Electron (v${ versions.electron() })`;

const getRandomStr = ( length = 16 ) => {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.apply( null, { length: length } ).map( () => charset.charAt( Math.floor( Math.random() * charset.length ) ) ).join( '' );
}

// This function is called when the UI has created the block/unblock button,
// the purpose of this function is to query all IPs for the given server and update the button
// to reflect if it's been blocked already, perhaps in future we can cache this result.
const checkIfBlockedAndUpdate = ( server, buttonId, iconId ) => {
  // If any single IP address has been blocked, that's enough to change the button.
  for ( let i = 0; i < server.ips.length; ++i ) {
    window.api.send( 'request', {
      action: 'firewall.exists',
      data: {
        ip: server.ips[ i ],
        buttonId: buttonId,
        iconId: iconId
      }
    } );
  }
}

const buttonBlockOrUnblock = ( index, buttonId, iconId ) => {
  window.api.send( 'request', {
    action: 'block_or_unblock',
    data: {
      server: index,
      buttonId: buttonId,
      iconId: iconId
    }
  } );
}

const createServers = ( servers ) => {
  numServers = servers.length;

  const parent = document.getElementById( 'servers' );
  parent.replaceChildren(); // Remove all child elements from the DOM.

  // Create main accordion, all entries will be appended to this.
  const accordion = document.createElement( 'div' );
  accordion.classList.add( 'accordion', 'accordion-flush' );

  for ( let i = 0; i < servers.length; ++i ) {
    const server = servers[ i ];

    // <div class="accordion-item">
    const accordion_item = document.createElement( 'div' );
    accordion_item.setAttribute( 'id', btoa( server.location.toLowerCase() ) );
    accordion_item.setAttribute( 'data-name', server.location );
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
    accordion_button.innerText = server.location;

    // <i class="bi bi-ban pe-2"></i>
    const accordion_button_icon = document.createElement( 'i' );
    accordion_button_icon.setAttribute( 'id', getRandomStr() );
    accordion_button_icon.classList.add( 'd-none', 'bi', 'bi-ban', 'text-danger', 'pe-2' );
    accordion_button.prepend( accordion_button_icon );

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
    button.setAttribute( 'id', getRandomStr() );
    button.setAttribute( 'onclick', `buttonBlockOrUnblock( ${i}, '${button.getAttribute( 'id' )}', '${accordion_button_icon.getAttribute('id')}' )` );
    button.classList.add( 'btn' );
    button.classList.add( 'btn-success' );
    button.classList.add( 'w-100' );
    button.innerHTML = "Block";

    // We need to check if the IPs have already been added to the firewall and updated the UI to reflect that.
    checkIfBlockedAndUpdate( server, button.getAttribute( 'id' ), accordion_button_icon.getAttribute( 'id' ) );

    accordion_body.appendChild( button );
    accordion_collapse.appendChild( accordion_body );
    accordion_item.appendChild( accordion_collapse );

    accordion.appendChild( accordion_item );
  }

  parent.appendChild( accordion );
}

const filterServers = ( filter ) => {
  const elements = document.getElementsByClassName( 'accordion-item' );
  for( let i = 0; i < elements.length; ++i ) {
    const element = elements[ i ];
    
    element.classList.remove( 'd-none' );

    const location = element.getAttribute( 'data-name' ).toLocaleLowerCase();
    if( !location.includes( filter ) ) {
      element.classList.add( 'd-none' );
    }
  }
}

// Attach the event listener for filtering servers.
document.getElementById( 'search' ).addEventListener( 'input', ( event ) => {
  const { target } = event;
  filterServers( target.value.toLocaleLowerCase() );
} );

// Create the UI when the main thread sends us the servers array.
window.api.receive( 'servers', ( data ) => {
  createServers( data );
} );

const updateButtonState = ( data ) => {
  const buttonId = data.buttonId;
  const iconId = data.iconId;

  // state=true means the servers have been blocked.
  const state = data.state;

  const icon = document.getElementById( iconId );
  const button = document.getElementById( buttonId );

  if ( state ) {
    button.classList.remove( 'btn-success' );
    button.classList.add( 'btn-danger' );
    button.innerHTML = "Unblock";

    icon.classList.remove( 'd-none' );
  }
  else {
    button.classList.add( 'btn-success' );
    button.classList.remove( 'btn-danger' );
    button.innerHTML = "Block";

    icon.classList.add( 'd-none' );
  }
}

window.api.receive( 'updateButtonState', updateButtonState );

const updatePing = ( ip, result ) => {
  const spinner = document.getElementById( `ping_${ ip }_spinner` );
  const latency = document.getElementById( `ping_${ ip }_latency` );

  spinner.remove();
  
  latency.innerHTML = result.alive ? `${Number( result.avg ).toFixed()} ms` : result.avg;
  latency.classList.remove( 'invisible' );

  //
  // Set the latency colour from a supplied hue range and scale the latency down to a min/max.
  //
  const PING_MAX = 400;
  const HUE_MAX = 100;
  const HUE_MIN = 0;

  // If the ping was a success (alive) use the average, otherwise, use 999 (max)
  const value = result.alive ? result.avg : 999;

  // Scale the latency into a percentage with a min/max
  //    NOTE: min removed from calc here as it's unused.
  const scale = Math.min( value / PING_MAX, 1 );
  const hue = scale * ( HUE_MAX - HUE_MIN ) + HUE_MIN;

  latency.style.color = `hsl( ${ HUE_MAX - hue }, 100%, 50% )`;
}

window.api.receive( 'ping_response', ( data ) => {
  if( !( data.hasOwnProperty( 'ip' ) && data.hasOwnProperty( 'result' ) ) ) {
    return;
  }

  updatePing( data.ip, data.result );
} );

window.api.receive( 'ping_stats', ( data ) => {
  const progress = document.getElementById( 'ping-progress' );
  const stats = document.getElementById( 'ping-stats' );

  progress.remove();
  stats.classList.remove( 'd-none' );

  // 232 / 231 (1 dead) - took 3.2s
  const numPings = data.numPings;
  const alivePings = data.alivePings;
  const deadPings = data.deadPings;
  const executionTime = data.executionTime.duration;

  stats.innerHTML = `${numPings} / ${alivePings} (${deadPings} dead) - took ${executionTime / 1000}s`;

  // Possibly add a retry button for any dead pings.
} );