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
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadCudyConfig = loadCudyConfig;
exports.fetchCudyRouter = fetchCudyRouter;
exports.fetchAllCudyRouters = fetchAllCudyRouters;
exports.fetchCudyDevlist = fetchCudyDevlist;
exports.fetchCudyBandwidth = fetchCudyBandwidth;
var node_fs_1 = require("node:fs");
var yaml_1 = require("yaml");
var config_ts_1 = require("../../../server/config.ts");
var TIMEOUT_MS = 5000;
function loadCudyConfig() {
    var _a;
    try {
        var raw = node_fs_1.default.readFileSync(config_ts_1.CONFIG_FILE, "utf8");
        var data = (0, yaml_1.parse)(raw);
        return ((_a = data.routers) !== null && _a !== void 0 ? _a : []).filter(function (r) { return r.type === "cudy" && r.enabled !== false; });
    }
    catch (_b) {
        return [];
    }
}
// ── HTTP helpers ──────────────────────────────────────────────────────────────
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
function luciLogin(ip, password) {
    return __awaiter(this, void 0, void 0, function () {
        var body, res, cookies, _i, cookies_1, c, m, _a;
        var _b, _c, _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    body = new URLSearchParams({ luci_username: "admin", luci_password: password });
                    _f.label = 1;
                case 1:
                    _f.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, fetchWithTimeout("http://".concat(ip, "/cgi-bin/luci/"), {
                            method: "POST",
                            headers: { "content-type": "application/x-www-form-urlencoded" },
                            body: body.toString(),
                            redirect: "manual",
                        })];
                case 2:
                    res = _f.sent();
                    cookies = (_d = (_c = (_b = res.headers).getSetCookie) === null || _c === void 0 ? void 0 : _c.call(_b)) !== null && _d !== void 0 ? _d : [(_e = res.headers.get("set-cookie")) !== null && _e !== void 0 ? _e : ""];
                    for (_i = 0, cookies_1 = cookies; _i < cookies_1.length; _i++) {
                        c = cookies_1[_i];
                        m = c.match(/sysauth=([^;]+)/i);
                        if (m)
                            return [2 /*return*/, m[1]];
                    }
                    return [2 /*return*/, null];
                case 3:
                    _a = _f.sent();
                    return [2 /*return*/, null];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function luciGetJson(ip, token, path) {
    return __awaiter(this, void 0, void 0, function () {
        var url, res, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    url = "http://".concat(ip, "/cgi-bin/luci").concat(path);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, fetchWithTimeout(url, {
                            headers: { cookie: "sysauth=".concat(token) },
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
function luciRpc(ip, token, rpcPath, method, params) {
    return __awaiter(this, void 0, void 0, function () {
        var url, res, json, _a;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    url = "http://".concat(ip, "/cgi-bin/luci").concat(rpcPath, "?auth=").concat(token);
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, fetchWithTimeout(url, {
                            method: "POST",
                            headers: { "content-type": "application/json", cookie: "sysauth=".concat(token) },
                            body: JSON.stringify({ id: 1, method: method, params: params }),
                        })];
                case 2:
                    res = _c.sent();
                    return [4 /*yield*/, res.json()];
                case 3:
                    json = (_c.sent());
                    return [2 /*return*/, (_b = json.result) !== null && _b !== void 0 ? _b : null];
                case 4:
                    _a = _c.sent();
                    return [2 /*return*/, null];
                case 5: return [2 /*return*/];
            }
        });
    });
}
function hwmodeToStandard(hwmode) {
    var m = hwmode.toLowerCase();
    if (m.includes("be"))
        return "Wi-Fi 7 (802.11be)";
    if (m.includes("ax"))
        return "Wi-Fi 6 (802.11ax)";
    if (m.includes("ac") || m === "11ac")
        return "Wi-Fi 5 (802.11ac)";
    if (m.includes("na") || (m.includes("n") && m.includes("a")))
        return "Wi-Fi 4 (802.11n)";
    if (m.includes("ng") || (m.includes("n") && m.includes("g")))
        return "Wi-Fi 4 (802.11n)";
    if (m.includes("a"))
        return "802.11a";
    if (m.includes("g"))
        return "802.11g";
    if (m.includes("b"))
        return "802.11b";
    return hwmode;
}
function htmodeToWidth(htmode) {
    var m = htmode.toUpperCase();
    if (m.includes("320"))
        return 320;
    if (m.includes("160"))
        return 160;
    if (m.includes("80"))
        return 80;
    if (m.includes("40"))
        return 40;
    return 20;
}
function fetchWifiConfig(ip, token, ifnames) {
    return __awaiter(this, void 0, void 0, function () {
        var result, uciRaw, uciSections, deviceMap, ifaceMap, _i, _a, _b, sec, bssidResults, i, ifname, info, bssid, ssid, ifaceConfig, devConfig;
        var _c, _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    result = new Map();
                    return [4 /*yield*/, luciRpc(ip, token, "/rpc/uci", "get_all", ["wireless"])];
                case 1:
                    uciRaw = _f.sent();
                    uciSections = (uciRaw !== null && uciRaw !== void 0 ? uciRaw : {});
                    deviceMap = new Map();
                    ifaceMap = new Map();
                    for (_i = 0, _a = Object.entries(uciSections); _i < _a.length; _i++) {
                        _b = _a[_i], sec = _b[1];
                        if (sec[".type"] === "wifi-device") {
                            deviceMap.set((_c = sec[".name"]) !== null && _c !== void 0 ? _c : "", {
                                standard: sec.hwmode ? hwmodeToStandard(sec.hwmode) : undefined,
                                width: sec.htmode ? htmodeToWidth(sec.htmode) : undefined,
                            });
                        }
                        else if (sec[".type"] === "wifi-iface") {
                            ifaceMap.set((_d = sec.ssid) !== null && _d !== void 0 ? _d : "", {
                                password: sec.key,
                                deviceRef: sec.device,
                            });
                        }
                    }
                    return [4 /*yield*/, Promise.all(ifnames.map(function (ifname) { return luciRpc(ip, token, "/rpc/iwinfo", "info", [ifname]); }))];
                case 2:
                    bssidResults = _f.sent();
                    for (i = 0; i < ifnames.length; i++) {
                        ifname = ifnames[i];
                        info = bssidResults[i];
                        bssid = info === null || info === void 0 ? void 0 : info.bssid;
                        ssid = (_e = info === null || info === void 0 ? void 0 : info.ssid) !== null && _e !== void 0 ? _e : "";
                        ifaceConfig = ifaceMap.get(ssid);
                        devConfig = (ifaceConfig === null || ifaceConfig === void 0 ? void 0 : ifaceConfig.deviceRef) ? deviceMap.get(ifaceConfig.deviceRef) : undefined;
                        result.set(ifname, {
                            bssid: bssid,
                            password: ifaceConfig === null || ifaceConfig === void 0 ? void 0 : ifaceConfig.password,
                            standard: devConfig === null || devConfig === void 0 ? void 0 : devConfig.standard,
                            width: devConfig === null || devConfig === void 0 ? void 0 : devConfig.width,
                        });
                    }
                    return [2 /*return*/, result];
            }
        });
    });
}
function fetchCudyRouter(cfg) {
    return __awaiter(this, void 0, void 0, function () {
        var result, token, stats, _i, _a, w, band, iface, _b, _c, _d, mac, c, wifiConfig, _e, _f, iface, details;
        var _g, _h, _j, _k, _l, _m, _o, _p, _q;
        return __generator(this, function (_r) {
            switch (_r.label) {
                case 0:
                    result = {
                        name: cfg.name,
                        ip: cfg.ip,
                        online: false,
                        firmware: "",
                        uptime: "",
                        interfaces: [],
                    };
                    return [4 /*yield*/, luciLogin(cfg.ip, cfg.password)];
                case 1:
                    token = _r.sent();
                    if (!token)
                        return [2 /*return*/, result];
                    result.online = true;
                    return [4 /*yield*/, luciGetJson(cfg.ip, token, "/admin/status/statistic")];
                case 2:
                    stats = (_r.sent());
                    if (stats === null || stats === void 0 ? void 0 : stats.wifi) {
                        for (_i = 0, _a = stats.wifi; _i < _a.length; _i++) {
                            w = _a[_i];
                            if (!w.up || w.multissid || w.mode !== "Master")
                                continue;
                            band = ((_g = w.channel) !== null && _g !== void 0 ? _g : 0) <= 14 ? "2.4G" : "5G";
                            iface = {
                                ifname: (_h = w.ifname) !== null && _h !== void 0 ? _h : "",
                                ssid: (_j = w.ssid) !== null && _j !== void 0 ? _j : "",
                                band: band,
                                channel: (_k = w.channel) !== null && _k !== void 0 ? _k : 0,
                                bitrate: (_l = w.bitrate) !== null && _l !== void 0 ? _l : 0,
                                clients: [],
                            };
                            if (w.assoclist && typeof w.assoclist === "object") {
                                for (_b = 0, _c = Object.entries(w.assoclist); _b < _c.length; _b++) {
                                    _d = _c[_b], mac = _d[0], c = _d[1];
                                    iface.clients.push({
                                        mac: mac.toUpperCase(),
                                        signal_dbm: -((_m = c.signal) !== null && _m !== void 0 ? _m : 0),
                                        band: band,
                                        ssid: iface.ssid,
                                        tx_rate: (_o = c.tx_rate) !== null && _o !== void 0 ? _o : 0,
                                        rx_rate: (_p = c.rx_rate) !== null && _p !== void 0 ? _p : 0,
                                        inactive_ms: (_q = c.inactive) !== null && _q !== void 0 ? _q : 0,
                                    });
                                }
                            }
                            result.interfaces.push(iface);
                        }
                    }
                    if (!(result.interfaces.length > 0)) return [3 /*break*/, 4];
                    return [4 /*yield*/, fetchWifiConfig(cfg.ip, token, result.interfaces.map(function (i) { return i.ifname; }))];
                case 3:
                    wifiConfig = _r.sent();
                    for (_e = 0, _f = result.interfaces; _e < _f.length; _e++) {
                        iface = _f[_e];
                        details = wifiConfig.get(iface.ifname);
                        if (details) {
                            iface.bssid = details.bssid;
                            iface.password = details.password;
                            iface.standard = details.standard;
                            iface.width = details.width;
                        }
                    }
                    _r.label = 4;
                case 4: return [2 /*return*/, result];
            }
        });
    });
}
function fetchAllCudyRouters() {
    return __awaiter(this, void 0, void 0, function () {
        var configs;
        return __generator(this, function (_a) {
            configs = loadCudyConfig();
            return [2 /*return*/, Promise.all(configs.map(fetchCudyRouter))];
        });
    });
}
function parseBandwidth(raw) {
    if (!Array.isArray(raw))
        return [];
    var rows = raw.filter(function (r) { return Array.isArray(r) && r.length >= 5; });
    var points = [];
    for (var i = 1; i < rows.length; i++) {
        var _a = rows[i - 1], ts0 = _a[0], up0 = _a[1], down0 = _a[3];
        var _b = rows[i], ts1 = _b[0], up1 = _b[1], down1 = _b[3];
        var dtSec = (ts1 - ts0) / 1000000;
        if (dtSec <= 0)
            continue;
        points.push({
            ts: Math.floor(ts1 / 1000000),
            up: Math.round((up1 - up0) / dtSec * 8 / 1000),
            down: Math.round((down1 - down0) / dtSec * 8 / 1000),
        });
    }
    return points;
}
function parseDevlistHtml(html) {
    var _a;
    var rows = (_a = html.match(/<tr id="cbi-table-\d+"[\s\S]*?(?=<tr id="cbi-table-|\s*<\/tbody>)/g)) !== null && _a !== void 0 ? _a : [];
    return rows.map(function (row) {
        var _a, _b, _c, _d;
        var field = function (name) {
            var m = row.match(new RegExp("id=\"cbi-table-\\d+-".concat(name, "\">[\\s\\S]*?<p class=\"form-control-static hidden-xs\">(.*?)<\\/p>"), "s"));
            return m ? m[1].trim() : "";
        };
        var iface = field("iface").replace(/<[^>]+>/g, "").trim();
        var ipmac = field("ipmac");
        var ipmacParts = ipmac.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim().split("\n");
        var ip = (_b = (_a = ipmacParts[0]) === null || _a === void 0 ? void 0 : _a.trim()) !== null && _b !== void 0 ? _b : "";
        var mac = (_d = (_c = ipmacParts[1]) === null || _c === void 0 ? void 0 : _c.trim().toUpperCase()) !== null && _d !== void 0 ? _d : "";
        var speed = field("speed").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "");
        var txMatch = speed.match(/([\d.]+)\s*Kbps/);
        var rxMatch = speed.match(/[\s\S]*([\d.]+)\s*Kbps/);
        var tx_kbps = txMatch ? parseFloat(txMatch[1]) : 0;
        var rx_kbps = rxMatch ? parseFloat(rxMatch[1]) : 0;
        var rawSignal = field("signal").replace(/<[^>]+>/g, "").trim();
        var signal = rawSignal === "---" || rawSignal === "" ? null : rawSignal;
        var duration = field("online").replace(/<[^>]+>/g, "").trim();
        return { iface: iface, ip: ip, mac: mac, tx_kbps: tx_kbps, rx_kbps: rx_kbps, signal: signal, duration: duration };
    }).filter(function (e) { return e.ip !== ""; });
}
function fetchCudyDevlist(cfg) {
    return __awaiter(this, void 0, void 0, function () {
        var token, url, res, _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, luciLogin(cfg.ip, cfg.password)];
                case 1:
                    token = _c.sent();
                    if (!token)
                        return [2 /*return*/, null];
                    url = "http://".concat(cfg.ip, "/cgi-bin/luci/admin/network/devices/devlist");
                    _c.label = 2;
                case 2:
                    _c.trys.push([2, 5, , 6]);
                    return [4 /*yield*/, fetchWithTimeout(url, { headers: { cookie: "sysauth=".concat(token) } })];
                case 3:
                    res = _c.sent();
                    _a = parseDevlistHtml;
                    return [4 /*yield*/, res.text()];
                case 4: return [2 /*return*/, _a.apply(void 0, [_c.sent()])];
                case 5:
                    _b = _c.sent();
                    return [2 /*return*/, null];
                case 6: return [2 /*return*/];
            }
        });
    });
}
function fetchCudyBandwidth(cfg) {
    return __awaiter(this, void 0, void 0, function () {
        var token, _a, ra0Raw, rai0Raw;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, luciLogin(cfg.ip, cfg.password)];
                case 1:
                    token = _b.sent();
                    if (!token)
                        return [2 /*return*/, { ra0: [], rai0: [] }];
                    return [4 /*yield*/, Promise.all([
                            luciGetJson(cfg.ip, token, "/admin/status/bandwidth?iface=ra0"),
                            luciGetJson(cfg.ip, token, "/admin/status/bandwidth?iface=rai0"),
                        ])];
                case 2:
                    _a = _b.sent(), ra0Raw = _a[0], rai0Raw = _a[1];
                    return [2 /*return*/, { ra0: parseBandwidth(ra0Raw), rai0: parseBandwidth(rai0Raw) }];
            }
        });
    });
}
