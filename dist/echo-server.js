"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EchoServer = void 0;
var subscribers_1 = require("./subscribers");
var channels_1 = require("./channels");
var server_1 = require("./server");
var api_1 = require("./api");
var log_1 = require("./log");
var packageFile = require("../package.json");
var constants = require("crypto").constants;
var EchoServer = (function () {
    function EchoServer() {
        this.defaultOptions = {
            authHost: "http://localhost",
            authEndpoint: "/broadcasting/auth",
            clients: [],
            database: "redis",
            databaseConfig: {
                redis: {},
                sqlite: {
                    databasePath: "/database/laravel-echo-server.sqlite",
                },
            },
            devMode: false,
            host: null,
            port: 6001,
            protocol: "http",
            socketio: {},
            secureOptions: constants.SSL_OP_NO_TLSv1,
            sslCertPath: "",
            sslKeyPath: "",
            sslCertChainPath: "",
            sslPassphrase: "",
            subscribers: {
                http: true,
                redis: true,
            },
            apiOriginAllow: {
                allowCors: false,
                allowOrigin: "",
                allowMethods: "",
                allowHeaders: "",
            },
        };
    }
    EchoServer.prototype.run = function (options) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.options = Object.assign(_this.defaultOptions, options);
            _this.startup();
            _this.server = new server_1.Server(_this.options);
            _this.server.init().then(function (io) {
                _this.init(io).then(function () { return __awaiter(_this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        log_1.Log.info("\nServer ready!\n");
                        resolve(this);
                        try {
                        }
                        catch (err) {
                            this.server.fastify.log.error(err);
                            process.exit(1);
                        }
                        return [2];
                    });
                }); }, function (error) { return log_1.Log.error(error); });
            }, function (error) { return log_1.Log.error(error); });
        });
    };
    EchoServer.prototype.init = function (io) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.channel = new channels_1.Channel(io, _this.options);
            _this.subscribers = [];
            if (_this.options.subscribers.http)
                _this.subscribers.push(new subscribers_1.HttpSubscriber(_this.server.fastify, _this.options));
            if (_this.options.subscribers.redis)
                _this.subscribers.push(new subscribers_1.RedisSubscriber(_this.options));
            _this.httpApi = new api_1.HttpApi(io, _this.channel, _this.server.fastify, _this.options.apiOriginAllow);
            _this.httpApi.init();
            _this.onConnect();
            _this.listen().then(function () { return resolve(); }, function (err) { return log_1.Log.error(err); });
        });
    };
    EchoServer.prototype.startup = function () {
        log_1.Log.title("\nL A R A V E L  E C H O  S E R V E R\n");
        log_1.Log.info("version " + packageFile.version + "\n");
        if (this.options.devMode) {
            log_1.Log.warning("Starting server in DEV mode...\n");
        }
        else {
            log_1.Log.info("Starting server...\n");
        }
    };
    EchoServer.prototype.stop = function () {
        var _this = this;
        console.log("Stopping the LARAVEL ECHO SERVER");
        var promises = [];
        this.subscribers.forEach(function (subscriber) {
            promises.push(subscriber.unsubscribe());
        });
        promises.push(this.server.io.close());
        return Promise.all(promises).then(function () {
            _this.subscribers = [];
            console.log("The LARAVEL ECHO SERVER server has been stopped.");
        });
    };
    EchoServer.prototype.listen = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var subscribePromises = _this.subscribers.map(function (subscriber) {
                return subscriber.subscribe(function (channel, message) {
                    return _this.broadcast(channel, message);
                });
            });
            Promise.all(subscribePromises).then(function () { return resolve(); });
        });
    };
    EchoServer.prototype.find = function (socket_id) {
        return this.server.io.sockets.connected[socket_id];
    };
    EchoServer.prototype.broadcast = function (channel, message) {
        if (message.socket && this.find(message.socket)) {
            return this.toOthers(this.find(message.socket), channel, message);
        }
        else {
            return this.toAll(channel, message);
        }
    };
    EchoServer.prototype.toOthers = function (socket, channel, message) {
        socket.broadcast.to(channel).emit(message.event, channel, message.data);
        return true;
    };
    EchoServer.prototype.toAll = function (channel, message) {
        this.server.io.to(channel).emit(message.event, channel, message.data);
        return true;
    };
    EchoServer.prototype.onConnect = function () {
        var _this = this;
        this.server.io.on("connection", function (socket) {
            _this.onSubscribe(socket);
            _this.onUnsubscribe(socket);
            _this.onDisconnecting(socket);
            _this.onClientEvent(socket);
        });
    };
    EchoServer.prototype.onSubscribe = function (socket) {
        var _this = this;
        socket.on("subscribe", function (data) {
            _this.channel.join(socket, data);
        });
    };
    EchoServer.prototype.onUnsubscribe = function (socket) {
        var _this = this;
        socket.on("unsubscribe", function (data) {
            _this.channel.leave(socket, data.channel, "unsubscribed");
        });
    };
    EchoServer.prototype.onDisconnecting = function (socket) {
        var _this = this;
        socket.on("disconnecting", function (reason) {
            Object.keys(socket.rooms).forEach(function (room) {
                if (room !== socket.id) {
                    _this.channel.leave(socket, room, reason);
                }
            });
        });
    };
    EchoServer.prototype.onClientEvent = function (socket) {
        var _this = this;
        socket.on("client event", function (data) {
            _this.channel.clientEvent(socket, data);
        });
    };
    return EchoServer;
}());
exports.EchoServer = EchoServer;
