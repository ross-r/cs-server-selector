export class Server {
  private _location: string;
  private _ip: string;

  constructor( location_: string, ip_: string ) {
    this._location = location_;
    this._ip = ip_;
  }

  public get location(): string {
    return this._location;
  }

  public set location(value: string) {
    this._location = value;
  }

  public get ip(): string {
    return this._ip;
  }

  public set ip(value: string) {
    this._ip = value;
  }
}

export class Application {
  private servers!: Server[];

  public server( index: number ): Server {
    return this.servers[ index ];
  }
}