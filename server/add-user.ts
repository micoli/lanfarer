#!/usr/bin/env node
// Usage: npx tsx server/add-user.ts <username> <password>
import { addOrUpdateUser, isAuthEnabled } from "./auth.ts";

const [username, password] = process.argv.slice(2);

if (!username || !password) {
  console.error("Usage: npx tsx server/add-user.ts <username> <password>");
  process.exit(1);
}

const isNew = !isAuthEnabled();
await addOrUpdateUser(username, password);
console.log(`[add-user] ${isNew ? "Créé" : "Mis à jour"} : ${username}`);
