"use strict";

import { MATCH_ENCRYPTED_BLOB, ADMIN_ENCRYPTED_BLOB } from "./config.js";

const ACCESS_LEVEL = { NONE: 0, PLAYER: 1, ADMIN: 2 };

let currentApiKey = null;
let currentAccess = ACCESS_LEVEL.NONE;

async function deriveKey(passphrase, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encrypt(plaintext, passphrase) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plaintext)
  );
  const result = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
  result.set(salt, 0);
  result.set(iv, salt.length);
  result.set(new Uint8Array(ciphertext), salt.length + iv.length);
  return btoa(String.fromCharCode(...result));
}

async function decrypt(blob, passphrase) {
  const data = Uint8Array.from(atob(blob), (c) => c.charCodeAt(0));
  const salt = data.slice(0, 16);
  const iv = data.slice(16, 28);
  const ciphertext = data.slice(28);
  const key = await deriveKey(passphrase, salt);
  const dec = new TextDecoder();
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );
  return dec.decode(plaintext);
}

async function authenticate(passphrase) {
  if (ADMIN_ENCRYPTED_BLOB) {
    try {
      currentApiKey = await decrypt(ADMIN_ENCRYPTED_BLOB, passphrase);
      currentAccess = ACCESS_LEVEL.ADMIN;
      return ACCESS_LEVEL.ADMIN;
    } catch (_) {
      /* not admin passphrase, try match */
    }
  }

  if (MATCH_ENCRYPTED_BLOB) {
    try {
      currentApiKey = await decrypt(MATCH_ENCRYPTED_BLOB, passphrase);
      currentAccess = ACCESS_LEVEL.PLAYER;
      return ACCESS_LEVEL.PLAYER;
    } catch (_) {
      /* wrong passphrase */
    }
  }

  currentApiKey = null;
  currentAccess = ACCESS_LEVEL.NONE;
  throw new Error("Invalid passphrase.");
}

function getApiKey() {
  return currentApiKey;
}

function getAccessLevel() {
  return currentAccess;
}

function logout() {
  currentApiKey = null;
  currentAccess = ACCESS_LEVEL.NONE;
}

export {
  encrypt,
  decrypt,
  authenticate,
  getApiKey,
  getAccessLevel,
  logout,
  ACCESS_LEVEL,
};
