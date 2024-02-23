const { create, createAsync, stdout } = require( './cmd' );

// Tokenize the IP address into a string that we can use to identify it belongs to us.
const FIREWALL_PREFIX = "CSServerBlocker";
const tokenize = ( remoteIP ) => {
  return `${ FIREWALL_PREFIX }_${ remoteIP }`;
}

// Adds an IP address to the firewall and blocks inbound and outbound packets.
module.exports.add = async ( remoteIP ) => {
  const subprocess = create(
    `netsh advfirewall firewall add rule name=${ tokenize( remoteIP ) } dir=out action=block protocol=UDP remoteIP=${ remoteIP }`
  );
  return subprocess;
}

// Removes an IP address from the firewall.
module.exports.remove = async ( remoteIP ) => {
  const subprocess = create(
    `netsh advfirewall firewall delete rule name=${ tokenize( remoteIP ) }`
  );
  return subprocess;
}

// Queries the firewall to find if an IP address already exists.
module.exports.query = async ( remoteIP ) => {
  const subprocess = create(
    `netsh advfirewall firewall show rule name=${ tokenize( remoteIP ) }`
  );
  return subprocess;
}

module.exports.queryAsync = ( remoteIP ) => {
  return createAsync(
    `netsh advfirewall firewall show rule name=${ tokenize( remoteIP ) }`
  );
}

// Checks whether or not the supplied remote IP address is already present in the firewall.
module.exports.exists = async ( remoteIP ) => {
  const subprocess = await this.query( remoteIP );
  if ( subprocess.status !== 0 ) {
    return false;
  }

  const output = stdout( subprocess );
  return output.includes( remoteIP );
}

module.exports.existsAsync = ( remoteIP ) => {
  return new Promise( ( resolve, reject ) => {
    let stdout = [];

    const subprocess = this.queryAsync( remoteIP );
    
    subprocess.stdout.on( 'data', ( data ) => stdout.push( data ) );
    subprocess.stdout.on( 'end', () => {
      const output = Buffer.from( stdout.join( '' ) ).toString();
      resolve( output.includes( remoteIP ) );
    } );

    subprocess.on( 'exit', ( code, signal ) => {
      subprocess.unref();
    } );
  } );
}