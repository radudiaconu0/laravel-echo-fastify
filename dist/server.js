"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Server = void 0;
var fs = require("fs");
var url = require("url");
var log_1 = require("./log");
var fastify_1 = require("fastify");
var Server = (function () {
    function Server(options) {
        this.options = options;
    }
    Server.prototype.init = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.serverProtocol().then(function () {
                var host = _this.options.host || "localhost";
                log_1.Log.success("Running at " + host + " on port " + _this.getPort());
                resolve(_this.io);
            }, function (error) { return reject(error); });
        });
    };
    Server.prototype.getPort = function () {
        var portRegex = /([0-9]{2,5})[\/]?$/;
        var portToUse = String(this.options.port).match(portRegex);
        if (portToUse)
            return Number(portToUse[1]);
        return null;
    };
    Server.prototype.serverProtocol = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (_this.options.protocol == "https") {
                _this.secure().then(function () {
                    resolve(_this.httpServer(true));
                }, function (error) { return reject(error); });
            }
            else {
                resolve(_this.httpServer(false));
            }
        });
    };
    Server.prototype.secure = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (!_this.options.sslCertPath || !_this.options.sslKeyPath) {
                reject("SSL paths are missing in server config.");
            }
            Object.assign(_this.options, {
                cert: fs.readFileSync(_this.options.sslCertPath),
                key: fs.readFileSync(_this.options.sslKeyPath),
                ca: _this.options.sslCertChainPath
                    ? fs.readFileSync(_this.options.sslCertChainPath)
                    : "",
                passphrase: _this.options.sslPassphrase,
            });
            resolve(_this.options);
        });
    };
    Server.prototype.httpServer = function (secure) {
        var _this = this;
        this.fastify = fastify_1.default({ logger: true });
        this.fastify.register(require("middie"));
        this.fastify.use(function (req, res, next) {
            for (var header in _this.options.headers) {
                res.header(header, _this.options.headers[header]);
            }
            next();
        });
        this.fastify.register(require("fastify-socket.io"), this.options.socketio);
        this.authorizeRequests();
        return (this.io = this.fastify.io);
    };
    Server.prototype.authorizeRequests = function () {
        this.fastify.addHook("preValidation", function (request, reply, done) {
            if (request.params.appId)
                if (!this.canAccess(request)) {
                    return this.unauthorizedResponse(request, reply);
                }
            done();
        });
    };
    Server.prototype.canAccess = function (req) {
        var appId = this.getAppId(req);
        var key = this.getAuthKey(req);
        if (key && appId) {
            var client = this.options.clients.find(function (client) {
                return client.appId === appId;
            });
            if (client) {
                return client.key === key;
            }
        }
        return false;
    };
    Server.prototype.getAppId = function (req) {
        if (req.params.appId) {
            return req.params.appId;
        }
        return false;
    };
    Server.prototype.getAuthKey = function (req) {
        if (req.headers.authorization) {
            return req.headers.authorization.replace("Bearer ", "");
        }
        if (url.parse(req.url, true).query.auth_key) {
            return url.parse(req.url, true).query.auth_key;
        }
        return false;
    };
    Server.prototype.unauthorizedResponse = function (req, res) {
        res.statusCode = 403;
        res.send({ error: "Unauthorized" });
        return false;
    };
    return Server;
}());
exports.Server = Server;
