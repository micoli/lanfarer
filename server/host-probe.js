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
exports.probeHostDetails = probeHostDetails;
var node_net_1 = require("node:net");
var node_child_process_1 = require("node:child_process");
var node_util_1 = require("node:util");
var execAsync = (0, node_util_1.promisify)(node_child_process_1.exec);
var COMMON_PORTS = {
    21: "FTP", 22: "SSH", 23: "Telnet", 25: "SMTP",
    80: "HTTP", 443: "HTTPS", 445: "SMB", 3389: "RDP",
    5900: "VNC", 8080: "HTTP-alt", 8443: "HTTPS-alt",
};
function checkPort(ip, port) {
    return new Promise(function (resolve) {
        var s = new node_net_1.default.Socket();
        var t = setTimeout(function () { s.destroy(); resolve(false); }, 800);
        s.connect(port, ip, function () { clearTimeout(t); s.destroy(); resolve(true); });
        s.on("error", function () { clearTimeout(t); resolve(false); });
    });
}
function scanPorts(ip) {
    return __awaiter(this, void 0, void 0, function () {
        var results;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, Promise.all(Object.keys(COMMON_PORTS).map(function (p) { return __awaiter(_this, void 0, void 0, function () {
                        var port;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    port = Number(p);
                                    return [4 /*yield*/, checkPort(ip, port)];
                                case 1: return [2 /*return*/, (_a.sent()) ? port : null];
                            }
                        });
                    }); }))];
                case 1:
                    results = _a.sent();
                    return [2 /*return*/, results.filter(function (p) { return p !== null; }).sort(function (a, b) { return a - b; })];
            }
        });
    });
}
function getPingStats(ip) {
    return __awaiter(this, void 0, void 0, function () {
        var stdout, m, err_1, msg;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, execAsync("ping -c 3 -i 0.2 \"".concat(ip, "\""), { timeout: 5000 })];
                case 1:
                    stdout = (_b.sent()).stdout;
                    m = stdout.match(/(?:round-trip|rtt) min\/avg\/max\/\S+ = ([\d.]+)\/([\d.]+)\/([\d.]+)/);
                    if (m)
                        return [2 /*return*/, { min: parseFloat(m[1]), avg: parseFloat(m[2]), max: parseFloat(m[3]) }];
                    return [3 /*break*/, 3];
                case 2:
                    err_1 = _b.sent();
                    msg = String((_a = err_1.stderr) !== null && _a !== void 0 ? _a : err_1);
                    if (msg.includes("Operation not permitted") || msg.includes("permission")) {
                        console.debug("[probe] ping stats ".concat(ip, ": no CAP_NET_RAW, skipped"));
                    }
                    else {
                        console.debug("[probe] ping stats ".concat(ip, ": ").concat(msg.split("\n")[0]));
                    }
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/, null];
            }
        });
    });
}
function getMdnsName(ip, hostname) {
    return __awaiter(this, void 0, void 0, function () {
        var stdout, m, err_2, msg;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (hostname.toLowerCase().endsWith(".local"))
                        return [2 /*return*/, hostname];
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, execAsync("avahi-resolve-address \"".concat(ip, "\""), { timeout: 2000 })];
                case 2:
                    stdout = (_c.sent()).stdout;
                    m = stdout.match(/\S+\s+(\S+)/);
                    if (m === null || m === void 0 ? void 0 : m[1])
                        return [2 /*return*/, m[1].replace(/\.$/, "")];
                    return [3 /*break*/, 4];
                case 3:
                    err_2 = _c.sent();
                    msg = String((_b = (_a = err_2.stderr) !== null && _a !== void 0 ? _a : err_2.message) !== null && _b !== void 0 ? _b : err_2);
                    // avahi not installed or mDNS not routed in Docker — not an actionable error
                    if (!msg.includes("not found") && !msg.includes("No such file") && !msg.includes("Failed to resolve")) {
                        console.debug("[probe] mDNS ".concat(ip, ": ").concat(msg.split("\n")[0]));
                    }
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/, ""];
            }
        });
    });
}
function getSmbInfo(ip) {
    return __awaiter(this, void 0, void 0, function () {
        var stdout, name_1, domain, _a, stdout, name_2, domain, _i, _b, line, m, _c;
        var _d, _e, _f, _g, _h, _j;
        return __generator(this, function (_k) {
            switch (_k.label) {
                case 0:
                    _k.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, execAsync("smbutil status \"".concat(ip, "\""), { timeout: 3000 })];
                case 1:
                    stdout = (_k.sent()).stdout;
                    name_1 = (_f = (_e = (_d = stdout.match(/Server:\s*(.+)/i)) === null || _d === void 0 ? void 0 : _d[1]) === null || _e === void 0 ? void 0 : _e.trim()) !== null && _f !== void 0 ? _f : "";
                    domain = (_j = (_h = (_g = stdout.match(/Workgroup:\s*(.+)/i)) === null || _g === void 0 ? void 0 : _g[1]) === null || _h === void 0 ? void 0 : _h.trim()) !== null && _j !== void 0 ? _j : "";
                    if (name_1)
                        return [2 /*return*/, { name: name_1, domain: domain }];
                    return [3 /*break*/, 3];
                case 2:
                    _a = _k.sent();
                    return [3 /*break*/, 3];
                case 3:
                    _k.trys.push([3, 5, , 6]);
                    return [4 /*yield*/, execAsync("nmblookup -A \"".concat(ip, "\""), { timeout: 3000 })];
                case 4:
                    stdout = (_k.sent()).stdout;
                    name_2 = "";
                    domain = "";
                    for (_i = 0, _b = stdout.split("\n"); _i < _b.length; _i++) {
                        line = _b[_i];
                        m = line.match(/\s+(\S+)\s+<([0-9a-f]{2})>/i);
                        if (!m)
                            continue;
                        if (m[2] === "00" && !name_2)
                            name_2 = m[1].trim();
                        if ((m[2] === "1e" || m[2] === "00") && !domain)
                            domain = m[1].trim();
                    }
                    if (name_2)
                        return [2 /*return*/, { name: name_2, domain: domain }];
                    return [3 /*break*/, 6];
                case 5:
                    _c = _k.sent();
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/, null];
            }
        });
    });
}
function probeHostDetails(ip, hostname) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, pingStats, openPorts, mdnsName, smbInfo;
        var _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, Promise.all([
                        getPingStats(ip),
                        scanPorts(ip),
                        getMdnsName(ip, hostname),
                        getSmbInfo(ip),
                    ])];
                case 1:
                    _a = _d.sent(), pingStats = _a[0], openPorts = _a[1], mdnsName = _a[2], smbInfo = _a[3];
                    return [2 /*return*/, {
                            ip: ip,
                            pingStats: pingStats,
                            openPorts: openPorts,
                            mdnsName: mdnsName,
                            smbName: (_b = smbInfo === null || smbInfo === void 0 ? void 0 : smbInfo.name) !== null && _b !== void 0 ? _b : "",
                            smbDomain: (_c = smbInfo === null || smbInfo === void 0 ? void 0 : smbInfo.domain) !== null && _c !== void 0 ? _c : "",
                        }];
            }
        });
    });
}
