#!/usr/bin/env tsx
"use strict";
/**
 * CLI de test local — appelle directement les fonctions internes, sans serveur HTTP.
 * Usage : npm run api -- <commande> [args]
 */
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
var node_fs_1 = require("node:fs");
var node_path_1 = require("node:path");
// ── Session CLI (auth web UI) ──────────────────────────────────────────────────
var SESSION_FILE = node_path_1.default.resolve(".cli-session");
function loadSession() {
    try {
        return node_fs_1.default.readFileSync(SESSION_FILE, "utf8").trim() || null;
    }
    catch (_a) {
        return null;
    }
}
function saveSession(token) { node_fs_1.default.writeFileSync(SESSION_FILE, token); }
function clearSession() { try {
    node_fs_1.default.unlinkSync(SESSION_FILE);
}
catch (_a) { } }
// ── Output helpers ─────────────────────────────────────────────────────────────
function print(data) {
    console.log(JSON.stringify(data, null, 2));
}
function die(msg) {
    console.error(msg);
    process.exit(1);
}
// ── Auth (web UI) ──────────────────────────────────────────────────────────────
function ensureAuth() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, isAuthEnabled, login, getWebSession, token, parseYaml, CONFIG_FILE, config, cliUser, cliPass, newToken;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require("../server/auth.ts"); })];
                case 1:
                    _a = _b.sent(), isAuthEnabled = _a.isAuthEnabled, login = _a.login, getWebSession = _a.getSession;
                    if (!isAuthEnabled())
                        return [2 /*return*/];
                    token = loadSession();
                    if (token && getWebSession(token))
                        return [2 /*return*/];
                    return [4 /*yield*/, Promise.resolve().then(function () { return require("yaml"); })];
                case 2:
                    parseYaml = (_b.sent()).parse;
                    return [4 /*yield*/, Promise.resolve().then(function () { return require("../server/config.ts"); })];
                case 3:
                    CONFIG_FILE = (_b.sent()).CONFIG_FILE;
                    config = {};
                    try {
                        config = parseYaml(node_fs_1.default.readFileSync(CONFIG_FILE, "utf8"));
                    }
                    catch (_c) { }
                    cliUser = config.cli_user;
                    cliPass = config.cli_password;
                    if (!cliUser || !cliPass) {
                        console.warn("[auth] Auth activée mais cli_password absent de config.yaml — continuons sans session.");
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, login(cliUser, cliPass)];
                case 4:
                    newToken = _b.sent();
                    if (!newToken)
                        die("[auth] Login échoué.");
                    saveSession(newToken);
                    console.error("[auth] Connect\u00E9 en tant que ".concat(cliUser));
                    return [2 /*return*/];
            }
        });
    });
}
// ── Commands ──────────────────────────────────────────────────────────────────
var args = process.argv.slice(2);
var cmd = args[0];
function usage() {
    console.log("\nUsage: npm run api -- <command> [args]\n\nServeur:\n  health                              Session bbox + target\n  me                                  Utilisateur web UI connect\u00E9\n  login <user> <password>             Connexion web UI\n  logout                              D\u00E9connexion web UI\n  hosts                               Tous les h\u00F4tes (tous plugins)\n  routers                             Routeurs configur\u00E9s\n  ui-config                           Configuration UI\n  map                                 Topologie r\u00E9seau\n  scan [subnet]                       Scan r\u00E9seau (CIDR, ex: 192.168.1.0/24)\n  ping <ip1,ip2,...>                  Ping une fois chaque IP\n  check-ip <ip>                       Ping + ARP lookup\n  oui <mac>                           Vendor OUI\n\nBbox (routerId = nom dans config.yaml) :\n  bbox <routerId> wireless\n  bbox <routerId> wifi-settings\n  bbox <routerId> hosts\n  bbox <routerId> device\n  bbox <routerId> wan/stats\n  bbox <routerId> wan/graphs\n  bbox <routerId> dhcp/config\n  bbox <routerId> dhcp/config PUT '{...}'\n  bbox <routerId> dhcp/clients\n  bbox <routerId> dhcp/clients POST '{...}'\n  bbox <routerId> dhcp/clients/<id> PUT '{...}'\n  bbox <routerId> dhcp/clients/<id> DELETE\n  bbox <routerId> dhcp/options\n  bbox <routerId> dhcp/options POST '{...}'\n  bbox <routerId> dhcp/options/<id> PUT '{...}'\n  bbox <routerId> dhcp/options/<id> DELETE\n\nAirport:\n  airport status\n  airport <routerId> hosts|wifi-settings|wireless|raw-props|device-info|acp-debug\n\nKuwfi:\n  kuwfi status\n  kuwfi <routerId> [bandwidth]\n\nNestwifi:\n  nestwifi status\n  nestwifi <routerId>\n\nCudy:\n  cudy status\n  cudy <routerId> [bandwidth]\n");
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var getSession, BBOX_TARGET, user, pass, login, token, token, deleteSession, _a, isAuthEnabled, getWebSession, token, session, loadAllRouters, loadUiConfig, mac, lookupVendor, oui, _b, ip, checkIp, _c, ipsParam, ips, pingOnce_1, results, _d, runScan, detectSubnet, subnet, ac_1, loadPlugins, fetchAllHosts, plugins, _e, loadPlugins, plugins, hostnameMap_1, ipMap_1, segments, routerId, subpath, method, bodyArg, _f, resolveSpec, bboxCall, spec, fetchBboxWireless, _g, fetchBboxHosts, _h, fetchBboxDevice, _j, fetchBboxWan, _k, fetchBboxWanGraphs, _l, fetchBboxWifiSettings, _m, _o, extractConfig, extractClients, extractOptions, prepareDhcpClientBody, body, r, r, body, r, r, body, r, r, clientMatch, id, r, body, r, optMatch, id, r, body, r, routerOrStatus_1, _p, loadAirportConfig, fetchAirportRouter, fetchAirportWifiSettings, _q, fetchAcpRawProps, fetchAcpWireless, _r, fetchAcpDeviceInfo, acpProbe, configs, cfg, subpath, _s, _t, _u, _v, _w, _x, routerOrStatus_2, _y, loadKuwfiConfig, fetchKuwfiRouter, fetchKuwfiBandwidth, cfg, subpath, _z, _0, routerOrStatus_3, _1, loadNestWifiConfig, fetchNestWifiRouter, cfg, _2, routerOrStatus_4, _3, loadCudyConfig, fetchCudyRouter, fetchCudyBandwidth, cfg, subpath, _4, _5;
        var _6, _7;
        var _this = this;
        var _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18;
        return __generator(this, function (_19) {
            switch (_19.label) {
                case 0:
                    if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") {
                        usage();
                        return [2 /*return*/];
                    }
                    if (!(cmd === "health")) return [3 /*break*/, 3];
                    return [4 /*yield*/, Promise.resolve().then(function () { return require("../server/session.ts"); })];
                case 1:
                    getSession = (_19.sent()).getSession;
                    return [4 /*yield*/, Promise.resolve().then(function () { return require("../server/config.ts"); })];
                case 2:
                    BBOX_TARGET = (_19.sent()).BBOX_TARGET;
                    print({ ok: true, hasSession: getSession() !== null, target: BBOX_TARGET });
                    return [2 /*return*/];
                case 3:
                    if (!(cmd === "login")) return [3 /*break*/, 6];
                    user = args[1];
                    pass = args[2];
                    if (!user || !pass)
                        die("Usage: api login <username> <password>");
                    return [4 /*yield*/, Promise.resolve().then(function () { return require("../server/auth.ts"); })];
                case 4:
                    login = (_19.sent()).login;
                    return [4 /*yield*/, login(user, pass)];
                case 5:
                    token = _19.sent();
                    if (!token)
                        die("Login échoué.");
                    saveSession(token);
                    print({ ok: true, username: user });
                    return [2 /*return*/];
                case 6:
                    if (!(cmd === "logout")) return [3 /*break*/, 9];
                    token = loadSession();
                    if (!token) return [3 /*break*/, 8];
                    return [4 /*yield*/, Promise.resolve().then(function () { return require("../server/auth.ts"); })];
                case 7:
                    deleteSession = (_19.sent()).deleteSession;
                    deleteSession(token);
                    _19.label = 8;
                case 8:
                    clearSession();
                    print({ ok: true });
                    return [2 /*return*/];
                case 9: 
                // ── Authenticated commands ───────────────────────────────────────────────────
                return [4 /*yield*/, ensureAuth()];
                case 10:
                    // ── Authenticated commands ───────────────────────────────────────────────────
                    _19.sent();
                    if (!(cmd === "me")) return [3 /*break*/, 12];
                    return [4 /*yield*/, Promise.resolve().then(function () { return require("../server/auth.ts"); })];
                case 11:
                    _a = _19.sent(), isAuthEnabled = _a.isAuthEnabled, getWebSession = _a.getSession;
                    if (!isAuthEnabled()) {
                        print({ username: null, authEnabled: false });
                        return [2 /*return*/];
                    }
                    token = loadSession();
                    session = token ? getWebSession(token) : null;
                    if (!session)
                        die("Non authentifié.");
                    print({ username: session.username, authEnabled: true });
                    return [2 /*return*/];
                case 12:
                    if (!(cmd === "routers")) return [3 /*break*/, 14];
                    return [4 /*yield*/, Promise.resolve().then(function () { return require("../server/config.ts"); })];
                case 13:
                    loadAllRouters = (_19.sent()).loadAllRouters;
                    print(loadAllRouters());
                    return [2 /*return*/];
                case 14:
                    if (!(cmd === "ui-config")) return [3 /*break*/, 16];
                    return [4 /*yield*/, Promise.resolve().then(function () { return require("../server/config.ts"); })];
                case 15:
                    loadUiConfig = (_19.sent()).loadUiConfig;
                    print(loadUiConfig());
                    return [2 /*return*/];
                case 16:
                    if (!(cmd === "oui")) return [3 /*break*/, 19];
                    mac = args[1];
                    if (!mac)
                        die("Usage: api oui <mac>");
                    return [4 /*yield*/, Promise.resolve().then(function () { return require("../server/mac-vendor.ts"); })];
                case 17:
                    lookupVendor = (_19.sent()).lookupVendor;
                    oui = mac.toUpperCase().replace(/[^0-9A-F]/g, "").slice(0, 6);
                    if (oui.length < 6)
                        die("MAC invalide.");
                    _b = print;
                    _6 = {};
                    return [4 /*yield*/, lookupVendor(oui)];
                case 18:
                    _b.apply(void 0, [(_6.vendor = _19.sent(), _6)]);
                    return [2 /*return*/];
                case 19:
                    if (!(cmd === "check-ip")) return [3 /*break*/, 22];
                    ip = args[1];
                    if (!ip)
                        die("Usage: api check-ip <ip>");
                    if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(ip))
                        die("IP invalide.");
                    return [4 /*yield*/, Promise.resolve().then(function () { return require("../server/routes/check-ip.ts"); })];
                case 20:
                    checkIp = (_19.sent()).checkIp;
                    _c = print;
                    return [4 /*yield*/, checkIp(ip)];
                case 21:
                    _c.apply(void 0, [_19.sent()]);
                    return [2 /*return*/];
                case 22:
                    if (!(cmd === "ping")) return [3 /*break*/, 25];
                    ipsParam = args[1];
                    if (!ipsParam)
                        die("Usage: api ping <ip1,ip2,...>");
                    ips = ipsParam.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
                    return [4 /*yield*/, Promise.resolve().then(function () { return require("../server/routes/ping.ts"); })];
                case 23:
                    pingOnce_1 = (_19.sent()).pingOnce;
                    return [4 /*yield*/, Promise.all(ips.map(function (ip) { return __awaiter(_this, void 0, void 0, function () {
                            var _a;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        _a = { ip: ip };
                                        return [4 /*yield*/, pingOnce_1(ip)];
                                    case 1: return [2 /*return*/, (_a.rtt = _b.sent(), _a)];
                                }
                            });
                        }); }))];
                case 24:
                    results = _19.sent();
                    print(results);
                    return [2 /*return*/];
                case 25:
                    if (!(cmd === "scan")) return [3 /*break*/, 28];
                    return [4 /*yield*/, Promise.resolve().then(function () { return require("../server/network-scan.ts"); })];
                case 26:
                    _d = _19.sent(), runScan = _d.runScan, detectSubnet = _d.detectSubnet;
                    subnet = (_8 = args.find(function (a) { return a !== "scan" && !a.startsWith("-"); })) !== null && _8 !== void 0 ? _8 : detectSubnet();
                    ac_1 = new AbortController();
                    process.on("SIGINT", function () { return ac_1.abort(); });
                    return [4 /*yield*/, runScan(subnet, function (event, data) {
                            console.log("[".concat(event, "] ").concat(data));
                        }, ac_1.signal)];
                case 27:
                    _19.sent();
                    return [2 /*return*/];
                case 28:
                    if (!(cmd === "hosts")) return [3 /*break*/, 33];
                    return [4 /*yield*/, Promise.resolve().then(function () { return require("../server/plugins.ts"); })];
                case 29:
                    loadPlugins = (_19.sent()).loadPlugins;
                    return [4 /*yield*/, Promise.resolve().then(function () { return require("../server/routes/hosts.ts"); })];
                case 30:
                    fetchAllHosts = (_19.sent()).fetchAllHosts;
                    return [4 /*yield*/, loadPlugins()];
                case 31:
                    plugins = _19.sent();
                    _e = print;
                    return [4 /*yield*/, fetchAllHosts(plugins)];
                case 32:
                    _e.apply(void 0, [_19.sent()]);
                    return [2 /*return*/];
                case 33:
                    if (!(cmd === "map")) return [3 /*break*/, 39];
                    return [4 /*yield*/, Promise.resolve().then(function () { return require("../server/plugins.ts"); })];
                case 34:
                    loadPlugins = (_19.sent()).loadPlugins;
                    return [4 /*yield*/, loadPlugins()];
                case 35:
                    plugins = _19.sent();
                    hostnameMap_1 = new Map();
                    ipMap_1 = new Map();
                    return [4 /*yield*/, Promise.all(plugins.map(function (p) { return __awaiter(_this, void 0, void 0, function () {
                            var m, _i, m_1, _a, k, v;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        if (!p.fetchHostnames) return [3 /*break*/, 2];
                                        return [4 /*yield*/, p.fetchHostnames()];
                                    case 1:
                                        m = _b.sent();
                                        for (_i = 0, m_1 = m; _i < m_1.length; _i++) {
                                            _a = m_1[_i], k = _a[0], v = _a[1];
                                            hostnameMap_1.set(k, v);
                                        }
                                        _b.label = 2;
                                    case 2: return [2 /*return*/];
                                }
                            });
                        }); }))];
                case 36:
                    _19.sent();
                    return [4 /*yield*/, Promise.all(plugins.map(function (p) { return __awaiter(_this, void 0, void 0, function () {
                            var hosts, _i, hosts_1, h;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        if (!p.fetchHosts) return [3 /*break*/, 2];
                                        return [4 /*yield*/, p.fetchHosts()];
                                    case 1:
                                        hosts = (_a.sent()).hosts;
                                        for (_i = 0, hosts_1 = hosts; _i < hosts_1.length; _i++) {
                                            h = hosts_1[_i];
                                            if (h.ip)
                                                ipMap_1.set(h.mac.toUpperCase(), h.ip);
                                        }
                                        _a.label = 2;
                                    case 2: return [2 /*return*/];
                                }
                            });
                        }); }))];
                case 37:
                    _19.sent();
                    return [4 /*yield*/, Promise.all(plugins.filter(function (p) { return p.fetchTopologySegments; }).map(function (p) { return p.fetchTopologySegments(hostnameMap_1, ipMap_1); }))];
                case 38:
                    segments = (_19.sent()).flat();
                    print({ segments: segments });
                    return [2 /*return*/];
                case 39:
                    if (!(cmd === "bbox")) return [3 /*break*/, 85];
                    routerId = args[1];
                    subpath = args[2];
                    method = ((_9 = args[3]) !== null && _9 !== void 0 ? _9 : "GET").toUpperCase();
                    bodyArg = args[4];
                    if (!routerId || !subpath)
                        die("Usage: api bbox <routerId> <subpath> [method] [body-json]");
                    return [4 /*yield*/, Promise.resolve().then(function () { return require("../plugins/bbox/server/client.ts"); })];
                case 40:
                    _f = _19.sent(), resolveSpec = _f.resolveSpec, bboxCall = _f.bboxCall;
                    spec = resolveSpec(routerId);
                    if (!spec)
                        die("Routeur '".concat(routerId, "' non trouv\u00E9 dans config.yaml"));
                    if (!(subpath === "wireless")) return [3 /*break*/, 43];
                    return [4 /*yield*/, Promise.resolve().then(function () { return require("../plugins/bbox/server/routes/wireless.ts"); })];
                case 41:
                    fetchBboxWireless = (_19.sent()).fetchBboxWireless;
                    _g = print;
                    return [4 /*yield*/, fetchBboxWireless(spec)];
                case 42:
                    _g.apply(void 0, [_19.sent()]);
                    return [2 /*return*/];
                case 43:
                    if (!(subpath === "hosts")) return [3 /*break*/, 46];
                    return [4 /*yield*/, Promise.resolve().then(function () { return require("../plugins/bbox/server/routes/hosts.ts"); })];
                case 44:
                    fetchBboxHosts = (_19.sent()).fetchBboxHosts;
                    _h = print;
                    return [4 /*yield*/, fetchBboxHosts(spec)];
                case 45:
                    _h.apply(void 0, [_19.sent()]);
                    return [2 /*return*/];
                case 46:
                    if (!(subpath === "device")) return [3 /*break*/, 49];
                    return [4 /*yield*/, Promise.resolve().then(function () { return require("../plugins/bbox/server/routes/device.ts"); })];
                case 47:
                    fetchBboxDevice = (_19.sent()).fetchBboxDevice;
                    _j = print;
                    return [4 /*yield*/, fetchBboxDevice(spec)];
                case 48:
                    _j.apply(void 0, [_19.sent()]);
                    return [2 /*return*/];
                case 49:
                    if (!(subpath === "wan/stats")) return [3 /*break*/, 52];
                    return [4 /*yield*/, Promise.resolve().then(function () { return require("../plugins/bbox/server/routes/wan.ts"); })];
                case 50:
                    fetchBboxWan = (_19.sent()).fetchBboxWan;
                    _k = print;
                    return [4 /*yield*/, fetchBboxWan(spec)];
                case 51:
                    _k.apply(void 0, [_19.sent()]);
                    return [2 /*return*/];
                case 52:
                    if (!(subpath === "wan/graphs")) return [3 /*break*/, 55];
                    return [4 /*yield*/, Promise.resolve().then(function () { return require("../plugins/bbox/server/routes/wanGraphs.ts"); })];
                case 53:
                    fetchBboxWanGraphs = (_19.sent()).fetchBboxWanGraphs;
                    _l = print;
                    return [4 /*yield*/, fetchBboxWanGraphs(spec)];
                case 54:
                    _l.apply(void 0, [_19.sent()]);
                    return [2 /*return*/];
                case 55:
                    if (!(subpath === "wifi-settings")) return [3 /*break*/, 58];
                    return [4 /*yield*/, Promise.resolve().then(function () { return require("../plugins/bbox/server/routes/wifiSettings.ts"); })];
                case 56:
                    fetchBboxWifiSettings = (_19.sent()).fetchBboxWifiSettings;
                    _m = print;
                    return [4 /*yield*/, fetchBboxWifiSettings(spec)];
                case 57:
                    _m.apply(void 0, [_19.sent()]);
                    return [2 /*return*/];
                case 58: return [4 /*yield*/, Promise.resolve().then(function () { return require("../plugins/bbox/server/routes/dhcp.ts"); })];
                case 59:
                    _o = _19.sent(), extractConfig = _o.extractConfig, extractClients = _o.extractClients, extractOptions = _o.extractOptions, prepareDhcpClientBody = _o.prepareDhcpClientBody;
                    if (!(subpath === "dhcp/config")) return [3 /*break*/, 64];
                    if (!(method === "PUT")) return [3 /*break*/, 61];
                    body = bodyArg ? JSON.parse(bodyArg) : {};
                    return [4 /*yield*/, bboxCall(spec, "PUT", "/api/v1/dhcp", body)];
                case 60:
                    r = _19.sent();
                    print({ statusCode: r.statusCode });
                    return [3 /*break*/, 63];
                case 61: return [4 /*yield*/, bboxCall(spec, "GET", "/api/v1/dhcp")];
                case 62:
                    r = _19.sent();
                    print({ config: extractConfig(r.data) });
                    _19.label = 63;
                case 63: return [2 /*return*/];
                case 64:
                    if (!(subpath === "dhcp/clients")) return [3 /*break*/, 69];
                    if (!(method === "POST")) return [3 /*break*/, 66];
                    body = bodyArg ? JSON.parse(bodyArg) : {};
                    return [4 /*yield*/, bboxCall(spec, "POST", "/api/v1/dhcp/clients", prepareDhcpClientBody(body))];
                case 65:
                    r = _19.sent();
                    print({ statusCode: r.statusCode });
                    return [3 /*break*/, 68];
                case 66: return [4 /*yield*/, bboxCall(spec, "GET", "/api/v1/dhcp/clients")];
                case 67:
                    r = _19.sent();
                    print({ clients: extractClients(r.data) });
                    _19.label = 68;
                case 68: return [2 /*return*/];
                case 69:
                    if (!(subpath === "dhcp/options")) return [3 /*break*/, 74];
                    if (!(method === "POST")) return [3 /*break*/, 71];
                    body = bodyArg ? JSON.parse(bodyArg) : {};
                    return [4 /*yield*/, bboxCall(spec, "POST", "/api/v1/dhcp/option", {
                            option: (_10 = body.option) !== null && _10 !== void 0 ? _10 : 0,
                            value: (_11 = body.value) !== null && _11 !== void 0 ? _11 : "",
                        })];
                case 70:
                    r = _19.sent();
                    print({ statusCode: r.statusCode });
                    return [3 /*break*/, 73];
                case 71: return [4 /*yield*/, bboxCall(spec, "GET", "/api/v1/dhcp/options")];
                case 72:
                    r = _19.sent();
                    print(extractOptions(r.data));
                    _19.label = 73;
                case 73: return [2 /*return*/];
                case 74:
                    clientMatch = subpath.match(/^dhcp\/clients\/(\d+)$/);
                    if (!clientMatch) return [3 /*break*/, 79];
                    id = clientMatch[1];
                    if (!(method === "DELETE")) return [3 /*break*/, 76];
                    return [4 /*yield*/, bboxCall(spec, "DELETE", "/api/v1/dhcp/clients/".concat(id))];
                case 75:
                    r = _19.sent();
                    print({ statusCode: r.statusCode });
                    return [3 /*break*/, 78];
                case 76:
                    body = bodyArg ? JSON.parse(bodyArg) : {};
                    return [4 /*yield*/, bboxCall(spec, "PUT", "/api/v1/dhcp/clients/".concat(id), prepareDhcpClientBody(body))];
                case 77:
                    r = _19.sent();
                    print({ statusCode: r.statusCode });
                    _19.label = 78;
                case 78: return [2 /*return*/];
                case 79:
                    optMatch = subpath.match(/^dhcp\/options\/(\d+)$/);
                    if (!optMatch) return [3 /*break*/, 84];
                    id = optMatch[1];
                    if (!(method === "DELETE")) return [3 /*break*/, 81];
                    return [4 /*yield*/, bboxCall(spec, "DELETE", "/api/v1/dhcp/options/".concat(id))];
                case 80:
                    r = _19.sent();
                    print({ statusCode: r.statusCode });
                    return [3 /*break*/, 83];
                case 81:
                    body = bodyArg ? JSON.parse(bodyArg) : {};
                    return [4 /*yield*/, bboxCall(spec, "PUT", "/api/v1/dhcp/options/".concat(id), {
                            enable: 1,
                            name: (_12 = body.option) !== null && _12 !== void 0 ? _12 : 0,
                            format: "",
                            value: (_13 = body.value) !== null && _13 !== void 0 ? _13 : "",
                        })];
                case 82:
                    r = _19.sent();
                    print({ statusCode: r.statusCode });
                    _19.label = 83;
                case 83: return [2 /*return*/];
                case 84:
                    die("Sous-chemin bbox inconnu : ".concat(subpath));
                    _19.label = 85;
                case 85:
                    if (!(cmd === "airport")) return [3 /*break*/, 101];
                    routerOrStatus_1 = args[1];
                    if (!routerOrStatus_1)
                        die("Usage: api airport status | api airport <routerId> <subpath>");
                    return [4 /*yield*/, Promise.resolve().then(function () { return require("../plugins/airport/server/fetcher.ts"); })];
                case 86:
                    _p = _19.sent(), loadAirportConfig = _p.loadAirportConfig, fetchAirportRouter = _p.fetchAirportRouter, fetchAirportWifiSettings = _p.fetchAirportWifiSettings;
                    return [4 /*yield*/, Promise.resolve().then(function () { return require("../plugins/airport/server/acp-client.ts"); })];
                case 87:
                    _q = _19.sent(), fetchAcpRawProps = _q.fetchAcpRawProps, fetchAcpWireless = _q.fetchAcpWireless;
                    return [4 /*yield*/, Promise.resolve().then(function () { return require("../plugins/airport/server/acp.ts"); })];
                case 88:
                    _r = _19.sent(), fetchAcpDeviceInfo = _r.fetchAcpDeviceInfo, acpProbe = _r.acpProbe;
                    if (routerOrStatus_1 === "status") {
                        configs = loadAirportConfig();
                        print({ routers: configs.map(function (c) { return ({ name: c.name, ip: c.ip }); }) });
                        return [2 /*return*/];
                    }
                    cfg = loadAirportConfig().find(function (r) { return r.name === routerOrStatus_1; });
                    if (!cfg)
                        die("Router airport '".concat(routerOrStatus_1, "' non trouv\u00E9"));
                    subpath = (_14 = args[2]) !== null && _14 !== void 0 ? _14 : "hosts";
                    if (!(subpath === "hosts")) return [3 /*break*/, 90];
                    _s = print;
                    return [4 /*yield*/, fetchAirportRouter(cfg)];
                case 89:
                    _s.apply(void 0, [_19.sent()]);
                    return [2 /*return*/];
                case 90:
                    if (!(subpath === "wifi-settings")) return [3 /*break*/, 92];
                    _t = print;
                    return [4 /*yield*/, fetchAirportWifiSettings(cfg)];
                case 91:
                    _t.apply(void 0, [_19.sent()]);
                    return [2 /*return*/];
                case 92:
                    if (!(subpath === "wireless")) return [3 /*break*/, 94];
                    _u = print;
                    return [4 /*yield*/, fetchAcpWireless(cfg.ip, (_15 = cfg.password) !== null && _15 !== void 0 ? _15 : "")];
                case 93:
                    _u.apply(void 0, [_19.sent()]);
                    return [2 /*return*/];
                case 94:
                    if (!(subpath === "raw-props")) return [3 /*break*/, 96];
                    _v = print;
                    return [4 /*yield*/, fetchAcpRawProps(cfg.ip, (_16 = cfg.password) !== null && _16 !== void 0 ? _16 : "")];
                case 95:
                    _v.apply(void 0, [_19.sent()]);
                    return [2 /*return*/];
                case 96:
                    if (!(subpath === "device-info")) return [3 /*break*/, 98];
                    _w = print;
                    return [4 /*yield*/, fetchAcpDeviceInfo(cfg.ip)];
                case 97:
                    _w.apply(void 0, [_19.sent()]);
                    return [2 /*return*/];
                case 98:
                    if (!(subpath === "acp-debug")) return [3 /*break*/, 100];
                    _x = print;
                    _7 = {};
                    return [4 /*yield*/, acpProbe(cfg.ip)];
                case 99:
                    _x.apply(void 0, [(_7.exchanges = _19.sent(), _7)]);
                    return [2 /*return*/];
                case 100:
                    die("Sous-chemin airport inconnu : ".concat(subpath));
                    _19.label = 101;
                case 101:
                    if (!(cmd === "kuwfi")) return [3 /*break*/, 106];
                    routerOrStatus_2 = args[1];
                    if (!routerOrStatus_2)
                        die("Usage: api kuwfi status | api kuwfi <routerId> [bandwidth]");
                    return [4 /*yield*/, Promise.resolve().then(function () { return require("../plugins/kuwfi/server/fetcher.ts"); })];
                case 102:
                    _y = _19.sent(), loadKuwfiConfig = _y.loadKuwfiConfig, fetchKuwfiRouter = _y.fetchKuwfiRouter, fetchKuwfiBandwidth = _y.fetchKuwfiBandwidth;
                    if (routerOrStatus_2 === "status") {
                        print({ routers: loadKuwfiConfig().map(function (c) { return ({ name: c.name, ip: c.ip }); }) });
                        return [2 /*return*/];
                    }
                    cfg = loadKuwfiConfig().find(function (r) { return r.name === routerOrStatus_2; });
                    if (!cfg)
                        die("Router kuwfi '".concat(routerOrStatus_2, "' non trouv\u00E9"));
                    subpath = (_17 = args[2]) !== null && _17 !== void 0 ? _17 : "";
                    if (!(subpath === "bandwidth")) return [3 /*break*/, 104];
                    _z = print;
                    return [4 /*yield*/, fetchKuwfiBandwidth(cfg)];
                case 103:
                    _z.apply(void 0, [_19.sent()]);
                    return [2 /*return*/];
                case 104:
                    _0 = print;
                    return [4 /*yield*/, fetchKuwfiRouter(cfg)];
                case 105:
                    _0.apply(void 0, [_19.sent()]);
                    return [2 /*return*/];
                case 106:
                    if (!(cmd === "nestwifi")) return [3 /*break*/, 109];
                    routerOrStatus_3 = args[1];
                    if (!routerOrStatus_3)
                        die("Usage: api nestwifi status | api nestwifi <routerId>");
                    return [4 /*yield*/, Promise.resolve().then(function () { return require("../plugins/nestwifi/server/fetcher.ts"); })];
                case 107:
                    _1 = _19.sent(), loadNestWifiConfig = _1.loadNestWifiConfig, fetchNestWifiRouter = _1.fetchNestWifiRouter;
                    if (routerOrStatus_3 === "status") {
                        print({ routers: loadNestWifiConfig().map(function (c) { return ({ name: c.name, ip: c.ip }); }) });
                        return [2 /*return*/];
                    }
                    cfg = loadNestWifiConfig().find(function (r) { return r.name === routerOrStatus_3; });
                    if (!cfg)
                        die("Router nestwifi '".concat(routerOrStatus_3, "' non trouv\u00E9"));
                    _2 = print;
                    return [4 /*yield*/, fetchNestWifiRouter(cfg)];
                case 108:
                    _2.apply(void 0, [_19.sent()]);
                    return [2 /*return*/];
                case 109:
                    if (!(cmd === "cudy")) return [3 /*break*/, 114];
                    routerOrStatus_4 = args[1];
                    if (!routerOrStatus_4)
                        die("Usage: api cudy status | api cudy <routerId> [bandwidth]");
                    return [4 /*yield*/, Promise.resolve().then(function () { return require("../plugins/cudy/server/fetcher.ts"); })];
                case 110:
                    _3 = _19.sent(), loadCudyConfig = _3.loadCudyConfig, fetchCudyRouter = _3.fetchCudyRouter, fetchCudyBandwidth = _3.fetchCudyBandwidth;
                    if (routerOrStatus_4 === "status") {
                        print({ routers: loadCudyConfig().map(function (c) { return ({ name: c.name, ip: c.ip }); }) });
                        return [2 /*return*/];
                    }
                    cfg = loadCudyConfig().find(function (r) { return r.name === routerOrStatus_4; });
                    if (!cfg)
                        die("Router cudy '".concat(routerOrStatus_4, "' non trouv\u00E9"));
                    subpath = (_18 = args[2]) !== null && _18 !== void 0 ? _18 : "";
                    if (!(subpath === "bandwidth")) return [3 /*break*/, 112];
                    _4 = print;
                    return [4 /*yield*/, fetchCudyBandwidth(cfg)];
                case 111:
                    _4.apply(void 0, [_19.sent()]);
                    return [2 /*return*/];
                case 112:
                    _5 = print;
                    return [4 /*yield*/, fetchCudyRouter(cfg)];
                case 113:
                    _5.apply(void 0, [_19.sent()]);
                    return [2 /*return*/];
                case 114:
                    console.error("Commande inconnue : ".concat(cmd));
                    usage();
                    process.exit(1);
                    return [2 /*return*/];
            }
        });
    });
}
main().catch(function (err) {
    console.error("Erreur:", err.message);
    process.exit(1);
});
