"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.loadKuwfiConfig = loadKuwfiConfig;
exports.fetchKuwfiRouter = fetchKuwfiRouter;
exports.fetchAllKuwfiRouters = fetchAllKuwfiRouters;
exports.fetchKuwfiBandwidth = fetchKuwfiBandwidth;
var node_crypto_1 = require("node:crypto");
var node_fs_1 = require("node:fs");
var yaml_1 = require("yaml");
var config_ts_1 = require("../../../server/config.ts");
var TIMEOUT_MS = 5000;
function loadKuwfiConfig() {
    var _a;
    try {
        var raw = node_fs_1.default.readFileSync(config_ts_1.CONFIG_FILE, "utf8");
        var data = (0, yaml_1.parse)(raw);
        return ((_a = data.routers) !== null && _a !== void 0 ? _a : []).filter(function (r) { return r.type === "kuwfi" && r.enabled !== false; });
    }
    catch (_b) {
        return [];
    }
}
// ── HTTP helpers ───────────────────────────────────────────────────────────────
function fetchWithTimeout(url, init) {
    return __awaiter(this, void 0, void 0, function () {
        var ac, timer;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    ac = new AbortController();
                    timer = setTimeout(function () { return ac.abort(); }, TIMEOUT_MS);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, , 3, 4]);
                    return [4 /*yield*/, fetch(url, __assign(__assign({}, init), { signal: ac.signal }))];
                case 2: return [2 /*return*/, _a.sent()];
                case 3:
                    clearTimeout(timer);
                    return [7 /*endfinally*/];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function md5(s) {
    return (0, node_crypto_1.createHash)("md5").update(s).digest("hex");
}
function kuwfiLogin(ip, password) {
    return __awaiter(this, void 0, void 0, function () {
        var res, data, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 4, , 5]);
                    return [4 /*yield*/, fetchWithTimeout("http://".concat(ip, "/cgi-bin/login"), {
                            method: "POST",
                            headers: { "content-type": "application/x-www-form-urlencoded" },
                            body: "opcode=1&username=admin&password=".concat(md5(password)),
                        })];
                case 1:
                    res = _b.sent();
                    return [4 /*yield*/, res.json()];
                case 2:
                    data = (_b.sent());
                    if (data.result !== "1" || !data.token)
                        return [2 /*return*/, null];
                    // MAC auth step required by the firmware session flow
                    return [4 /*yield*/, fetchWithTimeout("http://".concat(ip, "/cgi-bin/login"), {
                            method: "POST",
                            headers: {
                                "content-type": "application/x-www-form-urlencoded",
                                cookie: "stork=".concat(data.token),
                            },
                            body: "opcode=3",
                        })];
                case 3:
                    // MAC auth step required by the firmware session flow
                    _b.sent();
                    return [2 /*return*/, data.token];
                case 4:
                    _a = _b.sent();
                    return [2 /*return*/, null];
                case 5: return [2 /*return*/];
            }
        });
    });
}
function kuwfiPost(ip, token, endpoint, params) {
    return __awaiter(this, void 0, void 0, function () {
        var interval, res, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    interval = Date.now();
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, fetchWithTimeout("http://".concat(ip, "/cgi-bin/").concat(endpoint), {
                            method: "POST",
                            headers: {
                                "content-type": "application/x-www-form-urlencoded",
                                cookie: "stork=".concat(token),
                            },
                            body: "".concat(params, "&interval=").concat(interval),
                        })];
                case 2:
                    res = _b.sent();
                    return [4 /*yield*/, res.json()];
                case 3: return [2 /*return*/, _b.sent()];
                case 4:
                    _a = _b.sent();
                    return [2 /*return*/, null];
                case 5: return [2 /*return*/];
            }
        });
    });
}
function parseClients(raw, ssid, band) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    var list = raw;
    var entries = (_b = (_a = list === null || list === void 0 ? void 0 : list.ItemList) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : [];
    var clients = [];
    for (var _i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
        var e = entries_1[_i];
        var mac = ((_d = (_c = e.MAC) !== null && _c !== void 0 ? _c : e.mac) !== null && _d !== void 0 ? _d : "").toUpperCase().trim();
        if (!mac || mac === "00:00:00:00:00:00")
            continue;
        var ip = (_f = (_e = e.IP) !== null && _e !== void 0 ? _e : e.ip) !== null && _f !== void 0 ? _f : "";
        var rawSignal = Number((_h = (_g = e.SIGNAL) !== null && _g !== void 0 ? _g : e.signal) !== null && _h !== void 0 ? _h : 0);
        // Firmware reports positive integer; treat as absolute dBm value
        var signal_dbm = rawSignal > 0 ? -rawSignal : rawSignal;
        clients.push({ mac: mac, ip: ip, signal_dbm: signal_dbm, band: band, ssid: ssid });
    }
    return clients;
}
function channelToBand(channel) {
    return channel > 14 ? "5G" : "2.4G";
}
// ── Fetcher ───────────────────────────────────────────────────────────────────
function fetchKuwfiRouter(cfg) {
    return __awaiter(this, void 0, void 0, function () {
        var result, token, _a, info1Raw, info2Raw, wifiStatusRaw, info1, info2, wifiStatus, accessPointMap, wlanIndices_3, _i, _b, key, m, _c, wlanIndices_1, wlanIdx, channel, band, vapIndices, _d, _e, key, m, _f, vapIndices_1, vapIdx, rfKey, ssid, apKey, wlanIndices, _g, accessPointMap_1, key, _h, wlanIndices_2, wlanIdx, clientsRaw, _j, accessPointMap_2, _k, apKey, ap;
        var _l, _m, _o, _p;
        return __generator(this, function (_q) {
            switch (_q.label) {
                case 0:
                    result = {
                        name: cfg.name,
                        ip: cfg.ip,
                        online: false,
                        firmware: "",
                        uptime: 0,
                        accessPoints: [],
                    };
                    return [4 /*yield*/, kuwfiLogin(cfg.ip, cfg.password)];
                case 1:
                    token = _q.sent();
                    if (!token)
                        return [2 /*return*/, result];
                    result.online = true;
                    return [4 /*yield*/, Promise.all([
                            kuwfiPost(cfg.ip, token, "sysinfo", "opcode=1"),
                            kuwfiPost(cfg.ip, token, "sysinfo", "opcode=2"),
                            kuwfiPost(cfg.ip, token, "wireless_status", "opcode=2&wlanid=0"),
                        ])];
                case 2:
                    _a = _q.sent(), info1Raw = _a[0], info2Raw = _a[1], wifiStatusRaw = _a[2];
                    info1 = info1Raw;
                    info2 = info2Raw;
                    wifiStatus = wifiStatusRaw;
                    result.firmware = (_l = info1 === null || info1 === void 0 ? void 0 : info1.FIRMVERSION) !== null && _l !== void 0 ? _l : "";
                    result.uptime = Number((_m = info2 === null || info2 === void 0 ? void 0 : info2.system_up_time) !== null && _m !== void 0 ? _m : 0);
                    accessPointMap = new Map();
                    if (wifiStatus) {
                        wlanIndices_3 = new Set();
                        for (_i = 0, _b = Object.keys(wifiStatus); _i < _b.length; _i++) {
                            key = _b[_i];
                            m = key.match(/^WLAN(\d+)_CHANNEL$/);
                            if (m)
                                wlanIndices_3.add(Number(m[1]));
                        }
                        for (_c = 0, wlanIndices_1 = wlanIndices_3; _c < wlanIndices_1.length; _c++) {
                            wlanIdx = wlanIndices_1[_c];
                            channel = Number((_o = wifiStatus["WLAN".concat(wlanIdx, "_CHANNEL")]) !== null && _o !== void 0 ? _o : 0);
                            band = channelToBand(channel);
                            vapIndices = new Set();
                            for (_d = 0, _e = Object.keys(wifiStatus); _d < _e.length; _d++) {
                                key = _e[_d];
                                m = key.match(new RegExp("^WLAN".concat(wlanIdx, "_VAP(\\d+)_SSID$")));
                                if (m)
                                    vapIndices.add(Number(m[1]));
                            }
                            for (_f = 0, vapIndices_1 = vapIndices; _f < vapIndices_1.length; _f++) {
                                vapIdx = vapIndices_1[_f];
                                rfKey = "WLAN".concat(wlanIdx, "_VAP").concat(vapIdx, "_PRERF");
                                if (wifiStatus[rfKey] !== "1")
                                    continue;
                                ssid = (_p = wifiStatus["WLAN".concat(wlanIdx, "_VAP").concat(vapIdx, "_SSID")]) !== null && _p !== void 0 ? _p : "";
                                if (!ssid)
                                    continue;
                                apKey = wlanIdx * 10 + vapIdx;
                                accessPointMap.set(apKey, { ssid: ssid, band: band, channel: channel, clients: [] });
                            }
                        }
                    }
                    // If no VAPs found from status, create a default AP
                    if (accessPointMap.size === 0) {
                        accessPointMap.set(0, { ssid: "", band: "5G", channel: 0, clients: [] });
                    }
                    wlanIndices = new Set();
                    for (_g = 0, accessPointMap_1 = accessPointMap; _g < accessPointMap_1.length; _g++) {
                        key = accessPointMap_1[_g][0];
                        wlanIndices.add(Math.floor(key / 10));
                    }
                    _h = 0, wlanIndices_2 = wlanIndices;
                    _q.label = 3;
                case 3:
                    if (!(_h < wlanIndices_2.length)) return [3 /*break*/, 6];
                    wlanIdx = wlanIndices_2[_h];
                    return [4 /*yield*/, kuwfiPost(cfg.ip, token, "wireless_clientlist", "opcode=1&wlanid=".concat(wlanIdx))];
                case 4:
                    clientsRaw = _q.sent();
                    // Assign clients to the matching AP for this wlan
                    for (_j = 0, accessPointMap_2 = accessPointMap; _j < accessPointMap_2.length; _j++) {
                        _k = accessPointMap_2[_j], apKey = _k[0], ap = _k[1];
                        if (Math.floor(apKey / 10) === wlanIdx) {
                            ap.clients = parseClients(clientsRaw, ap.ssid, ap.band);
                            break;
                        }
                    }
                    _q.label = 5;
                case 5:
                    _h++;
                    return [3 /*break*/, 3];
                case 6:
                    result.accessPoints = __spreadArray([], accessPointMap.values(), true);
                    return [2 /*return*/, result];
            }
        });
    });
}
function fetchAllKuwfiRouters() {
    return __awaiter(this, void 0, void 0, function () {
        var configs;
        return __generator(this, function (_a) {
            configs = loadKuwfiConfig();
            return [2 /*return*/, Promise.all(configs.map(fetchKuwfiRouter))];
        });
    });
}
function fetchKuwfiThroughputSeries(ip, token, wlanid) {
    return __awaiter(this, void 0, void 0, function () {
        var res, json, entries_2, len_1, now_1, _a;
        var _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    _e.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, fetchWithTimeout("http://".concat(ip, "/cgi-bin/system_throughput?wlanid=").concat(wlanid), {
                            headers: { cookie: "stork=".concat(token) },
                        })];
                case 1:
                    res = _e.sent();
                    return [4 /*yield*/, res.json()];
                case 2:
                    json = (_e.sent());
                    entries_2 = (_d = (_c = (_b = json.WanThroughput) === null || _b === void 0 ? void 0 : _b.Throughput) === null || _c === void 0 ? void 0 : _c.filter(function (e) { return e.data.length > 0; })) !== null && _d !== void 0 ? _d : [];
                    if (entries_2.length === 0)
                        return [2 /*return*/, []];
                    len_1 = Math.max.apply(Math, entries_2.map(function (e) { return e.data.length; }));
                    now_1 = Math.floor(Date.now() / 1000);
                    return [2 /*return*/, Array.from({ length: len_1 }, function (_, i) {
                            var bytesPerSec = entries_2.reduce(function (sum, e) { var _a; return sum + Number((_a = e.data[i]) !== null && _a !== void 0 ? _a : 0); }, 0);
                            return {
                                ts: now_1 - (len_1 - 1 - i),
                                up: 0,
                                down: Math.round((bytesPerSec * 8) / 1000),
                            };
                        })];
                case 3:
                    _a = _e.sent();
                    return [2 /*return*/, []];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function fetchKuwfiBandwidth(cfg) {
    return __awaiter(this, void 0, void 0, function () {
        var token, _a, band24, band5;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, kuwfiLogin(cfg.ip, cfg.password)];
                case 1:
                    token = _b.sent();
                    if (!token)
                        return [2 /*return*/, { band24: [], band5: [] }];
                    return [4 /*yield*/, Promise.all([
                            fetchKuwfiThroughputSeries(cfg.ip, token, 0),
                            fetchKuwfiThroughputSeries(cfg.ip, token, 1),
                        ])];
                case 2:
                    _a = _b.sent(), band24 = _a[0], band5 = _a[1];
                    return [2 /*return*/, { band24: band24, band5: band5 }];
            }
        });
    });
}
