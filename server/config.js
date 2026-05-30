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
var _a, _b, _c, _d, _e, _f, _g;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BBOX_CONNECT_HOST = exports.BBOX_OVERRIDE_IP = exports.isHttps = exports.targetUrl = exports.VERBOSE = exports.isDev = exports.BASE_PATH = exports.PORT = exports.BBOX_PASSWORD = exports.BBOX_HOST = exports.BBOX_TARGET = exports.SESSIONS_FILE = exports.CONFIG_FILE = void 0;
exports.loadEnvLocal = loadEnvLocal;
exports.loadBboxRouterByName = loadBboxRouterByName;
exports.loadAllRouters = loadAllRouters;
exports.loadUiConfig = loadUiConfig;
var node_fs_1 = require("node:fs");
var yaml_1 = require("yaml");
function loadEnvLocal() {
    try {
        var raw = node_fs_1.default.readFileSync(".env.local", "utf8");
        for (var _i = 0, _a = raw.split("\n"); _i < _a.length; _i++) {
            var line = _a[_i];
            var trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("#"))
                continue;
            var eq = trimmed.indexOf("=");
            if (eq === -1)
                continue;
            var key = trimmed.slice(0, eq).trim();
            var value = trimmed.slice(eq + 1).trim();
            if (!(key in process.env))
                process.env[key] = value;
        }
    }
    catch (_b) {
        // File absent is fine
    }
}
function loadBboxFromConfig() {
    var _a, _b, _c;
    try {
        var raw = node_fs_1.default.readFileSync((_a = process.env.CUDY_CONFIG) !== null && _a !== void 0 ? _a : "config.yaml", "utf8");
        var data = (0, yaml_1.parse)(raw);
        return (_c = ((_b = data.routers) !== null && _b !== void 0 ? _b : []).find(function (r) { return r.type === "bbox" && r.enabled !== false; })) !== null && _c !== void 0 ? _c : {};
    }
    catch (_d) {
        return {};
    }
}
function loadBboxRouterByName(name) {
    var _a, _b;
    try {
        var raw = node_fs_1.default.readFileSync(exports.CONFIG_FILE, "utf8");
        var data = (0, yaml_1.parse)(raw);
        var r = ((_a = data.routers) !== null && _a !== void 0 ? _a : []).find(function (router) { return router.type === "bbox" && router.name === name && router.enabled !== false; });
        if (!(r === null || r === void 0 ? void 0 : r.password))
            return null;
        // Use the same host/target constants as the rest of the server (env var overridable)
        var target = exports.targetUrl;
        var connectHost = (_b = r.ip) !== null && _b !== void 0 ? _b : target.hostname;
        return { name: name, password: r.password, host: exports.BBOX_HOST, connectHost: connectHost, targetUrl: target, isHttps: exports.isHttps };
    }
    catch (_c) {
        return null;
    }
}
var bboxFromConfig = loadBboxFromConfig();
function loadBboxPasswordFromConfig() {
    var _a;
    return (_a = bboxFromConfig.password) !== null && _a !== void 0 ? _a : "";
}
function loadBboxTargetFromConfig() {
    return "https://mabbox.bytel.fr";
}
loadEnvLocal();
exports.CONFIG_FILE = (_a = process.env.CUDY_CONFIG) !== null && _a !== void 0 ? _a : "config.yaml";
exports.SESSIONS_FILE = (_b = process.env.SESSIONS_FILE) !== null && _b !== void 0 ? _b : "sessions.json";
exports.BBOX_TARGET = (_c = process.env.BBOX_TARGET) !== null && _c !== void 0 ? _c : loadBboxTargetFromConfig();
exports.BBOX_HOST = (_d = process.env.BBOX_HOST) !== null && _d !== void 0 ? _d : "mabbox.bytel.fr";
exports.BBOX_PASSWORD = loadBboxPasswordFromConfig();
exports.PORT = parseInt((_e = process.env.PORT) !== null && _e !== void 0 ? _e : "5176", 10);
exports.BASE_PATH = (_f = process.env.BASE_PATH) !== null && _f !== void 0 ? _f : "";
exports.isDev = process.env.NODE_ENV !== "production";
exports.VERBOSE = !!process.env.BBOX_VERBOSE;
exports.targetUrl = new URL(exports.BBOX_TARGET);
exports.isHttps = exports.targetUrl.protocol === "https:";
// When a bbox IP is available in config, connect directly to it (bypasses DNS).
// BBOX_HOST is still used as Host header and TLS SNI so the Bbox accepts the request.
exports.BBOX_OVERRIDE_IP = (_g = bboxFromConfig.ip) !== null && _g !== void 0 ? _g : null;
exports.BBOX_CONNECT_HOST = exports.BBOX_OVERRIDE_IP !== null && exports.BBOX_OVERRIDE_IP !== void 0 ? exports.BBOX_OVERRIDE_IP : exports.targetUrl.hostname;
function loadAllRouters() {
    var _a;
    try {
        var raw = node_fs_1.default.readFileSync(exports.CONFIG_FILE, "utf8");
        var data = (0, yaml_1.parse)(raw);
        return ((_a = data.routers) !== null && _a !== void 0 ? _a : [])
            .filter(function (r) { return r.enabled !== false && r.name && r.type; })
            .map(function (r) { return ({ name: r.name, type: r.type }); });
    }
    catch (_b) {
        return [];
    }
}
function buildDefaultUiConfig() {
    var routers = loadAllRouters();
    var firstBbox = routers.find(function (r) { return r.type === "bbox"; });
    var menu = [
        { id: "home" },
        { id: "bandwidth" },
        { id: "scan" },
        { id: "hotspots" },
        { id: "map" },
    ];
    if (firstBbox) {
        menu.push({ id: "hosts", router: firstBbox.name });
        menu.push({ id: "wifi", router: firstBbox.name });
        menu.push({ id: "dhcp-options", router: firstBbox.name });
        menu.push({ id: "dhcp-reservations", router: firstBbox.name });
    }
    return { menu: menu, home: null, dhcp: firstBbox ? { router: firstBbox.name } : null };
}
function loadUiConfig() {
    var _a, _b, _c;
    try {
        var raw = node_fs_1.default.readFileSync(exports.CONFIG_FILE, "utf8");
        var data = (0, yaml_1.parse)(raw);
        var ui = data.ui;
        var dhcp = ((_a = data.dhcp) === null || _a === void 0 ? void 0 : _a.router) ? { router: data.dhcp.router } : null;
        if (!ui)
            return __assign(__assign({}, buildDefaultUiConfig()), { dhcp: dhcp });
        return {
            menu: (_b = ui.menu) !== null && _b !== void 0 ? _b : null,
            home: ((_c = ui.home) === null || _c === void 0 ? void 0 : _c.widgets) ? { widgets: ui.home.widgets } : null,
            dhcp: dhcp,
        };
    }
    catch (_d) {
        return buildDefaultUiConfig();
    }
}
