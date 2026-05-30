"use strict";
/**
 * ACP (Apple Configuration Protocol) client for AirPort base stations.
 *
 * Derived from node-acp <https://gitlab.fancy.org.uk/samuel/node-acp>
 * by Samuel Elliott — MIT License.
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
exports.checkAcpOnline = checkAcpOnline;
exports.fetchAcpHosts = fetchAcpHosts;
exports.fetchAcpRawProps = fetchAcpRawProps;
exports.fetchAcpWireless = fetchAcpWireless;
var net = require("node:net");
var crypto = require("node:crypto");
var fast_srp_hap_1 = require("fast-srp-hap");
// ── Adler-32 ──────────────────────────────────────────────────────────────────
function adler32(buf) {
    var a = 1, b = 0;
    for (var i = 0; i < buf.length; i++) {
        a = (a + buf[i]) % 65521;
        b = (b + a) % 65521;
    }
    return ((b << 16) | a) >>> 0;
}
// ── ACP keystream & header key ────────────────────────────────────────────────
var ACP_STATIC_KEY = Buffer.from("5b6faf5d9d5b0e1351f2da1de7e8d673", "hex");
function generateACPKeystream(length) {
    var key = Buffer.alloc(length);
    for (var i = 0; i < length; i++) {
        key[i] = ((i + 0x55) & 0xff) ^ ACP_STATIC_KEY[i % ACP_STATIC_KEY.length];
    }
    return key;
}
function generateACPHeaderKey(password) {
    var LEN = 32;
    var ks = generateACPKeystream(LEN);
    var pw = password.substring(0, LEN).padEnd(LEN, "\x00");
    var out = Buffer.alloc(LEN);
    for (var i = 0; i < LEN; i++)
        out[i] = ks[i] ^ pw.charCodeAt(i);
    return out;
}
// ── CFLBinaryPList ────────────────────────────────────────────────────────────
var CFB_HEADER = "CFB0";
var CFB_FOOTER = "END!";
function cfbCompose(object) {
    return Buffer.concat([
        Buffer.from(CFB_HEADER, "binary"),
        cfbPackObject(object),
        Buffer.from(CFB_FOOTER, "binary"),
    ]);
}
function cfbPackObject(obj, depth) {
    if (depth === void 0) { depth = 1; }
    if (obj === undefined || obj === null)
        return Buffer.from([0x00]);
    if (typeof obj === "boolean")
        return Buffer.from([obj ? 0x09 : 0x08]);
    if (typeof obj === "number" && obj % 1 !== 0) {
        var buf = Buffer.alloc(8);
        buf.writeDoubleBE(obj, 0);
        return Buffer.concat([Buffer.from([0x23]), buf]);
    }
    if (typeof obj === "number") {
        for (var _i = 0, _a = [1, 2, 4]; _i < _a.length; _i++) {
            var size = _a[_i];
            try {
                var buf = Buffer.alloc(size);
                buf.writeUIntBE(obj, 0, size);
                return Buffer.concat([Buffer.from([0x10 + Math.log2(size)]), buf]);
            }
            catch ( /* try next size */_b) { /* try next size */ }
        }
        throw new Error("Unsupported int size");
    }
    if (typeof obj === "bigint") {
        var buf = Buffer.alloc(8);
        buf.writeBigUInt64BE(obj, 0);
        return Buffer.concat([Buffer.from([0x13]), buf]);
    }
    if (Buffer.isBuffer(obj)) {
        return Buffer.concat([
            obj.length >= 0xf
                ? Buffer.concat([Buffer.from([0x4f]), cfbPackObject(obj.length, depth + 1)])
                : Buffer.from([0x40 + obj.length]),
            obj,
        ]);
    }
    if (typeof obj === "string") {
        return Buffer.concat([Buffer.from([0x70]), Buffer.from(obj, "utf-8"), Buffer.from([0x00])]);
    }
    if (Array.isArray(obj) || obj instanceof Set) {
        var parts = __spreadArray([], obj, true).map(function (el) { return cfbPackObject(el, depth + 1); });
        return Buffer.concat(__spreadArray(__spreadArray([Buffer.from([0xa0])], parts, true), [Buffer.from([0x00])], false));
    }
    if (obj instanceof Map) {
        var parts = [];
        for (var _c = 0, _d = obj.entries(); _c < _d.length; _c++) {
            var _e = _d[_c], k = _e[0], v = _e[1];
            parts.push(cfbPackObject(k, depth + 1), cfbPackObject(v, depth + 1));
        }
        return Buffer.concat(__spreadArray(__spreadArray([Buffer.from([0xd0])], parts, true), [Buffer.from([0x00])], false));
    }
    if (typeof obj === "object") {
        var parts = [];
        for (var _f = 0, _g = Object.entries(obj); _f < _g.length; _f++) {
            var _h = _g[_f], k = _h[0], v = _h[1];
            parts.push(cfbPackObject(k, depth + 1), cfbPackObject(v, depth + 1));
        }
        return Buffer.concat(__spreadArray(__spreadArray([Buffer.from([0xd0])], parts, true), [Buffer.from([0x00])], false));
    }
    throw new Error("cfbPackObject: unsupported type");
}
function cfbParse(data) {
    if (data.length < CFB_HEADER.length + CFB_FOOTER.length + 1)
        throw new Error("cfbParse: not enough data");
    if (data.slice(0, 4).toString("binary") !== CFB_HEADER)
        throw new Error("cfbParse: bad header magic");
    var _a = cfbUnpackObject(data.slice(4)), obj = _a[0], remaining = _a[1];
    if (remaining.toString("binary") !== CFB_FOOTER)
        throw new Error("cfbParse: bad footer magic");
    return obj;
}
function cfbUnpackObject(data, depth) {
    if (depth === void 0) { depth = 1; }
    if (depth > 10)
        throw new Error("cfbUnpackObject: max depth");
    var marker = data[0];
    data = data.slice(1);
    var type = marker & 0xf0;
    var info = marker & 0x0f;
    if (type === 0x00) {
        if (info === 0x00)
            return [null, data];
        if (info === 0x08)
            return [false, data];
        if (info === 0x09)
            return [true, data];
        throw new Error("cfbUnpackObject: unknown null/bool info " + info);
    }
    if (type === 0x10) {
        var size = Math.pow(2, info);
        var val = size === 8 ? data.readBigUInt64BE(0) : data.readUIntBE(0, size);
        return [val, data.slice(size)];
    }
    if (type === 0x20) {
        var size = Math.pow(2, info);
        var val = size === 4 ? data.readFloatBE(0) : data.readDoubleBE(0);
        return [val, data.slice(size)];
    }
    if (type === 0x40) {
        var _a = cfbUnpackCount(info, data), size = _a[0], rest = _a[1];
        return [rest.slice(0, size), rest.slice(size)];
    }
    if (type === 0x70) {
        var end = data.indexOf(0x00);
        return [data.slice(0, end).toString("utf-8"), data.slice(end + 1)];
    }
    if (type === 0xa0) {
        var arr = [];
        while (true) {
            var _b = cfbUnpackObject(data, depth + 1), el = _b[0], rest = _b[1];
            data = rest;
            if (el === null)
                break;
            arr.push(el);
        }
        return [arr, data];
    }
    if (type === 0xd0) {
        var obj = {};
        while (true) {
            var _c = cfbUnpackObject(data, depth + 1), key = _c[0], r1 = _c[1];
            data = r1;
            if (key === null)
                break;
            var _d = cfbUnpackObject(data, depth + 1), val = _d[0], r2 = _d[1];
            data = r2;
            obj[key] = val;
        }
        return [obj, data];
    }
    throw new Error("cfbUnpackObject: unsupported type 0x" + type.toString(16));
}
function cfbUnpackCount(info, data) {
    if (info !== 0x0f)
        return [info, data];
    var marker = data[0];
    data = data.slice(1);
    var countInfo = marker & 0x0f;
    var size = Math.pow(2, countInfo);
    var count = data.readUIntBE(0, size);
    return [count, data.slice(size)];
}
// ── ACP message framing (128-byte headers) ────────────────────────────────────
//
// Header layout (128 bytes):
//   [0-3]   "acpp" magic
//   [4-7]   version (int32, 0x00030001)
//   [8-11]  header_checksum (uint32, adler32 of header with checksum=0)
//   [12-15] body_checksum (uint32, adler32 of body, or 1 if no body)
//   [16-19] body_size (int32, -1 signals streaming response)
//   [20-23] flags (int32)
//   [24-27] unused (int32, 0)
//   [28-31] command (int32)
//   [32-35] error_code (int32)
//   [36-47] pad1 (12 bytes, zeros)
//   [48-79] key (32 bytes)
//   [80-127] pad2 (48 bytes, zeros)
var HEADER_SIZE = 128;
var ELEMENT_HEADER_SIZE = 12;
var ACP_MAGIC = "acpp";
var ACP_VERSION = 0x00030001;
var ACP_PORT = 5009;
var TIMEOUT_MS = 8000;
function packHeader(cmd, flags, errorCode, bodyChecksum, bodySize, key, headerChecksum) {
    if (headerChecksum === void 0) { headerChecksum = 0; }
    var buf = Buffer.alloc(HEADER_SIZE);
    buf.write(ACP_MAGIC, 0, 4, "binary");
    buf.writeInt32BE(ACP_VERSION, 4);
    buf.writeUInt32BE(headerChecksum, 8);
    buf.writeUInt32BE(bodyChecksum, 12);
    buf.writeInt32BE(bodySize, 16);
    buf.writeInt32BE(flags, 20);
    buf.writeInt32BE(0, 24);
    buf.writeInt32BE(cmd, 28);
    buf.writeInt32BE(errorCode, 32);
    key.copy(buf, 48);
    return buf;
}
function buildMessage(cmd, flags, key, body) {
    var bodyBuf = body !== null && body !== void 0 ? body : Buffer.alloc(0);
    var bodyChecksum = bodyBuf.length > 0 ? adler32(bodyBuf) : 1;
    var bodySize = bodyBuf.length;
    var tmpHdr = packHeader(cmd, flags, 0, bodyChecksum, bodySize, key);
    var hdrChecksum = adler32(tmpHdr);
    var hdr = packHeader(cmd, flags, 0, bodyChecksum, bodySize, key, hdrChecksum);
    return bodyBuf.length > 0 ? Buffer.concat([hdr, bodyBuf]) : hdr;
}
function parseHeader(buf) {
    if (buf.length < HEADER_SIZE)
        throw new Error("ACP parseHeader: buffer too short");
    if (buf.slice(0, 4).toString("binary") !== ACP_MAGIC)
        throw new Error("ACP parseHeader: bad magic");
    return {
        errorCode: buf.readInt32BE(32),
        bodySize: buf.readInt32BE(16),
    };
}
function buildAuthMessage(payload) {
    return buildMessage(26 /* Cmd.AUTHENTICATE */, 4, generateACPHeaderKey(""), payload);
}
function buildGetPropsMessage(propNames, password, encrypted) {
    var key = encrypted ? Buffer.alloc(32) : generateACPHeaderKey(password);
    var elems = propNames.map(function (name) {
        var elem = Buffer.alloc(ELEMENT_HEADER_SIZE);
        elem.write(name.substring(0, 4), 0, 4, "binary");
        return elem;
    });
    elems.push(Buffer.alloc(ELEMENT_HEADER_SIZE)); // null terminator
    return buildMessage(20 /* Cmd.GET_PROPERTY */, 4, key, Buffer.concat(elems));
}
// ── ACP session encryption ────────────────────────────────────────────────────
var PBKDF_SALT0 = Buffer.from("F072FA3F66B410A135FAE8E6D1D43D5F", "hex");
var PBKDF_SALT1 = Buffer.from("BD0682C9FE79325BC73655F4174B996C", "hex");
var AcpEncryption = /** @class */ (function () {
    function AcpEncryption(key, clientIv, serverIv) {
        var clientKey = crypto.pbkdf2Sync(key, PBKDF_SALT0, 5, 16, "sha1");
        var serverKey = crypto.pbkdf2Sync(key, PBKDF_SALT1, 7, 16, "sha1");
        this.clientCipher = crypto.createCipheriv("aes-128-ctr", clientKey, clientIv);
        this.serverDecipher = crypto.createDecipheriv("aes-128-ctr", serverKey, serverIv);
    }
    AcpEncryption.prototype.encrypt = function (data) { return this.clientCipher.update(data); };
    AcpEncryption.prototype.decrypt = function (data) { return this.serverDecipher.update(data); };
    return AcpEncryption;
}());
// ── ACP socket ────────────────────────────────────────────────────────────────
var AcpSocket = /** @class */ (function () {
    function AcpSocket(socket) {
        var _this = this;
        this.socket = socket;
        this.buffer = Buffer.alloc(0);
        this.encryption = null;
        this.closed = false;
        this.closeError = null;
        socket.on("data", function (chunk) {
            var plain = _this.encryption ? _this.encryption.decrypt(chunk) : chunk;
            _this.buffer = Buffer.concat([_this.buffer, plain]);
        });
        socket.on("error", function (err) {
            _this.closed = true;
            _this.closeError = err;
        });
        socket.on("close", function () {
            _this.closed = true;
            if (!_this.closeError)
                _this.closeError = new Error("ACP: connection closed by server");
        });
        socket.on("end", function () {
            _this.closed = true;
            if (!_this.closeError)
                _this.closeError = new Error("ACP: server closed the connection");
        });
    }
    AcpSocket.prototype.enableEncryption = function (enc) { this.encryption = enc; };
    AcpSocket.prototype.recv = function (size) {
        return __awaiter(this, void 0, void 0, function () {
            var deadline, out;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        deadline = Date.now() + TIMEOUT_MS;
                        _b.label = 1;
                    case 1:
                        if (!(this.buffer.length < size)) return [3 /*break*/, 3];
                        if (this.closed)
                            throw (_a = this.closeError) !== null && _a !== void 0 ? _a : new Error("ACP: connection closed");
                        if (Date.now() > deadline)
                            throw new Error("AcpSocket: receive timeout");
                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 2); })];
                    case 2:
                        _b.sent();
                        return [3 /*break*/, 1];
                    case 3:
                        out = this.buffer.slice(0, size);
                        this.buffer = this.buffer.slice(size);
                        return [2 /*return*/, out];
                }
            });
        });
    };
    AcpSocket.prototype.send = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var encrypted;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        encrypted = this.encryption ? this.encryption.encrypt(data) : data;
                        return [4 /*yield*/, new Promise(function (resolve, reject) {
                                _this.socket.write(encrypted, function (err) { return (err ? reject(err) : resolve()); });
                            })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    AcpSocket.prototype.recvHeader = function () {
        return __awaiter(this, void 0, void 0, function () {
            var buf;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.recv(HEADER_SIZE)];
                    case 1:
                        buf = _a.sent();
                        return [2 /*return*/, parseHeader(buf)];
                }
            });
        });
    };
    AcpSocket.prototype.recvMessage = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, errorCode, bodySize, body, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, this.recvHeader()];
                    case 1:
                        _a = _c.sent(), errorCode = _a.errorCode, bodySize = _a.bodySize;
                        if (!(bodySize > 0)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.recv(bodySize)];
                    case 2:
                        _b = _c.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        _b = Buffer.alloc(0);
                        _c.label = 4;
                    case 4:
                        body = _b;
                        return [2 /*return*/, { errorCode: errorCode, body: body }];
                }
            });
        });
    };
    AcpSocket.prototype.end = function () { this.socket.end(); };
    return AcpSocket;
}());
// ── ACP client ────────────────────────────────────────────────────────────────
var AcpClient = /** @class */ (function () {
    function AcpClient(host, password) {
        this.host = host;
        this.password = password;
        this.sock = null;
        this.sessionEncrypted = false;
    }
    AcpClient.prototype.connect = function () {
        return __awaiter(this, void 0, void 0, function () {
            var socket;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, new Promise(function (resolve, reject) {
                            var s = net.createConnection({ host: _this.host, port: ACP_PORT });
                            var timer = setTimeout(function () { s.destroy(); reject(new Error("ACP connect timeout")); }, TIMEOUT_MS);
                            s.once("connect", function () { clearTimeout(timer); resolve(s); });
                            s.once("error", function (e) { clearTimeout(timer); reject(e); });
                        })];
                    case 1:
                        socket = _a.sent();
                        socket.setTimeout(TIMEOUT_MS);
                        this.sock = new AcpSocket(socket);
                        return [2 /*return*/];
                }
            });
        });
    };
    AcpClient.prototype.authenticate = function () {
        return __awaiter(this, void 0, void 0, function () {
            var resp2, data2, params, clientSecret, srpc, A, M1, iv, resp4, data4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.sock)
                            throw new Error("ACP not connected");
                        // Stage 1: send auth request (key = keystream of empty string)
                        return [4 /*yield*/, this.sock.send(buildAuthMessage(cfbCompose({ state: 1, username: "admin" })))];
                    case 1:
                        // Stage 1: send auth request (key = keystream of empty string)
                        _a.sent();
                        return [4 /*yield*/, this.sock.recvMessage().catch(function (e) { throw new Error("ACP auth stage2: ".concat(e.message)); })];
                    case 2:
                        resp2 = _a.sent();
                        if (resp2.errorCode !== 0)
                            throw new Error("ACP auth stage2 error ".concat(resp2.errorCode));
                        data2 = cfbParse(resp2.body);
                        params = fast_srp_hap_1.SRP.params[1536];
                        clientSecret = crypto.randomBytes(24);
                        srpc = new fast_srp_hap_1.SrpClient(params, data2.salt, Buffer.from("admin"), Buffer.from(this.password), clientSecret);
                        srpc.setB(data2.publicKey);
                        A = srpc.computeA();
                        M1 = srpc.computeM1();
                        iv = crypto.randomBytes(16);
                        return [4 /*yield*/, this.sock.send(buildAuthMessage(cfbCompose({ iv: iv, publicKey: A, state: 3, response: M1 })))];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, this.sock.recvMessage().catch(function (e) { throw new Error("ACP auth stage4: ".concat(e.message)); })];
                    case 4:
                        resp4 = _a.sent();
                        if (resp4.errorCode !== 0)
                            throw new Error("ACP auth stage4 error ".concat(resp4.errorCode));
                        data4 = cfbParse(resp4.body);
                        // Stage 5: verify M2, enable session encryption
                        srpc.checkM2(data4.response);
                        this.sock.enableEncryption(new AcpEncryption(srpc.computeK(), iv, data4.iv));
                        this.sessionEncrypted = true;
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Fetch multiple properties in one request using the streaming protocol.
     *
     * Client sends one GetProp with all property names.
     * Server responds with a stream header (body_size = -1), then streams
     * 12-byte property element headers each followed by the value, ending
     * with a null-name terminator.
     */
    AcpClient.prototype.getProperties = function (names) {
        return __awaiter(this, void 0, void 0, function () {
            var result, elemHdr, elemName, flags, size, value, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!this.sock)
                            throw new Error("ACP not connected");
                        result = new Map();
                        return [4 /*yield*/, this.sock.send(buildGetPropsMessage(names, this.password, this.sessionEncrypted))];
                    case 1:
                        _b.sent();
                        // Stream header — body_size is -1 for streaming responses
                        return [4 /*yield*/, this.sock.recvHeader()];
                    case 2:
                        // Stream header — body_size is -1 for streaming responses
                        _b.sent();
                        _b.label = 3;
                    case 3:
                        if (!true) return [3 /*break*/, 8];
                        return [4 /*yield*/, this.sock.recv(ELEMENT_HEADER_SIZE)];
                    case 4:
                        elemHdr = _b.sent();
                        elemName = elemHdr.slice(0, 4).toString("binary");
                        flags = elemHdr.readUInt32BE(4);
                        size = elemHdr.readUInt32BE(8);
                        if (elemName === "\x00\x00\x00\x00")
                            return [3 /*break*/, 8];
                        if (!(size > 0)) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.sock.recv(size)];
                    case 5:
                        _a = _b.sent();
                        return [3 /*break*/, 7];
                    case 6:
                        _a = Buffer.alloc(0);
                        _b.label = 7;
                    case 7:
                        value = _a;
                        if (flags & 1)
                            return [3 /*break*/, 3]; // error for this property
                        if (size > 0) {
                            try {
                                result.set(elemName, cfbParse(value));
                            }
                            catch (_c) {
                                result.set(elemName, value);
                            }
                        }
                        return [3 /*break*/, 3];
                    case 8: return [2 /*return*/, result];
                }
            });
        });
    };
    AcpClient.prototype.disconnect = function () {
        var _a;
        (_a = this.sock) === null || _a === void 0 ? void 0 : _a.end();
        this.sock = null;
    };
    return AcpClient;
}());
// ── Helpers ───────────────────────────────────────────────────────────────────
function formatMac(v) {
    if (Buffer.isBuffer(v) && v.length === 6) {
        return Array.from(v).map(function (b) { return b.toString(16).padStart(2, "0"); }).join(":").toUpperCase();
    }
    return String(v !== null && v !== void 0 ? v : "").toUpperCase();
}
function toRssiDbm(rssi) {
    if (typeof rssi === "bigint")
        return Number(BigInt.asIntN(64, rssi));
    return Number(rssi) || 0;
}
function channelToBand(channel) {
    return channel > 14 ? "5G" : "2.4G";
}
// ── Public API ────────────────────────────────────────────────────────────────
function checkAcpOnline(host) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve) {
                    var s = net.createConnection({ host: host, port: ACP_PORT });
                    var timer = setTimeout(function () { s.destroy(); resolve(false); }, 3000);
                    s.once("connect", function () { clearTimeout(timer); s.destroy(); resolve(true); });
                    s.once("error", function () { clearTimeout(timer); resolve(false); });
                })];
        });
    });
}
function fetchAcpHosts(host, password) {
    return __awaiter(this, void 0, void 0, function () {
        var client, props;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    client = new AcpClient(host, password);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, , 5, 6]);
                    return [4 /*yield*/, client.connect()];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, client.authenticate()];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, client.getProperties(["raSL", "dhSL"])];
                case 4:
                    props = _a.sent();
                    return [2 /*return*/, buildHostData(props)];
                case 5:
                    client.disconnect();
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    });
}
function fetchAcpRawProps(host, password) {
    return __awaiter(this, void 0, void 0, function () {
        var client, props;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    client = new AcpClient(host, password);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, , 5, 6]);
                    return [4 /*yield*/, client.connect()];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, client.authenticate()];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, client.getProperties(["WiFi", "raSL", "dhSL"])];
                case 4:
                    props = _a.sent();
                    return [2 /*return*/, safeSerialize(Object.fromEntries(props))];
                case 5:
                    client.disconnect();
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    });
}
function safeSerialize(v) {
    if (v === null || v === undefined)
        return v;
    if (typeof v === "bigint")
        return v.toString();
    if (Buffer.isBuffer(v))
        return v.toString("hex");
    if (Array.isArray(v))
        return v.map(safeSerialize);
    if (typeof v === "object") {
        return Object.fromEntries(Object.entries(v).map(function (_a) {
            var k = _a[0], val = _a[1];
            return [k, safeSerialize(val)];
        }));
    }
    return v;
}
function fetchAcpWireless(host, password) {
    return __awaiter(this, void 0, void 0, function () {
        var client, props;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    client = new AcpClient(host, password);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, , 5, 6]);
                    return [4 /*yield*/, client.connect()];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, client.authenticate()];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, client.getProperties(["WiFi", "raSL", "dhSL"])];
                case 4:
                    props = _a.sent();
                    return [2 /*return*/, buildWirelessData(props)];
                case 5:
                    client.disconnect();
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    });
}
// ── Internal data builders ────────────────────────────────────────────────────
function buildMacToLease(dhSL) {
    var _a, _b, _c;
    var map = new Map();
    var leases = ((_a = dhSL === null || dhSL === void 0 ? void 0 : dhSL.leases) !== null && _a !== void 0 ? _a : []);
    for (var _i = 0, leases_1 = leases; _i < leases_1.length; _i++) {
        var l = leases_1[_i];
        var mac = formatMac(l.macAddress);
        if (mac)
            map.set(mac, { ip: String((_b = l.ipAddress) !== null && _b !== void 0 ? _b : ""), hostname: String((_c = l.hostname) !== null && _c !== void 0 ? _c : "") });
    }
    return map;
}
function buildHostData(props) {
    var _a, _b;
    var raSL = props.get("raSL");
    var macToLease = buildMacToLease(props.get("dhSL"));
    var hosts = [];
    var seen = new Set();
    for (var _i = 0, _c = Object.values(raSL !== null && raSL !== void 0 ? raSL : {}); _i < _c.length; _i++) {
        var clients = _c[_i];
        for (var _d = 0, clients_1 = clients; _d < clients_1.length; _d++) {
            var c = clients_1[_d];
            var entry = c;
            var mac = formatMac(entry.macAddress);
            if (!mac || seen.has(mac))
                continue;
            seen.add(mac);
            var lease = macToLease.get(mac);
            hosts.push({ mac: mac, ip: (_a = lease === null || lease === void 0 ? void 0 : lease.ip) !== null && _a !== void 0 ? _a : "", hostname: (_b = lease === null || lease === void 0 ? void 0 : lease.hostname) !== null && _b !== void 0 ? _b : "", wireless: true });
        }
    }
    return { hosts: hosts };
}
function buildWirelessData(props) {
    var _a, _b, _c, _d;
    var wifiProp = props.get("WiFi");
    var raSL = props.get("raSL");
    var macToLease = buildMacToLease(props.get("dhSL"));
    var radios = (_a = wifiProp === null || wifiProp === void 0 ? void 0 : wifiProp.radios) !== null && _a !== void 0 ? _a : [];
    var accessPoints = [];
    radios.forEach(function (radio, i) {
        var _a, _b, _c, _d, _e, _f;
        var ifname = "wlan".concat(i);
        var ssid = String((_a = radio.raNm) !== null && _a !== void 0 ? _a : "");
        var channel = Number((_b = radio.raCh) !== null && _b !== void 0 ? _b : 0);
        var band = channelToBand(channel);
        var rawClients = (_c = raSL === null || raSL === void 0 ? void 0 : raSL[ifname]) !== null && _c !== void 0 ? _c : [];
        var clients = [];
        var seen = new Set();
        for (var _i = 0, rawClients_2 = rawClients; _i < rawClients_2.length; _i++) {
            var c = rawClients_2[_i];
            var entry = c;
            var mac = formatMac(entry.macAddress);
            if (!mac || seen.has(mac))
                continue;
            seen.add(mac);
            var lease = macToLease.get(mac);
            clients.push({
                mac: mac,
                ip: (_d = lease === null || lease === void 0 ? void 0 : lease.ip) !== null && _d !== void 0 ? _d : "",
                hostname: (_e = lease === null || lease === void 0 ? void 0 : lease.hostname) !== null && _e !== void 0 ? _e : "",
                rssi_dbm: toRssiDbm(entry.rssi),
                txrate_mbps: Number((_f = entry.txrate) !== null && _f !== void 0 ? _f : 0),
            });
        }
        accessPoints.push({ ifname: ifname, ssid: ssid, band: band, channel: channel, clients: clients });
    });
    // Fallback: if WiFi property not available, build from raSL alone
    if (accessPoints.length === 0 && raSL) {
        for (var _i = 0, _e = Object.entries(raSL); _i < _e.length; _i++) {
            var _f = _e[_i], ifname = _f[0], rawClients = _f[1];
            var clients = [];
            for (var _g = 0, rawClients_1 = rawClients; _g < rawClients_1.length; _g++) {
                var c = rawClients_1[_g];
                var entry = c;
                var mac = formatMac(entry.macAddress);
                if (!mac)
                    continue;
                var lease = macToLease.get(mac);
                clients.push({
                    mac: mac,
                    ip: (_b = lease === null || lease === void 0 ? void 0 : lease.ip) !== null && _b !== void 0 ? _b : "",
                    hostname: (_c = lease === null || lease === void 0 ? void 0 : lease.hostname) !== null && _c !== void 0 ? _c : "",
                    rssi_dbm: toRssiDbm(entry.rssi),
                    txrate_mbps: Number((_d = entry.txrate) !== null && _d !== void 0 ? _d : 0),
                });
            }
            var band = ifname.endsWith("1") ? "5G" : "2.4G";
            accessPoints.push({ ifname: ifname, ssid: "", band: band, channel: 0, clients: clients });
        }
    }
    return { online: true, accessPoints: accessPoints };
}
