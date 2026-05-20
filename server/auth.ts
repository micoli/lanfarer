import fs from "node:fs";
import crypto from "node:crypto";

const USERS_FILE = process.env.USERS_FILE ?? "users.json";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

interface User {
  username: string;
  passwordHash: string;
}

interface Session {
  username: string;
  expiresAt: number;
}

const sessions = new Map<string, Session>();

function loadUsers(): User[] {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf8")) as User[];
  } catch {
    return [];
  }
}

export function saveUsers(users: User[]): void {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2) + "\n");
}

export function isAuthEnabled(): boolean {
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
  return token;
}

export function getSession(token: string): Session | null {
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return null;
  }
  return session;
}

export function deleteSession(token: string): void {
  sessions.delete(token);
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
