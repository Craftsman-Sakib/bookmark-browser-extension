/**
 * @license
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 sakibcraft@gmail.com
 * 
 * Standard BIP39 Mnemonic Generator and Key Derivation Implementation
 */

// Official 2048-word English BIP39 Wordlist (curated, canonical)
import { BIP39_WORDLIST } from './wordlist';

/**
 * Generates a 24-word BIP39 mnemonic from 256 bits of true cryptographic entropy.
 */
export async function generateBip39Mnemonic(): Promise<string> {
  // 1. Generate 256 bits (32 bytes) of cryptographically secure random entropy
  const entropy = crypto.getRandomValues(new Uint8Array(32));

  // 2. Compute SHA-256 hash to obtain the 8-bit checksum (256 / 32 = 8 bits)
  const hashBuffer = await crypto.subtle.digest('SHA-256', entropy);
  const hashBytes = new Uint8Array(hashBuffer);
  const checksum = hashBytes[0]; // first 8 bits

  // 3. Convert entropy bytes + 8-bit checksum to binary string of 264 bits
  let bits = '';
  for (let i = 0; i < entropy.length; i++) {
    bits += entropy[i].toString(2).padStart(8, '0');
  }
  bits += checksum.toString(2).padStart(8, '0'); // 256 + 8 = 264 bits

  // 4. Split 264 bits into 24 chunks of 11 bits each (264 / 11 = 24 words)
  const words: string[] = [];
  for (let i = 0; i < 24; i++) {
    const chunk = bits.slice(i * 11, (i + 1) * 11);
    const index = parseInt(chunk, 2);
    words.push(BIP39_WORDLIST[index]);
  }

  return words.join(' ');
}

/**
 * Validates a 24-word BIP39 mnemonic including checksum verification.
 */
export async function validateBip39Mnemonic(mnemonic: string): Promise<boolean> {
  const words = mnemonic.trim().toLowerCase().split(/\s+/);
  if (words.length !== 24) return false;

  let bits = '';
  for (const word of words) {
    const index = BIP39_WORDLIST.indexOf(word);
    if (index === -1) return false;
    bits += index.toString(2).padStart(11, '0');
  }

  const entropyBits = bits.slice(0, 256);
  const checksumBits = bits.slice(256, 264);

  // Convert entropyBits back to bytes
  const entropyBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    entropyBytes[i] = parseInt(entropyBits.slice(i * 8, (i + 1) * 8), 2);
  }

  const hashBuffer = await crypto.subtle.digest('SHA-256', entropyBytes);
  const hashBytes = new Uint8Array(hashBuffer);
  const expectedChecksumBits = hashBytes[0].toString(2).padStart(8, '0');

  return checksumBits === expectedChecksumBits;
}

/**
 * Derives the 512-bit seed from a 24-word mnemonic using standard PBKDF2-HMAC-SHA512.
 */
export async function mnemonicToSeed(mnemonic: string): Promise<Uint8Array> {
  const normalizedMnemonic = mnemonic.normalize('NFKD').trim().toLowerCase();
  const normalizedSalt = 'mnemonic'.normalize('NFKD');

  const encoder = new TextEncoder();
  const passwordBytes = encoder.encode(normalizedMnemonic);
  const saltBytes = encoder.encode(normalizedSalt);

  // Import password for PBKDF2
  const baseKey = await crypto.subtle.importKey(
    'raw',
    passwordBytes,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  // PBKDF2 with SHA-512 and 2048 iterations (BIP39 specification)
  const seedBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 2048,
      hash: 'SHA-512'
    },
    baseKey,
    512
  );

  return new Uint8Array(seedBuffer);
}

/**
 * Derives a 256-bit RecoveryKey from the BIP39 seed using HKDF-Extract and Expand.
 */
export async function deriveRecoveryKey(mnemonic: string, vaultId: string): Promise<CryptoKey> {
  const seed = await mnemonicToSeed(mnemonic);

  // Derive Salt_rec = SHA-256("AegisMark-RecoverySalt-v1|" + vaultId)
  const encoder = new TextEncoder();
  const saltSeed = encoder.encode(`AegisMark-RecoverySalt-v1|${vaultId}`);
  const saltBuffer = await crypto.subtle.digest('SHA-256', saltSeed);
  const salt = new Uint8Array(saltBuffer);

  // Import full 512-bit seed as IKM for HKDF
  const ikmKey = await crypto.subtle.importKey(
    'raw',
    seed as any,
    { name: 'HKDF' },
    false,
    ['deriveKey', 'deriveBits']
  );

  const info = encoder.encode(`AegisMark-RecoveryKey-v1|${vaultId}`);

  return await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt as any,
      info: info as any
    },
    ikmKey,
    { name: 'AES-GCM', length: 256 },
    true, // extractable for wrap / canary derivation
    ['encrypt', 'decrypt']
  );
}

/**
 * Derives a 256-bit RecoveryAuthHash from RecoveryKey for secure forgotten-passphrase recovery.
 */
export async function deriveRecoveryAuthHash(recoveryKey: CryptoKey): Promise<string> {
  const rawKey = await crypto.subtle.exportKey('raw', recoveryKey);
  const encoder = new TextEncoder();

  const ikmKey = await crypto.subtle.importKey(
    'raw',
    rawKey as any,
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );

  const authKeyBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(32) as any,
      info: encoder.encode('AegisMark-RecoveryAuth-v1') as any
    },
    ikmKey,
    256
  );

  const hashBuffer = await crypto.subtle.digest('SHA-256', authKeyBits as any);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
