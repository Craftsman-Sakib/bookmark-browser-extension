/**
 * @license
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 sakibcraft@gmail.com
 * 
 * Automated Cryptographic Known-Answer & Tamper Verification Suite
 */

import { generateBip39Mnemonic, validateBip39Mnemonic, deriveRecoveryKey } from '../bip39';
import {
  deriveMasterKeyAndSubkeys,
  deriveRecordKey,
  wrapMasterSecret,
  unwrapMasterSecret,
  encryptBookmarkRecord,
  decryptBookmarkRecord,
  constructRecordAad,
  bytesToHex
} from '../engine';
import { BookmarkItem } from '../../types';

export async function runCryptoTestSuite(): Promise<{
  passed: number;
  failed: number;
  results: Array<{ test: string; status: 'passed' | 'failed'; error?: string }>;
}> {
  const results: Array<{ test: string; status: 'passed' | 'failed'; error?: string }> = [];

  // Helper assertion
  const assert = (condition: boolean, testName: string) => {
    if (condition) {
      results.push({ test: testName, status: 'passed' });
    } else {
      results.push({ test: testName, status: 'failed', error: 'Assertion failed' });
    }
  };

  try {
    // 1. BIP39 24-Word Generation & Checksum Validation
    const mnemonic = await generateBip39Mnemonic();
    const words = mnemonic.split(' ');
    assert(words.length === 24, 'BIP39: Generates exactly 24 words from 256 bits of entropy');

    const isValid = await validateBip39Mnemonic(mnemonic);
    assert(isValid, 'BIP39: Validates 8-bit checksum correctly');

    // Test corrupted mnemonic
    const corruptedWords = [...words];
    corruptedWords[0] = corruptedWords[0] === 'abandon' ? 'ability' : 'abandon';
    const isCorruptedValid = await validateBip39Mnemonic(corruptedWords.join(' '));
    assert(!isCorruptedValid, 'BIP39: Detects and rejects tampered mnemonic words');

    // 2. KDF Derivation & Subkey Separation
    const testPass = 'AegisMark-Secure-Passphrase-2026!';
    const accountSaltHex = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
    const { kek, clientAuthHash } = await deriveMasterKeyAndSubkeys(testPass, accountSaltHex, 600000);
    assert(kek !== null, 'KDF: Successfully derived KEK via 600,000 PBKDF2 iterations');
    assert(clientAuthHash.length === 64, 'KDF: Derived 256-bit ClientAuthHash (64 hex characters)');

    // 3. MasterSecret Wrapping & Canary Verification
    const vaultId = crypto.randomUUID();
    const vaultSaltHex = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
    const rawMasterSecret = crypto.getRandomValues(new Uint8Array(32));

    const wrapped = await wrapMasterSecret(rawMasterSecret, kek, 1, vaultId, 600000, vaultSaltHex);
    assert(Boolean(wrapped.iv && wrapped.ciphertext), 'Wrap: Wrapped MasterSecret with AES-256-GCM and Domain AAD');

    const unwrappedSecret = await unwrapMasterSecret(wrapped, kek, 1, vaultId, 600000, vaultSaltHex);
    assert(
      bytesToHex(unwrappedSecret) === bytesToHex(rawMasterSecret),
      'Unwrap: MasterSecret successfully unwrapped and canary verified'
    );

    // 4. AAD Tamper Detection & Downgrade Attack Rejection
    let wrapTampered = false;
    try {
      // Attempt unwrap with wrong iterations (simulating server KDF parameter tampering)
      await unwrapMasterSecret(wrapped, kek, 1, vaultId, 700000, vaultSaltHex);
    } catch {
      wrapTampered = true;
    }
    assert(wrapTampered, 'Wrap AAD: Successfully rejects KDF parameter tampering');

    // 4b. Mandatory KDF Hard Floor (min 600k) & Minimum 16-byte Salt Rejection
    let downgradeIterationsCaught = false;
    try {
      // Attacker attempts downgrade to 10,000 iterations
      await deriveMasterKeyAndSubkeys(testPass, accountSaltHex, 10000);
    } catch (e: any) {
      downgradeIterationsCaught = e.message.includes('mandatory hard floor') || e.message.includes('downgrade');
    }
    assert(downgradeIterationsCaught, 'Security: Mandatory 600,000 iteration floor rejects downgrade attacks');

    let shortSaltCaught = false;
    try {
      // Attacker attempts 8-byte salt (weak entropy)
      const shortSaltHex = bytesToHex(crypto.getRandomValues(new Uint8Array(8)));
      await deriveMasterKeyAndSubkeys(testPass, shortSaltHex, 600000);
    } catch (e: any) {
      shortSaltCaught = e.message.includes('mandatory minimum of 16 bytes');
    }
    assert(shortSaltCaught, 'Security: Enforces mandatory minimum 16-byte salt length');

    // 5. Bookmark Record Encryption with 48-byte AAD
    const recordKey = await deriveRecordKey(rawMasterSecret);
    const testBookmark: BookmarkItem = {
      id: crypto.randomUUID(),
      title: 'OWASP Cryptographic Storage Cheat Sheet',
      url: 'https://cheatsheetseries.owasp.org',
      folderId: 'f_research',
      tags: ['owasp', 'security'],
      notes: 'Standard recommendations for PBKDF2, Argon2id and AES-GCM.',
      isFavorite: true,
      isInTrash: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const encryptedRecord = await encryptBookmarkRecord(testBookmark, recordKey, vaultId, 1, 1);
    assert(Boolean(encryptedRecord.iv && encryptedRecord.ciphertext), 'Encrypt: Encrypted bookmark with AES-256-GCM');

    const decryptedBookmark = await decryptBookmarkRecord(encryptedRecord, recordKey, vaultId);
    assert(
      decryptedBookmark.id === testBookmark.id && decryptedBookmark.url === testBookmark.url,
      'Decrypt: Successfully decrypted bookmark with 48-byte AAD and matching record ID'
    );

    // 6. Record Tamper Detection
    let recordTampered = false;
    try {
      // Modify record revision in envelope to test AAD mismatch
      const tamperedRecord = { ...encryptedRecord, revision: 2 };
      await decryptBookmarkRecord(tamperedRecord, recordKey, vaultId);
    } catch {
      recordTampered = true;
    }
    assert(recordTampered, 'Record AAD: Successfully detects revision/AAD tampering');

    // 7. BIP39 Recovery Key Test-Unwrap
    const recoveryKey = await deriveRecoveryKey(mnemonic, vaultId);
    const wrappedRecovery = await wrapMasterSecret(rawMasterSecret, recoveryKey, 2, vaultId, 2048, vaultSaltHex);
    const unwrappedRecovery = await unwrapMasterSecret(wrappedRecovery, recoveryKey, 2, vaultId, 2048, vaultSaltHex);
    assert(
      bytesToHex(unwrappedRecovery) === bytesToHex(rawMasterSecret),
      'Recovery: Successfully unwrapped MasterSecret using 24-word recovery key'
    );

  } catch (err: any) {
    results.push({ test: 'Global Test Suite', status: 'failed', error: err.message });
  }

  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;

  return { passed, failed, results };
}
