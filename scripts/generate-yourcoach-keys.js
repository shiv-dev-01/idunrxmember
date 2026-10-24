#!/usr/bin/env node

/* eslint-disable no-console */
/**
 * RSA Key Pair Generation Script for YourCoach Integration
 * 
 * Usage: node scripts/generate-yourcoach-keys.js [keyName]
 * Examples:
 *   node scripts/generate-yourcoach-keys.js yourcoach      # RC / pre-prod
 *   node scripts/generate-yourcoach-keys.js yourcoach-prod # production (separate pair)
 *
 * Never overwrites existing files — use a different keyName to add another pair.
 * Does NOT delete other keys in keys/ (RC and prod can coexist).
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const keyName = process.argv[2] || "yourcoach";

async function generateKeyPair() {
  try {
    console.log(`\n📝 Generating RSA key pair for: ${keyName}\n`);

    const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: "spki",
        format: "pem",
      },
      privateKeyEncoding: {
        type: "pkcs8",
        format: "pem",
      },
    });

    const KEYS_PATH = path.resolve(__dirname, "../keys");
    fs.mkdirSync(KEYS_PATH, { recursive: true });

    const publicKeyPath = path.resolve(KEYS_PATH, `${keyName}.public.pem`);
    const privateKeyPath = path.resolve(KEYS_PATH, `${keyName}.private.pem`);

    if (fs.existsSync(publicKeyPath) || fs.existsSync(privateKeyPath)) {
      console.error(
        `❌ Refusing to overwrite existing keys for "${keyName}".\n` +
          `   Delete these files manually if you intend to replace them:\n` +
          `   - ${publicKeyPath}\n` +
          `   - ${privateKeyPath}\n` +
          `   Use a different name to keep RC and prod keys side by side, e.g.:\n` +
          `   node scripts/generate-yourcoach-keys.js yourcoach-prod\n`
      );
      process.exit(1);
    }

    fs.writeFileSync(publicKeyPath, publicKey);
    fs.writeFileSync(privateKeyPath, privateKey);

    console.log(`✅ Keys generated successfully!\n`);
    console.log(`📄 Public Key (SHARE WITH YOURCOACH):`);
    console.log(`   Location: ${publicKeyPath}\n`);
    console.log(`🔐 Private Key (KEEP SECURE):`);
    console.log(`   Location: ${privateKeyPath}`);
    console.log(`   Add this content to your .env as VITE_YOURCOACH_PRIVATE_KEY\n`);
    
    console.log(`✨ Next Steps:`);
    console.log(`   1. Send ${keyName}.public.pem to YourCoach team`);
    console.log(`   2. Add private key content to .env.local`);
    console.log(`   3. Keep private key secure!\n`);

  } catch (err) {
    console.error("❌ Error generating keys:", err.message);
    process.exit(1);
  }
}

generateKeyPair();
