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
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchBboxWireless = fetchBboxWireless;
exports.handleWireless = handleWireless;
var client_ts_1 = require("../client.ts");
var utils_ts_1 = require("../utils.ts");
function makeClients(stations) {
    if (stations === void 0) { stations = []; }
    return stations
        .filter(function (s) { return s.macaddress; })
        .map(function (s) { return ({
        mac: s.macaddress,
        signal_dbm: Number(s.rssi) || 0,
        tx_kbps: Math.round((Number(s.txRate) || 0) * 1000),
        rx_kbps: Math.round((Number(s.rxRate) || 0) * 1000),
        inactive_ms: 0,
    }); });
}
function fetchBboxWireless(spec) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, wirelessResult, hostsResult, hostsArr, wirelessArr, wirelessHosts, wirelessConfig, ssids, radios, main, guestEntries, compatEntries, bandKeys, bandLabels, accessPoints, i, entry, clients, bk, band, _i, guestEntries_1, entry, clients, _b, compatEntries_1, entry, clients;
        var _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x;
        return __generator(this, function (_y) {
            switch (_y.label) {
                case 0: return [4 /*yield*/, Promise.all([
                        (0, client_ts_1.bboxCall)(spec, "GET", "/api/v1/wireless"),
                        (0, client_ts_1.bboxCall)(spec, "GET", "/api/v1/hosts"),
                    ])];
                case 1:
                    _a = _y.sent(), wirelessResult = _a[0], hostsResult = _a[1];
                    if (wirelessResult.statusCode !== 200 || hostsResult.statusCode !== 200) {
                        return [2 /*return*/, { online: false, accessPoints: [] }];
                    }
                    hostsArr = hostsResult.data;
                    wirelessArr = wirelessResult.data;
                    wirelessHosts = (_d = (_c = hostsArr[0]) === null || _c === void 0 ? void 0 : _c.wirelesshosts) !== null && _d !== void 0 ? _d : [];
                    wirelessConfig = (_e = wirelessArr[0]) === null || _e === void 0 ? void 0 : _e.wireless;
                    ssids = (_f = wirelessConfig === null || wirelessConfig === void 0 ? void 0 : wirelessConfig.ssid) !== null && _f !== void 0 ? _f : {};
                    radios = (_g = wirelessConfig === null || wirelessConfig === void 0 ? void 0 : wirelessConfig.radio) !== null && _g !== void 0 ? _g : {};
                    main = wirelessHosts.filter(function (e) { return !e.guest && !e.compatibility; });
                    guestEntries = wirelessHosts.filter(function (e) { return e.guest; });
                    compatEntries = wirelessHosts.filter(function (e) { return e.compatibility; });
                    bandKeys = ["24", "5"];
                    bandLabels = ["2.4G", "5G"];
                    accessPoints = [];
                    for (i = 0; i < main.length; i++) {
                        entry = main[i];
                        clients = makeClients(entry.stations);
                        if (clients.length === 0)
                            continue;
                        bk = (_h = bandKeys[i]) !== null && _h !== void 0 ? _h : "5";
                        band = (_j = bandLabels[i]) !== null && _j !== void 0 ? _j : "5G";
                        accessPoints.push({
                            ssid: (_m = (_l = (_k = ssids[bk]) === null || _k === void 0 ? void 0 : _k.id) !== null && _l !== void 0 ? _l : entry.ssid) !== null && _m !== void 0 ? _m : "",
                            band: band,
                            channel: (_p = (_o = radios[bk]) === null || _o === void 0 ? void 0 : _o.current_channel) !== null && _p !== void 0 ? _p : 0,
                            clients: clients,
                        });
                    }
                    for (_i = 0, guestEntries_1 = guestEntries; _i < guestEntries_1.length; _i++) {
                        entry = guestEntries_1[_i];
                        clients = makeClients(entry.stations);
                        if (clients.length === 0)
                            continue;
                        accessPoints.push({
                            ssid: (_s = (_r = (_q = ssids.guest) === null || _q === void 0 ? void 0 : _q.id) !== null && _r !== void 0 ? _r : entry.ssid) !== null && _s !== void 0 ? _s : "Guest",
                            band: "2.4G",
                            channel: (_u = (_t = radios["24"]) === null || _t === void 0 ? void 0 : _t.current_channel) !== null && _u !== void 0 ? _u : 0,
                            clients: clients,
                        });
                    }
                    for (_b = 0, compatEntries_1 = compatEntries; _b < compatEntries_1.length; _b++) {
                        entry = compatEntries_1[_b];
                        clients = makeClients(entry.stations);
                        if (clients.length === 0)
                            continue;
                        accessPoints.push({
                            ssid: (_x = (_w = (_v = ssids.compatibility) === null || _v === void 0 ? void 0 : _v.id) !== null && _w !== void 0 ? _w : entry.ssid) !== null && _x !== void 0 ? _x : "Compatibility",
                            band: "2.4G",
                            channel: 0,
                            clients: clients,
                        });
                    }
                    return [2 /*return*/, { online: true, accessPoints: accessPoints }];
            }
        });
    });
}
function handleWireless(_req, res, spec) {
    return __awaiter(this, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetchBboxWireless(spec)];
                case 1:
                    result = _a.sent();
                    if (!result.online && result.accessPoints.length === 0) {
                        (0, utils_ts_1.sendError)(res, 502, "Failed to fetch wireless data from bbox");
                        return [2 /*return*/];
                    }
                    (0, utils_ts_1.sendJson)(res, 200, result);
                    return [2 /*return*/];
            }
        });
    });
}
