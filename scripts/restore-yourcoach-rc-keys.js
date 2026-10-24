#!/usr/bin/env node
/**
 * Restore keys/yourcoach.{public,private}.pem from VITE_YOURCOACH_PRIVATE_KEY in .env.local
 * Use if RC pem files were lost but .env.local still has the key.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env.local');
const keysDir = path.resolve(__dirname, '../keys');

const env = fs.readFileSync(envPath, 'utf8');
const line = env.split(/\r?\n/).find((l) => l.startsWith('VITE_YOURCOACH_PRIVATE_KEY='));
if (!line) {
  console.error('No VITE_YOURCOACH_PRIVATE_KEY in .env.local');
  process.exit(1);
}

let val = line.slice('VITE_YOURCOACH_PRIVATE_KEY='.length).trim();
if (
  (val.startsWith('"') && val.endsWith('"')) ||
  (val.startsWith("'") && val.endsWith("'"))
) {
  val = val.slice(1, -1);
}
const pem = val.replace(/\\n/g, '\n');

const priv = crypto.createPrivateKey(pem);
const pub = crypto.createPublicKey(priv).export({ type: 'spki', format: 'pem' });

fs.mkdirSync(keysDir, { recursive: true });

const publicPath = path.join(keysDir, 'yourcoach.public.pem');
const privatePath = path.join(keysDir, 'yourcoach.private.pem');

if (fs.existsSync(publicPath) || fs.existsSync(privatePath)) {
  console.log('RC key files already exist — skipping restore.');
  process.exit(0);
}

fs.writeFileSync(privatePath, pem);
fs.writeFileSync(publicPath, pub);
console.log('Restored keys/yourcoach.public.pem and keys/yourcoach.private.pem');
