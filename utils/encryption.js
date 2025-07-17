"use strict";
// utils/encryption.js
const crypto = require("crypto");

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;

/**
 * Encrypts text using AES-256-CBC encryption with deterministic IV
 * @param {string} text - Text to encrypt
 * @param {string} key - Encryption key
 * @returns {string|null} - Encrypted text with IV prepended, or null if text is empty
 */
function encrypt(text, key) {
  if (!text) return null;

  try {
    // Create a hash of the key to ensure it's the right length
    const keyHash = crypto.createHash("sha256").update(key).digest();

    // Create deterministic IV from text + key for consistent encryption
    const ivSource = text + key;
    const ivHash = crypto.createHash("md5").update(ivSource).digest();
    const iv = ivHash.slice(0, IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, keyHash, iv);

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    // Prepend IV to the encrypted data
    return iv.toString("hex") + ":" + encrypted;
  } catch (error) {
    console.error("Encryption error:", error);
    return null;
  }
}

/**
 * Decrypts text using AES-256-CBC encryption
 * @param {string} encryptedData - Encrypted text with IV prepended
 * @param {string} key - Encryption key
 * @returns {string|null} - Decrypted text, or null if decryption fails
 */
function decrypt(encryptedData, key) {
  if (!encryptedData) return null;

  try {
    // Create a hash of the key to ensure it's the right length
    const keyHash = crypto.createHash("sha256").update(key).digest();

    // Split the IV and encrypted data
    const parts = encryptedData.split(":");
    if (parts.length !== 2) {
      throw new Error("Invalid encrypted data format");
    }

    const iv = Buffer.from(parts[0], "hex");
    const encryptedText = parts[1];

    const decipher = crypto.createDecipheriv(ALGORITHM, keyHash, iv);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("Decryption error:", error);
    return null;
  }
}

module.exports = {
  encrypt,
  decrypt,
};
