/**
 * @license
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 sakibcraft@gmail.com
 * 
 * Core Cryptographic Engine for AegisMark
 */

import { BookmarkItem, EncryptedRecord, VaultHeader } from '../types';

const CANARY_STRING = 'AegisMark-Canary-v1';

// Convert hex string to Uint8Array
export function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.trim();
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.slice(i, i + 2), 16);
  }
  return bytes;
}

// Convert Uint8Array to hex string
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Convert Base64 string to Uint8Array
export function base64ToBytes(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Convert Uint8Array to Base64 string
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert UUID string to 16 raw binary bytes
export function uuidToBytes(uuid: string): Uint8Array {
  const hex = uuid.replace(/-/g, '');
  if (hex.length !== 32) {
    // Generate fallback hash if non-standard UUID
    const encoder = new TextEncoder();
    return new Uint8Array(encoder.encode(uuid).slice(0, 16));
  }
  return hexToBytes(hex);
}

/**
 * Standard HKDF-Expand helper using WebCrypto deriveBits
 */
export async function hkdfExpand(
  prkBytes: Uint8Array,
  infoString: string,
  lengthBytes: number = 32
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const info = encoder.encode(infoString);

  // Import PRK
  const baseKey = await crypto.subtle.importKey(
    'raw',
    prkBytes as any,
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );

  // In RFC 5869, when input is already a pseudorandom key, salt can be empty or zeroed
  const salt = new Uint8Array(32);

  const derivedBuffer = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt as any,
      info: info as any
    },
    baseKey,
    lengthBytes * 8
  );

  return new Uint8Array(derivedBuffer);
}

/**
 * Mandatory Cryptographic Bounds
 * Hard security floor to prevent downgrade attacks from compromised server-supplied headers.
 */
export const MIN_KDF_ITERATIONS = 600000;
export const MAX_KDF_ITERATIONS = 1000000;
export const MIN_SALT_BYTES = 16;

/**
 * Validates KDF iterations and salt length against mandatory security floors.
 * Rejects compromised or downgraded server-supplied parameters.
 */
export function validateKdfParameters(
  iterations: number,
  saltHexOrBytes: string | Uint8Array,
  context: string = 'KDF'
): void {
  if (typeof iterations !== 'number' || isNaN(iterations) || iterations < MIN_KDF_ITERATIONS) {
    throw new Error(
      `Security downgrade attack rejected in ${context}: KDF iterations (${iterations}) is below the mandatory hard floor of ${MIN_KDF_ITERATIONS.toLocaleString()} iterations.`
    );
  }
  if (iterations > MAX_KDF_ITERATIONS) {
    throw new Error(
      `Invalid KDF parameter in ${context}: iterations (${iterations}) exceeds ceiling of ${MAX_KDF_ITERATIONS.toLocaleString()}.`
    );
  }

  const saltBytes = typeof saltHexOrBytes === 'string' ? hexToBytes(saltHexOrBytes) : saltHexOrBytes;
  if (!saltBytes || saltBytes.length < MIN_SALT_BYTES) {
    throw new Error(
      `Security downgrade attack rejected in ${context}: salt length (${saltBytes ? saltBytes.length : 0} bytes) is below the mandatory minimum of ${MIN_SALT_BYTES} bytes.`
    );
  }
}

/**
 * Audits a vault header's cryptographic parameters against mandatory security floors.
 */
export function validateVaultHeaderSecurity(header: {
  iterations: number;
  accountSalt: string;
  vaultSalt: string;
}): void {
  validateKdfParameters(header.iterations, header.accountSalt, 'VaultHeader.accountSalt');
  const vaultSaltBytes = hexToBytes(header.vaultSalt);
  if (vaultSaltBytes.length < MIN_SALT_BYTES) {
    throw new Error(
      `Insecure vault header: vault salt (${vaultSaltBytes.length} bytes) is below mandatory minimum of ${MIN_SALT_BYTES} bytes.`
    );
  }
}

/**
 * Derives the single 600,000-iteration MasterKey and its separated subkeys:
 * - KEK (for wrapping/unwrapping MasterSecret)
 * - ClientAuthHash (for login/registration without leaking KEK)
 */
export async function deriveMasterKeyAndSubkeys(
  passphrase: string,
  accountSaltHex: string,
  iterations: number = MIN_KDF_ITERATIONS
): Promise<{
  masterKeyBytes: Uint8Array;
  kek: CryptoKey;
  clientAuthHash: string;
}> {
  // Enforce mandatory security hard floor (min 600,000 iterations and min 16-byte salt)
  validateKdfParameters(iterations, accountSaltHex, 'deriveMasterKeyAndSubkeys');

  const saltBytes = hexToBytes(accountSaltHex);

  // Unicode NFKC normalization
  const normalizedPass = passphrase.normalize('NFKC');
  const encoder = new TextEncoder();
  const passBytes = encoder.encode(normalizedPass);

  const baseKey = await crypto.subtle.importKey(
    'raw',
    passBytes as any,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  // Single 600,000-iteration PBKDF2 stretch
  const masterKeyBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes as any,
      iterations,
      hash: 'SHA-256'
    },
    baseKey,
    256
  );
  const masterKeyBytes = new Uint8Array(masterKeyBuffer);

  // Derive KEK (AES-256-GCM)
  const kekBytes = await hkdfExpand(masterKeyBytes, 'AegisMark-KEK-v1', 32);
  const kek = await crypto.subtle.importKey(
    'raw',
    kekBytes as any,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );

  // Derive ClientAuthHash
  const authKeyBytes = await hkdfExpand(masterKeyBytes, 'AegisMark-AuthHash-v1', 32);
  const authHashBuffer = await crypto.subtle.digest('SHA-256', authKeyBytes as any);
  const clientAuthHash = bytesToHex(new Uint8Array(authHashBuffer));

  return { masterKeyBytes, kek, clientAuthHash };
}

/**
 * Derives the active RecordKey (AES-256-GCM) from the raw MasterSecret bytes.
 */
export async function deriveRecordKey(masterSecretBytes: Uint8Array): Promise<CryptoKey> {
  const recordKeyBytes = await hkdfExpand(masterSecretBytes, 'AegisMark-RecordKey-v1', 32);
  return await crypto.subtle.importKey(
    'raw',
    recordKeyBytes as any,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Constructs canonical AAD for wrapping MasterSecret:
 * Domain 0x01 for KEK, 0x02 for RecoveryKey.
 */
function constructWrapAad(
  domainType: 1 | 2,
  vaultId: string,
  iterations: number,
  vaultSaltHex: string
): Uint8Array {
  const saltBytes = hexToBytes(vaultSaltHex);
  if (saltBytes.length < MIN_SALT_BYTES) {
    throw new Error(
      `Downgrade attack detected in wrap AAD: vault salt length (${saltBytes.length} bytes) is below mandatory minimum of ${MIN_SALT_BYTES} bytes.`
    );
  }

  // When domainType is 1 (KEK wrap), enforce the mandatory 600,000 iteration floor
  if (domainType === 1 && iterations < MIN_KDF_ITERATIONS) {
    throw new Error(
      `Downgrade attack detected in wrap AAD: iterations (${iterations}) is below mandatory hard floor of ${MIN_KDF_ITERATIONS.toLocaleString()} iterations.`
    );
  }

  const aad = new Uint8Array(40);
  const view = new DataView(aad.buffer);
  view.setUint32(0, domainType, true); // Domain constant LE32
  aad.set(uuidToBytes(vaultId), 4); // 16 bytes vault UUID
  view.setUint32(20, iterations, true); // LE32 iterations
  aad.set(saltBytes.slice(0, 16), 24); // 16 bytes vault salt
  return aad;
}

/**
 * Wraps MasterSecret with AES-256-GCM and canary check.
 */
export async function wrapMasterSecret(
  masterSecretBytes: Uint8Array,
  wrappingKey: CryptoKey,
  domainType: 1 | 2,
  vaultId: string,
  iterations: number,
  vaultSaltHex: string
): Promise<{ iv: string; ciphertext: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aad = constructWrapAad(domainType, vaultId, iterations, vaultSaltHex);

  // Payload includes MasterSecret + Canary String
  const encoder = new TextEncoder();
  const canaryBytes = encoder.encode(CANARY_STRING);
  const payload = new Uint8Array(masterSecretBytes.length + canaryBytes.length);
  payload.set(masterSecretBytes, 0);
  payload.set(canaryBytes, masterSecretBytes.length);

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as any, additionalData: aad as any },
    wrappingKey,
    payload as any
  );

  return {
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(encryptedBuffer))
  };
}

/**
 * Unwraps MasterSecret with AES-256-GCM and verifies canary.
 * Enforces mandatory cryptographic floor to reject compromised server-supplied headers.
 */
export async function unwrapMasterSecret(
  wrapped: { iv: string; ciphertext: string },
  unwrappingKey: CryptoKey,
  domainType: 1 | 2,
  vaultId: string,
  iterations: number,
  vaultSaltHex: string
): Promise<Uint8Array> {
  const saltBytes = hexToBytes(vaultSaltHex);
  if (saltBytes.length < MIN_SALT_BYTES) {
    throw new Error(
      `Downgrade attack detected: vault salt length (${saltBytes.length} bytes) is below mandatory minimum of ${MIN_SALT_BYTES} bytes.`
    );
  }

  // When domainType is 1 (KEK unwrap), enforce the mandatory 600,000 iteration hard floor
  if (domainType === 1 && iterations < MIN_KDF_ITERATIONS) {
    throw new Error(
      `Downgrade attack detected: KDF iterations (${iterations}) is below the mandatory hard floor of ${MIN_KDF_ITERATIONS.toLocaleString()} iterations.`
    );
  }

  const iv = base64ToBytes(wrapped.iv);
  const ciphertextWithTag = base64ToBytes(wrapped.ciphertext);
  const aad = constructWrapAad(domainType, vaultId, iterations, vaultSaltHex);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as any, additionalData: aad as any },
    unwrappingKey,
    ciphertextWithTag as any
  );

  const decryptedBytes = new Uint8Array(decryptedBuffer);
  const secretLength = 32;
  const canaryBytes = decryptedBytes.slice(secretLength);
  const canaryString = new TextDecoder().decode(canaryBytes);

  if (canaryString !== CANARY_STRING) {
    throw new Error('Key unwrapping canary verification failed: invalid decryption result.');
  }

  return decryptedBytes.slice(0, secretLength);
}

/**
 * Constructs the canonical 48-byte binary AAD for bookmark records:
 * [0..3]:   SchemaVersion (LE32 = 1)
 * [4..7]:   KeyVersion (LE32)
 * [8..23]:  Record UUID (16 bytes)
 * [24..31]: Revision (LE64)
 * [32..47]: Vault UUID (16 bytes)
 */
export function constructRecordAad(
  keyVersion: number,
  recordId: string,
  revision: number,
  vaultId: string
): Uint8Array {
  const aad = new Uint8Array(48);
  const view = new DataView(aad.buffer);
  view.setUint32(0, 1, true); // SchemaVersion = 1
  view.setUint32(4, keyVersion, true); // KeyVersion
  aad.set(uuidToBytes(recordId), 8);
  view.setBigUint64(24, BigInt(revision), true);
  aad.set(uuidToBytes(vaultId), 32);
  return aad;
}

/**
 * Encrypts a bookmark item into an EncryptedRecord using AES-256-GCM and fresh 96-bit random IV.
 */
export async function encryptBookmarkRecord(
  item: BookmarkItem,
  recordKey: CryptoKey,
  vaultId: string,
  keyVersion: number = 1,
  revision: number = 1
): Promise<EncryptedRecord> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aad = constructRecordAad(keyVersion, item.id, revision, vaultId);

  const payloadString = JSON.stringify(item);
  const payloadBytes = new TextEncoder().encode(payloadString);

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as any, additionalData: aad as any },
    recordKey,
    payloadBytes as any
  );

  return {
    id: item.id,
    vaultId,
    keyVersion,
    revision,
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(encryptedBuffer)),
    updatedAt: item.updatedAt
  };
}

/**
 * Decrypts an EncryptedRecord back into a BookmarkItem using AES-256-GCM.
 */
export async function decryptBookmarkRecord(
  record: EncryptedRecord,
  recordKey: CryptoKey,
  vaultId: string
): Promise<BookmarkItem> {
  const iv = base64ToBytes(record.iv);
  const ciphertextWithTag = base64ToBytes(record.ciphertext);
  const aad = constructRecordAad(record.keyVersion, record.id, record.revision, vaultId);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as any, additionalData: aad as any },
    recordKey,
    ciphertextWithTag as any
  );

  const jsonString = new TextDecoder().decode(decryptedBuffer);
  const item: BookmarkItem = JSON.parse(jsonString);

  // Integrity assertion: ensure decrypted ID matches record ID
  if (item.id !== record.id) {
    throw new Error('Integrity mismatch: decrypted bookmark ID does not match record envelope.');
  }

  return item;
}
