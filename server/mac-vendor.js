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
exports.formatMac = formatMac;
exports.normaliseOui = normaliseOui;
exports.loadVendorDb = loadVendorDb;
exports.lookupVendor = lookupVendor;
var node_fs_1 = require("node:fs");
var MAC_VENDOR_CACHE = "/tmp/fast5688b-mac-vendor-cache.json";
var MAC_VENDOR_TTL = 24 * 60 * 60 * 1000;
var vendorMap = new Map();
var vendorLoadedAt = 0;
function formatMac(mac) {
    var _a, _b;
    if (/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(mac))
        return mac;
    var hex = mac.toUpperCase().replace(/[^0-9A-F]/g, "");
    return (_b = (_a = hex.match(/.{1,2}/g)) === null || _a === void 0 ? void 0 : _a.join(":")) !== null && _b !== void 0 ? _b : mac;
}
function normaliseOui(mac) {
    return formatMac(mac).replace(/[:\-.]/g, "").toUpperCase().slice(0, 6);
}
function buildVendorMap(entries) {
    var m = new Map();
    for (var _i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
        var e = entries_1[_i];
        m.set(normaliseOui(e.macPrefix), e.vendorName);
    }
    return m;
}
function loadVendorDb() {
    return __awaiter(this, void 0, void 0, function () {
        var loaded, res, data, _a, data;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (vendorMap.size && Date.now() - vendorLoadedAt < MAC_VENDOR_TTL)
                        return [2 /*return*/];
                    loaded = false;
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 5, , 6]);
                    return [4 /*yield*/, fetch("https://maclookup.app/downloads/json-database/get-db", {
                            signal: AbortSignal.timeout(30000),
                        })];
                case 2:
                    res = _b.sent();
                    if (!res.ok) return [3 /*break*/, 4];
                    return [4 /*yield*/, res.json()];
                case 3:
                    data = (_b.sent());
                    node_fs_1.default.writeFileSync(MAC_VENDOR_CACHE, JSON.stringify(data));
                    vendorMap = buildVendorMap(data);
                    vendorLoadedAt = Date.now();
                    loaded = true;
                    console.log("[mac-vendor] DB t\u00E9l\u00E9charg\u00E9e : ".concat(vendorMap.size, " entr\u00E9es"));
                    _b.label = 4;
                case 4: return [3 /*break*/, 6];
                case 5:
                    _a = _b.sent();
                    return [3 /*break*/, 6];
                case 6:
                    if (!loaded) {
                        try {
                            data = JSON.parse(node_fs_1.default.readFileSync(MAC_VENDOR_CACHE, "utf8"));
                            vendorMap = buildVendorMap(data);
                            vendorLoadedAt = Date.now();
                            console.log("[mac-vendor] DB charg\u00E9e depuis le cache : ".concat(vendorMap.size, " entr\u00E9es"));
                        }
                        catch ( /* pas de cache */_c) { /* pas de cache */ }
                    }
                    return [2 /*return*/];
            }
        });
    });
}
function lookupVendor(mac) {
    var _a;
    return (_a = vendorMap.get(normaliseOui(mac))) !== null && _a !== void 0 ? _a : "";
}
await loadVendorDb();
