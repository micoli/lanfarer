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
exports.prepareDhcpClientBody = prepareDhcpClientBody;
exports.extractClients = extractClients;
exports.extractConfig = extractConfig;
exports.extractOptions = extractOptions;
exports.handleDhcp = handleDhcp;
var client_ts_1 = require("../client.ts");
var utils_ts_1 = require("../utils.ts");
// ── Helpers ───────────────────────────────────────────────────────────────────
function prepareDhcpClientBody(body) {
    var _a, _b, _c, _d, _e, _f;
    return {
        enable: (_a = body.enable) !== null && _a !== void 0 ? _a : 1,
        device: (_b = body.macaddress) !== null && _b !== void 0 ? _b : "",
        ipaddress: (_c = body.ipaddress) !== null && _c !== void 0 ? _c : "",
        ip6address: (_d = body.ip6address) !== null && _d !== void 0 ? _d : "",
        macaddress: (_e = body.macaddress) !== null && _e !== void 0 ? _e : "",
        hostname: (_f = body.hostname) !== null && _f !== void 0 ? _f : "",
    };
}
function extractClients(data) {
    var _a, _b;
    if (!Array.isArray(data))
        return [];
    if (data.length === 0)
        return [];
    var first = data[0];
    var raw = [];
    if ("macaddress" in first) {
        raw = data;
    }
    else if (Array.isArray((_b = (_a = first.dhcp) === null || _a === void 0 ? void 0 : _a.clients) !== null && _b !== void 0 ? _b : null)) {
        raw = (first.dhcp.clients);
    }
    else if (Array.isArray(first.dhcpclients)) {
        raw = first.dhcpclients;
    }
    return raw.map(function (c) {
        var _a, _b, _c, _d, _e, _f;
        return ({
            id: Number((_a = c.id) !== null && _a !== void 0 ? _a : 0),
            enable: Number((_b = c.enable) !== null && _b !== void 0 ? _b : 1),
            hostname: String((_c = c.hostname) !== null && _c !== void 0 ? _c : ""),
            macaddress: String((_d = c.macaddress) !== null && _d !== void 0 ? _d : ""),
            ipaddress: String((_e = c.ipaddress) !== null && _e !== void 0 ? _e : ""),
            ip6address: String((_f = c.ip6address) !== null && _f !== void 0 ? _f : ""),
        });
    });
}
function extractConfig(data) {
    var _a, _b, _c, _d, _e, _f;
    var arr = data;
    var dhcp = (_b = (_a = arr === null || arr === void 0 ? void 0 : arr[0]) === null || _a === void 0 ? void 0 : _a.dhcp) !== null && _b !== void 0 ? _b : {};
    return {
        enable: Number((_c = dhcp.enable) !== null && _c !== void 0 ? _c : 0),
        minaddress: String((_d = dhcp.minaddress) !== null && _d !== void 0 ? _d : ""),
        maxaddress: String((_e = dhcp.maxaddress) !== null && _e !== void 0 ? _e : ""),
        leasetime: Number((_f = dhcp.leasetime) !== null && _f !== void 0 ? _f : 0),
    };
}
function extractOptions(data) {
    var _a, _b, _c, _d, _e;
    var arr = data;
    var dhcp = (_b = (_a = arr === null || arr === void 0 ? void 0 : arr[0]) === null || _a === void 0 ? void 0 : _a.dhcp) !== null && _b !== void 0 ? _b : {};
    var options = (_c = dhcp.options) !== null && _c !== void 0 ? _c : [];
    var optionsstatic = (_d = dhcp.optionsstatic) !== null && _d !== void 0 ? _d : [];
    var caps = (_e = dhcp.optionscapabilities) !== null && _e !== void 0 ? _e : [];
    return {
        options: options,
        optionsstatic: optionsstatic,
        capabilities: caps.map(function (c) { return ({ id: c.id, type: c.type, description: c.description }); }),
    };
}
// ── Handlers ──────────────────────────────────────────────────────────────────
function handleDhcp(req, res, spec, subpath) {
    return __awaiter(this, void 0, void 0, function () {
        var method, r, result, body, r, r, result, body, r, clientMatch, id, body, r, r, r, body, r, optMatch, id, body, r, r;
        var _a, _b, _c, _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    method = (_a = req.method) !== null && _a !== void 0 ? _a : "GET";
                    if (!(subpath === "/dhcp/config")) return [3 /*break*/, 5];
                    if (!(method === "GET")) return [3 /*break*/, 2];
                    return [4 /*yield*/, (0, client_ts_1.bboxCall)(spec, "GET", "/api/v1/dhcp")];
                case 1:
                    r = _f.sent();
                    if (r.statusCode !== 200) {
                        (0, utils_ts_1.sendError)(res, 502, "DHCP config fetch failed");
                        return [2 /*return*/];
                    }
                    result = { config: extractConfig(r.data) };
                    (0, utils_ts_1.sendJson)(res, 200, result);
                    return [2 /*return*/];
                case 2:
                    if (!(method === "PUT")) return [3 /*break*/, 5];
                    return [4 /*yield*/, (0, utils_ts_1.readJsonBody)(req)];
                case 3:
                    body = _f.sent();
                    return [4 /*yield*/, (0, client_ts_1.bboxCall)(spec, "PUT", "/api/v1/dhcp", body)];
                case 4:
                    r = _f.sent();
                    (0, utils_ts_1.sendStatus)(res, r.statusCode < 300 ? 204 : r.statusCode);
                    return [2 /*return*/];
                case 5:
                    if (!(subpath === "/dhcp/clients")) return [3 /*break*/, 10];
                    if (!(method === "GET")) return [3 /*break*/, 7];
                    return [4 /*yield*/, (0, client_ts_1.bboxCall)(spec, "GET", "/api/v1/dhcp/clients")];
                case 6:
                    r = _f.sent();
                    if (r.statusCode !== 200) {
                        (0, utils_ts_1.sendError)(res, 502, "DHCP clients fetch failed");
                        return [2 /*return*/];
                    }
                    result = { clients: extractClients(r.data) };
                    (0, utils_ts_1.sendJson)(res, 200, result);
                    return [2 /*return*/];
                case 7:
                    if (!(method === "POST")) return [3 /*break*/, 10];
                    return [4 /*yield*/, (0, utils_ts_1.readJsonBody)(req)];
                case 8:
                    body = _f.sent();
                    return [4 /*yield*/, (0, client_ts_1.bboxCall)(spec, "POST", "/api/v1/dhcp/clients", prepareDhcpClientBody(body))];
                case 9:
                    r = _f.sent();
                    (0, utils_ts_1.sendStatus)(res, r.statusCode < 300 ? 204 : r.statusCode);
                    return [2 /*return*/];
                case 10:
                    clientMatch = subpath.match(/^\/dhcp\/clients\/(\d+)$/);
                    if (!clientMatch) return [3 /*break*/, 15];
                    id = clientMatch[1];
                    if (!(method === "PUT")) return [3 /*break*/, 13];
                    return [4 /*yield*/, (0, utils_ts_1.readJsonBody)(req)];
                case 11:
                    body = _f.sent();
                    return [4 /*yield*/, (0, client_ts_1.bboxCall)(spec, "PUT", "/api/v1/dhcp/clients/".concat(id), prepareDhcpClientBody(body))];
                case 12:
                    r = _f.sent();
                    (0, utils_ts_1.sendStatus)(res, r.statusCode < 300 ? 204 : r.statusCode);
                    return [2 /*return*/];
                case 13:
                    if (!(method === "DELETE")) return [3 /*break*/, 15];
                    return [4 /*yield*/, (0, client_ts_1.bboxCall)(spec, "DELETE", "/api/v1/dhcp/clients/".concat(id))];
                case 14:
                    r = _f.sent();
                    (0, utils_ts_1.sendStatus)(res, r.statusCode < 300 ? 204 : r.statusCode);
                    return [2 /*return*/];
                case 15:
                    if (!(subpath === "/dhcp/options")) return [3 /*break*/, 20];
                    if (!(method === "GET")) return [3 /*break*/, 17];
                    return [4 /*yield*/, (0, client_ts_1.bboxCall)(spec, "GET", "/api/v1/dhcp/options")];
                case 16:
                    r = _f.sent();
                    if (r.statusCode !== 200) {
                        (0, utils_ts_1.sendError)(res, 502, "DHCP options fetch failed");
                        return [2 /*return*/];
                    }
                    (0, utils_ts_1.sendJson)(res, 200, extractOptions(r.data));
                    return [2 /*return*/];
                case 17:
                    if (!(method === "POST")) return [3 /*break*/, 20];
                    return [4 /*yield*/, (0, utils_ts_1.readJsonBody)(req)];
                case 18:
                    body = _f.sent();
                    return [4 /*yield*/, (0, client_ts_1.bboxCall)(spec, "POST", "/api/v1/dhcp/option", {
                            option: (_b = body.option) !== null && _b !== void 0 ? _b : 0,
                            value: (_c = body.value) !== null && _c !== void 0 ? _c : "",
                        })];
                case 19:
                    r = _f.sent();
                    (0, utils_ts_1.sendStatus)(res, r.statusCode < 300 ? 204 : r.statusCode);
                    return [2 /*return*/];
                case 20:
                    optMatch = subpath.match(/^\/dhcp\/options\/(\d+)$/);
                    if (!optMatch) return [3 /*break*/, 25];
                    id = optMatch[1];
                    if (!(method === "PUT")) return [3 /*break*/, 23];
                    return [4 /*yield*/, (0, utils_ts_1.readJsonBody)(req)];
                case 21:
                    body = _f.sent();
                    return [4 /*yield*/, (0, client_ts_1.bboxCall)(spec, "PUT", "/api/v1/dhcp/options/".concat(id), {
                            enable: 1,
                            name: (_d = body.option) !== null && _d !== void 0 ? _d : 0,
                            format: "",
                            value: (_e = body.value) !== null && _e !== void 0 ? _e : "",
                        })];
                case 22:
                    r = _f.sent();
                    (0, utils_ts_1.sendStatus)(res, r.statusCode < 300 ? 204 : r.statusCode);
                    return [2 /*return*/];
                case 23:
                    if (!(method === "DELETE")) return [3 /*break*/, 25];
                    return [4 /*yield*/, (0, client_ts_1.bboxCall)(spec, "DELETE", "/api/v1/dhcp/options/".concat(id))];
                case 24:
                    r = _f.sent();
                    (0, utils_ts_1.sendStatus)(res, r.statusCode < 300 ? 204 : r.statusCode);
                    return [2 /*return*/];
                case 25:
                    (0, utils_ts_1.sendError)(res, 404, "Unknown DHCP route: ".concat(method, " ").concat(subpath));
                    return [2 /*return*/];
            }
        });
    });
}
