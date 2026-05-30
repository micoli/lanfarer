import fs from "node:fs";
import crypto from "node:crypto";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { CONFIG_FILE, SESSIONS_FILE, AUTH_DISABLED } from "./config.ts";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

interface User {
  username: string;
  passwordHash: string;
}

interface Session {
  username: string;
  expiresAt: number;
}

function loadSessions(): Map<string, Session> {
  try {
    const entries = JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf8")) as [string, Session][];
    const now = Date.now();
    return new Map(entries.filter(([, s]) => s.expiresAt > now));
  } catch {
    return new Map();
  }
}

function saveSessions(map: Map<string, Session>): void {
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify([...map]) + "\n");
  } catch { /* non-fatal */ }
}

const sessions = loadSessions();

function loadConfig(): Record<string, unknown> {
  try {
    return (parseYaml(fs.readFileSync(CONFIG_FILE, "utf8")) as Record<string, unknown>) ?? {};
  } catch {
    return {};
  }
}

function loadUsers(): User[] {
  const data = loadConfig();
  return (data.users as User[]) ?? [];
}

export function saveUsers(users: User[]): void {
  const data = loadConfig();
  data.users = users;
  fs.writeFileSync(CONFIG_FILE, stringifyYaml(data));
}

export function isAuthEnabled(): boolean {
  if (AUTH_DISABLED) return false;
  return loadUsers().length > 0;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = await new Promise<Buffer>((resolve, reject) =>
    crypto.scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key))),
  );
  return `scrypt:${salt}:${hash.toString("hex")}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, expected] = parts;
  try {
    const hash = await new Promise<Buffer>((resolve, reject) =>
      crypto.scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key))),
    );
    return crypto.timingSafeEqual(hash, Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

export async function addOrUpdateUser(username: string, password: string): Promise<void> {
  const users = loadUsers();
  const hash = await hashPassword(password);
  const idx = users.findIndex((u) => u.username === username);
  if (idx >= 0) {
    users[idx].passwordHash = hash;
  } else {
    users.push({ username, passwordHash: hash });
  }
  saveUsers(users);
}

export async function login(username: string, password: string): Promise<string | null> {
  const users = loadUsers();
  const user = users.find((u) => u.username === username);
  if (!user) return null;
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return null;
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, { username, expiresAt: Date.now() + SESSION_TTL_MS });
  saveSessions(sessions);
  return token;
}

export function getSession(token: string): Session | null {
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    saveSessions(sessions);
    return null;
  }
  return session;
}

export function deleteSession(token: string): void {
  sessions.delete(token);
  saveSessions(sessions);
}

export function parseSessionCookie(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k === "session" && v) return v;
  }
  return null;
}
