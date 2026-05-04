"use strict";

const MATCH_BLOB_KEY = "wc_match_blob";
const ADMIN_BLOB_KEY = "wc_admin_blob";

const ACCESS_LEVEL = { NONE: 0, PLAYER: 1, ADMIN: 2 };

let currentApiKey = null;
let currentAccess = ACCESS_LEVEL.NONE;

function getStoredBlob(key) {
  return localStorage.getItem(key);
}

function setStoredBlob(key, blob) {
  localStorage.setItem(key, blob);
}

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
  const matchBlob = getStoredBlob(MATCH_BLOB_KEY);
  const adminBlob = getStoredBlob(ADMIN_BLOB_KEY);

  if (adminBlob) {
    try {
      currentApiKey = await decrypt(adminBlob, passphrase);
      currentAccess = ACCESS_LEVEL.ADMIN;
      return ACCESS_LEVEL.ADMIN;
    } catch (_) {
      /* not admin passphrase, try match */
    }
  }

  if (matchBlob) {
    try {
      currentApiKey = await decrypt(matchBlob, passphrase);
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

function isSetup() {
  return !!getStoredBlob(MATCH_BLOB_KEY) && !!getStoredBlob(ADMIN_BLOB_KEY);
}

export {
  encrypt,
  decrypt,
  authenticate,
  getApiKey,
  getAccessLevel,
  logout,
  isSetup,
  setStoredBlob,
  getStoredBlob,
  ACCESS_LEVEL,
  MATCH_BLOB_KEY,
  ADMIN_BLOB_KEY,
};
