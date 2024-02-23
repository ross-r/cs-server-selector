const fs = require( 'node:fs' );
const { spawn, spawnSync } = require( 'node:child_process' );

const logHandle = fs.openSync( 'log.out', 'w' );

// Creates a process and returns it.
module.exports.create = async ( command ) => {
  fs.writeSync( logHandle, `creating cmd.exe with args: /s /c ${command}\r\n` );
  return spawnSync( 'cmd.exe', [ '/s', '/c', command ] );
}

module.exports.createAsync = ( command ) => {
  fs.writeSync( logHandle, `creating (async) cmd.exe with args: /s /c ${command}\r\n` );
  return spawn( 'cmd.exe', [ '/s', '/c', command ] );
}

// Reads 'stdout' from the subprocess' output.
module.exports.stdout = ( subprocess ) => {
  return Buffer.from( subprocess.output[ 1 ] ).toString();
}

// Reads 'stderr' from the subprocess' output.
module.exports.stderr = ( subprocess ) => {
  return Buffer.from( subprocess.output[ 2 ] ).toString();
}