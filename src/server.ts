import * as fs from "fs";
var url = require("url");
import { Log } from "./log";
import fastify from "fastify";

export class Server {
  /**
   * The http server.
   *
   * @type {any}
   */
  public fastify: any;

  /**
   * Socket.io client.
   *
   * @type {object}
   */
  public io: any;

  /**
   * Create a new server instance.
   */
  constructor(private options: any) {}

  /**
   * Start the Socket.io server.
   *
   * @return {void}
   */
  init(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.serverProtocol().then(
        () => {
          let host = this.options.host || "localhost";
          Log.success(`Running at ${host} on port ${this.getPort()}`);

          resolve(this.io);
        },
        (error) => reject(error)
      );
    });
  }

  /**
   * Sanitize the port number from any extra characters
   *
   * @return {number}
   */
  getPort() {
    let portRegex = /([0-9]{2,5})[\/]?$/;
    let portToUse = String(this.options.port).match(portRegex); // index 1 contains the cleaned port number only
    if (portToUse) return Number(portToUse[1]);
    return null;
  }

  /**
   * Select the http protocol to run on.
   *
   * @return {Promise<any>}
   */
  serverProtocol(): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this.options.protocol == "https") {
        this.secure().then(
          () => {
            resolve(this.httpServer(true));
          },
          (error) => reject(error)
        );
      } else {
        resolve(this.httpServer(false));
      }
    });
  }

  /**
   * Load SSL 'key' & 'cert' files if https is enabled.
   *
   * @return {void}
   */
  secure(): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.options.sslCertPath || !this.options.sslKeyPath) {
        reject("SSL paths are missing in server config.");
      }

      Object.assign(this.options, {
        cert: fs.readFileSync(this.options.sslCertPath),
        key: fs.readFileSync(this.options.sslKeyPath),
        ca: this.options.sslCertChainPath
          ? fs.readFileSync(this.options.sslCertChainPath)
          : "",
        passphrase: this.options.sslPassphrase,
      });

      resolve(this.options);
    });
  }

  /**
   * Create a socket.io server.
   *
   * @return {any}
   */
  httpServer(secure: boolean) {
    this.fastify = fastify({ logger: true });
    this.fastify.register(require("middie"));
    this.fastify.use((req, res, next) => {
      for (var header in this.options.headers) {
        res.header(header, this.options.headers[header]);
      }
      next();
    });
    this.fastify.register(
      require("fastify-socket.io"),
      this.options.socketio
    );
    this.authorizeRequests();

    return (this.io = this.fastify.io);
  }

  /**
   * Attach global protection to HTTP routes, to verify the API key.
   */
  authorizeRequests(): void {
    this.fastify.addHook("preValidation", function (request, reply, done) {
      if (request.params.appId)
        if (!this.canAccess(request)) {
          return this.unauthorizedResponse(request, reply);
        }
      done();
    });
  }

  /**
   * Check is an incoming request can access the api.
   *
   * @param  {any} req
   * @return {boolean}
   */
  canAccess(req: any): boolean {
    let appId = this.getAppId(req);
    let key = this.getAuthKey(req);

    if (key && appId) {
      let client = this.options.clients.find((client: any) => {
        return client.appId === appId;
      });

      if (client) {
        return client.key === key;
      }
    }

    return false;
  }

  /**
   * Get the appId from the URL
   *
   * @param  {any} req
   * @return {string|boolean}
   */
  getAppId(req: any): string | boolean {
    if (req.params.appId) {
      return req.params.appId;
    }

    return false;
  }

  /**
   * Get the api token from the request.
   *
   * @param  {any} req
   * @return {string|boolean}
   */
  getAuthKey(req: any): string | boolean {
    if (req.headers.authorization) {
      return req.headers.authorization.replace("Bearer ", "");
    }

    if (url.parse(req.url, true).query.auth_key) {
      return url.parse(req.url, true).query.auth_key;
    }

    return false;
  }

  /**
   * Handle unauthorized requests.
   *
   * @param  {any} req
   * @param  {any} res
   * @return {boolean}
   */
  unauthorizedResponse(req: any, res: any): boolean {
    res.statusCode = 403;
    res.send({ error: "Unauthorized" });

    return false;
  }
}
