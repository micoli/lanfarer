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
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchAllHosts = fetchAllHosts;
exports.handleHosts = handleHosts;
function score(h) {
    return (h.hostname ? 4 : 0) + (h.ip ? 2 : 0) + (h.active ? 1 : 0);
}
function bestConnexion(a, b) {
    if (a === "wifi 5G" || b === "wifi 5G")
        return "wifi 5G";
    if (a === "wifi 2.4G" || b === "wifi 2.4G")
        return "wifi 2.4G";
    return a !== null && a !== void 0 ? a : b;
}
function merge(a, b) {
    var _a;
    return {
        mac: a.mac,
        ip: a.ip || b.ip,
        ip6: a.ip6 || b.ip6,
        hostname: a.hostname || b.hostname,
        active: a.active || b.active,
        type: a.type || b.type,
        connexion: bestConnexion(a.connexion, b.connexion),
        ssid: a.ssid || b.ssid,
        lastseen: (_a = a.lastseen) !== null && _a !== void 0 ? _a : b.lastseen,
    };
}
function sseWrite(res, event, data) {
    res.write("event: ".concat(event, "\ndata: ").concat(JSON.stringify(data), "\n\n"));
}
function fetchAllHosts(plugins) {
    return __awaiter(this, void 0, void 0, function () {
        var hostsPlugins, byMac;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    hostsPlugins = plugins.filter(function (p) { return p.fetchHosts; });
                    byMac = new Map();
                    return [4 /*yield*/, Promise.allSettled(hostsPlugins.map(function (p) { return __awaiter(_this, void 0, void 0, function () {
                            var hosts, _i, hosts_1, host, key, existing;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, p.fetchHosts()];
                                    case 1:
                                        hosts = (_a.sent()).hosts;
                                        for (_i = 0, hosts_1 = hosts; _i < hosts_1.length; _i++) {
                                            host = hosts_1[_i];
                                            key = host.mac.toUpperCase();
                                            existing = byMac.get(key);
                                            if (!existing) {
                                                byMac.set(key, host);
                                            }
                                            else {
                                                byMac.set(key, score(host) >= score(existing) ? merge(host, existing) : merge(existing, host));
                                            }
                                        }
                                        return [2 /*return*/];
                                }
                            });
                        }); }))];
                case 1:
                    _a.sent();
                    return [2 /*return*/, { hosts: __spreadArray([], byMac.values(), true) }];
            }
        });
    });
}
function handleHosts(_req, res, plugins) {
    return __awaiter(this, void 0, void 0, function () {
        var hostsPlugins, total, byMac, done;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    hostsPlugins = plugins.filter(function (p) { return p.fetchHosts; });
                    res.writeHead(200, {
                        "content-type": "text/event-stream",
                        "cache-control": "no-cache",
                        "connection": "keep-alive",
                        "x-accel-buffering": "no",
                    });
                    total = hostsPlugins.length;
                    if (total === 0) {
                        sseWrite(res, "result", { hosts: [] });
                        res.end();
                        return [2 /*return*/];
                    }
                    byMac = new Map();
                    done = 0;
                    sseWrite(res, "progress", { pct: 0, label: hostsPlugins.map(function (p) { return p.type; }).join(", ") });
                    return [4 /*yield*/, Promise.allSettled(hostsPlugins.map(function (p) { return __awaiter(_this, void 0, void 0, function () {
                            var hosts, _i, hosts_2, host, key, existing;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, , 2, 3]);
                                        return [4 /*yield*/, p.fetchHosts()];
                                    case 1:
                                        hosts = (_a.sent()).hosts;
                                        for (_i = 0, hosts_2 = hosts; _i < hosts_2.length; _i++) {
                                            host = hosts_2[_i];
                                            key = host.mac.toUpperCase();
                                            existing = byMac.get(key);
                                            if (!existing) {
                                                byMac.set(key, host);
                                            }
                                            else {
                                                byMac.set(key, score(host) >= score(existing) ? merge(host, existing) : merge(existing, host));
                                            }
                                        }
                                        return [3 /*break*/, 3];
                                    case 2:
                                        done++;
                                        sseWrite(res, "progress", {
                                            pct: Math.round((done / total) * 95),
                                            label: p.type,
                                        });
                                        return [7 /*endfinally*/];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        }); }))];
                case 1:
                    _a.sent();
                    sseWrite(res, "result", { hosts: __spreadArray([], byMac.values(), true) });
                    res.end();
                    return [2 /*return*/];
            }
        });
    });
}
