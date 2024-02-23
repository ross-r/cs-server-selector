// This file is the 'ping worker', as I like to call it.
// The purpose here is that it'll synchronously iterate and ping all the servers and it'll process them in as a queue, only allowing a certain amount of pings to happen at any given time.

// Since there's no NODE implementation of ICMP, we need to use child processes, these create a lot of handles and are expensive
// but there's really no better, universally, available option..
// There ARE native node implementations of system sockets, i.e., C socket() functions, that expose calls to NODE, but these are system specific implementations
// and the additional developer overhead that these introduce seem to be worth the trade off that native implementations provide.

const ping = require( 'ping' );
const fs = require( 'node:fs' );

let addresses = [];

// Do not exceed X sub-processes of cmd.exe
let MAX_CONTINUOUS_PINGS = 12;

//
// Ping statistics.
//
const stats = {
  // How long the ping routine took to fully execute.
  executionTime: {
    startTime: 0,
    endTime: 0,
    duration: 0
  },

  // General ping statistics to keep track of successes / failures.
  numPings: 0,
  alivePings: 0,
  deadPings: 0,

  // Array of dead IPs.
  deadIPs: [],

  // Array of ping results including the IP and the average latency.
  results: []
}

//
// Called when the ping routine is finished.
//
const finished = ( mainWindow ) => {
  // Compute how long the execution took.
  stats.executionTime.endTime = Date.now();
  stats.executionTime.duration = stats.executionTime.endTime - stats.executionTime.startTime;

  // Send the stats to the renderer process.
  mainWindow.webContents.send( 'ping_stats', stats );

  // Write the results to a file that we'll read back in on the next start.
  fs.writeFileSync( 'pings.dat', JSON.stringify( stats.results ).toString( 'binary' ), { encoding: 'binary' } );
}

//
// Checks to see if we've exhausted all addresses needed to be pinged.
//
const isFinished = ( queue ) => addresses.length == 0 && queue.length == 0;

//
// Sends the result of a ping, including the address, to the renderer process.
//
const submitPingResponse = ( mainWindow, address, result ) => {
  mainWindow.webContents.send( 'ping_response', {
    ip: address,
    result: result
  } );
}

const processQueueItem = ( mainWindow, address, queue ) => {
  ping.promise.probe( address ).then( ( res ) => {
    ++stats.numPings;
    stats.alivePings = res.alive ? ++stats.alivePings : stats.alivePings;

    // Keep track of dead addresses.
    if( !res.alive ) {
      ++stats.deadPings;
      stats.deadIPs.push( address );
    }

    // Add the ping result into the array of results so we can save a file and use it as a cache.
    stats.results.push( {
      ip: res.host,
      avg: res.avg
    } );

    // Remove this item from the queue and send the response to the renderer.
    const ip = queue.splice( queue.indexOf( res.host ), 1 );
    submitPingResponse( mainWindow, ip[ ip.length - 1 ], res );
    
    // Update the queue again and check if we're done, i.e., no more addresses and nothing else was added to the queue.
    updateQueue( mainWindow, queue );
    if( isFinished( queue ) ) {

      // Call the finished routine to send any statistics and do any cleanup.
      finished( mainWindow );
    }

  } ).catch( ( error ) => {
    console.log( error );

    ++stats.deadPings;
    stats.deadIPs.push( address );

    queue.pop();

    updateQueue( mainWindow, queue );
  } );
}

const updateQueue = ( mainWindow, queue ) => {
  //
  // If there's no more addresses left, kill off processing entirely.
  //
  if( addresses.length == 0 ) {
    return;
  }

  //
  // If the queue already has items, don't add more items until the queue is empty.
  //
  if( queue.length ) {
    return;
  }

  //
  // Populate the queue with addresses and process each 'item'.
  //
  while( addresses.length && queue.length < MAX_CONTINUOUS_PINGS ) {
    const address = addresses.pop();
    queue.push( address );
    processQueueItem( mainWindow, address, queue );
  }
}

// Takes in the array of servers and adds all the IPs to a queue to be pinged.
module.exports.build = ( servers ) => {
  for( let i = 0; i < servers.length; ++i ) {
    const server = servers[ i ];
    addresses.push( ...server.ips );
  }
}

// Begins to fill the queue and process each queue item.
module.exports.run = ( mainWindow ) => {
  //
  // Set the start time to the system epoch time.
  //
  stats.executionTime.startTime = Date.now();

  let queue = [];
  updateQueue( mainWindow, queue );
}

// Export a wrapper for the stats.
module.exports.stats = () => stats;