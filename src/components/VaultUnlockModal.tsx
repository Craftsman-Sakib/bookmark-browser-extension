/**
 * @license
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 sakibcraft@gmail.com
 * 
 * Vault Unlock & Initialization Modal with BIP39 Test-Unwrap Verification
 */

import React, { useState } from 'react';
import { Shield, Key, Eye, EyeOff, AlertTriangle, CheckCircle, RefreshCw, Copy, Check } from 'lucide-react';
import { VaultHeader } from '../types';
import {
  deriveMasterKeyAndSubkeys,
  deriveRecordKey,
  wrapMasterSecret,
  unwrapMasterSecret,
  validateVaultHeaderSecurity,
  bytesToHex,
  hexToBytes
} from '../crypto/engine';
import {
  generateBip39Mnemonic,
  validateBip39Mnemonic,
  deriveRecoveryKey,
  deriveRecoveryAuthHash
} from '../crypto/bip39';
import { saveVaultHeader } from '../storage/db';

interface VaultUnlockModalProps {
  header: VaultHeader | null;
  onUnlockSuccess: (
    masterSecret: CryptoKey,
    recordKey: CryptoKey,
    mode: 'local' | 'cloud',
    userEmail?: string
  ) => void;
  onHeaderCreated: (newHeader: VaultHeader) => void;
}

export const VaultUnlockModal: React.FC<VaultUnlockModalProps> = ({
  header,
  onUnlockSuccess,
  onHeaderCreated
}) => {
  // If no header exists, we are in initial setup mode
  const isSetupMode = !header;

  const [activeStep, setActiveStep] = useState<'choose_mode' | 'show_mnemonic' | 'verify_mnemonic' | 'set_passphrase' | 'unlock' | 'recover'>(
    isSetupMode ? 'choose_mode' : 'unlock'
  );

  const [selectedMode, setSelectedMode] = useState<'local' | 'cloud'>('local');
  const [email, setEmail] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Mnemonic State for Setup & Recovery
  const [generatedMnemonic, setGeneratedMnemonic] = useState('');
  const [verifyMnemonicInput, setVerifyMnemonicInput] = useState('');
  const [recoveryMnemonicInput, setRecoveryMnemonicInput] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Generate Mnemonic on moving to mnemonic step
  const handleStartSetup = async (mode: 'local' | 'cloud') => {
    setSelectedMode(mode);
    setIsProcessing(true);
    setErrorMsg('');
    try {
      const mnemonic = await generateBip39Mnemonic();
      setGeneratedMnemonic(mnemonic);
      setActiveStep('show_mnemonic');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate cryptographic entropy');
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedMnemonic);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Verify Mnemonic Setup Challenge
  const handleVerifySetupMnemonic = async () => {
    setErrorMsg('');
    const input = verifyMnemonicInput.trim().toLowerCase();
    const target = generatedMnemonic.trim().toLowerCase();

    if (input !== target) {
      setErrorMsg('The 24 words entered do not match. Please ensure you have accurately recorded the phrase.');
      return;
    }

    const isValid = await validateBip39Mnemonic(input);
    if (!isValid) {
      setErrorMsg('Mnemonic checksum verification failed. Please re-check the words.');
      return;
    }

    setActiveStep('set_passphrase');
  };

  // Commit Initial Vault Setup
  const handleCommitVaultSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (passphrase.length < 8) {
      setErrorMsg('Master Passphrase must be at least 8 characters.');
      return;
    }
    if (passphrase !== confirmPassphrase) {
      setErrorMsg('Passphrases do not match.');
      return;
    }
    if (selectedMode === 'cloud' && !email.trim()) {
      setErrorMsg('Email is required for Cloud Sync.');
      return;
    }

    setIsProcessing(true);
    try {
      const vaultId = crypto.randomUUID();
      const accountSaltBytes = crypto.getRandomValues(new Uint8Array(16));
      const accountSaltHex = bytesToHex(accountSaltBytes);
      const vaultSaltBytes = crypto.getRandomValues(new Uint8Array(16));
      const vaultSaltHex = bytesToHex(vaultSaltBytes);
      const iterations = 600000;

      // 1. Derive KEK and ClientAuthHash from passphrase
      const { kek } = await deriveMasterKeyAndSubkeys(passphrase, accountSaltHex, iterations);

      // 2. Generate cryptographically random 256-bit MasterSecret
      const masterSecretBytes = crypto.getRandomValues(new Uint8Array(32));

      // 3. Derive RecoveryKey and RecoveryAuthHash from verified 24 words
      const recoveryKey = await deriveRecoveryKey(generatedMnemonic, vaultId);
      const recoveryAuthHash = await deriveRecoveryAuthHash(recoveryKey);

      // 4. Wrap MasterSecret with KEK (Domain 0x01)
      const wrappedSecretKek = await wrapMasterSecret(
        masterSecretBytes,
        kek,
        1,
        vaultId,
        iterations,
        vaultSaltHex
      );

      // 5. Wrap MasterSecret with RecoveryKey (Domain 0x02)
      const wrappedSecretRecovery = await wrapMasterSecret(
        masterSecretBytes,
        recoveryKey,
        2,
        vaultId,
        2048,
        vaultSaltHex
      );

      // 6. Test-unwrap verification challenge (ensures recovery unwrapping succeeds before commit)
      const testUnwrappedBytes = await unwrapMasterSecret(
        wrappedSecretRecovery,
        recoveryKey,
        2,
        vaultId,
        2048,
        vaultSaltHex
      );
      if (testUnwrappedBytes.length !== 32) {
        throw new Error('Internal setup verification failed: recovery unwrap test failed.');
      }

      // 7. Construct VaultHeader
      const newHeader: VaultHeader = {
        vaultId,
        keyVersion: 1,
        kdfType: 'pbkdf2',
        iterations,
        accountSalt: accountSaltHex,
        vaultSalt: vaultSaltHex,
        wrappedSecretKek,
        wrappedSecretRecovery,
        recoveryAuthHash,
        schemaVersion: 1,
        updatedAt: Date.now()
      };

      await saveVaultHeader(newHeader);
      onHeaderCreated(newHeader);

      // Import MasterSecret as CryptoKey
      const masterSecretKey = await crypto.subtle.importKey(
        'raw',
        masterSecretBytes as any,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
      );
      const recordKey = await deriveRecordKey(masterSecretBytes);

      onUnlockSuccess(masterSecretKey, recordKey, selectedMode, email.trim() || undefined);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to initialize encrypted vault.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Regular Vault Unlock
  const handleUnlockVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!header) return;
    setErrorMsg('');
    setIsProcessing(true);

    try {
      // 0. Audit header against mandatory cryptographic bounds (min 600k iter, min 16-byte salt)
      validateVaultHeaderSecurity(header);

      // 1. Derive KEK from entered passphrase using stored parameters
      const { kek } = await deriveMasterKeyAndSubkeys(
        passphrase,
        header.accountSalt,
        header.iterations
      );

      // 2. Unwrap MasterSecret using KEK (Domain 0x01) with AAD parameter binding
      const masterSecretBytes = await unwrapMasterSecret(
        header.wrappedSecretKek,
        kek,
        1,
        header.vaultId,
        header.iterations,
        header.vaultSalt
      );

      // 3. Derive RecordKey for bookmarks
      const masterSecretKey = await crypto.subtle.importKey(
        'raw',
        masterSecretBytes as any,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
      );
      const recordKey = await deriveRecordKey(masterSecretBytes);

      onUnlockSuccess(masterSecretKey, recordKey, selectedMode, email.trim() || undefined);
    } catch (err: any) {
      if (err?.message?.includes('downgrade') || err?.message?.includes('Security') || err?.message?.includes('Insecure')) {
        setErrorMsg(`Security Alert: ${err.message}`);
      } else {
        setErrorMsg('Incorrect master passphrase. Please try again or use your 24-word recovery phrase.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Recover Vault using 24-Word Mnemonic
  const handleRecoverWithMnemonic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!header) return;
    setErrorMsg('');

    const inputMnemonic = recoveryMnemonicInput.trim().toLowerCase();
    const isValid = await validateBip39Mnemonic(inputMnemonic);
    if (!isValid) {
      setErrorMsg('Invalid 24-word recovery phrase or invalid checksum. Please verify your phrase.');
      return;
    }

    if (passphrase.length < 8) {
      setErrorMsg('New master passphrase must be at least 8 characters.');
      return;
    }
    if (passphrase !== confirmPassphrase) {
      setErrorMsg('New passphrases do not match.');
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Derive RecoveryKey from 24 words
      const recoveryKey = await deriveRecoveryKey(inputMnemonic, header.vaultId);

      // 2. Unwrap MasterSecret using RecoveryKey (Domain 0x02)
      const masterSecretBytes = await unwrapMasterSecret(
        header.wrappedSecretRecovery,
        recoveryKey,
        2,
        header.vaultId,
        2048,
        header.vaultSalt
      );

      // 3. Derive new KEK from new passphrase
      const newAccountSaltBytes = crypto.getRandomValues(new Uint8Array(16));
      const newAccountSaltHex = bytesToHex(newAccountSaltBytes);
      const { kek } = await deriveMasterKeyAndSubkeys(
        passphrase,
        newAccountSaltHex,
        header.iterations
      );

      // 4. Re-wrap MasterSecret with new KEK
      const newWrappedSecretKek = await wrapMasterSecret(
        masterSecretBytes,
        kek,
        1,
        header.vaultId,
        header.iterations,
        header.vaultSalt
      );

      // 5. Update header
      const updatedHeader: VaultHeader = {
        ...header,
        accountSalt: newAccountSaltHex,
        wrappedSecretKek: newWrappedSecretKek,
        updatedAt: Date.now()
      };

      await saveVaultHeader(updatedHeader);
      onHeaderCreated(updatedHeader);

      const masterSecretKey = await crypto.subtle.importKey(
        'raw',
        masterSecretBytes as any,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
      );
      const recordKey = await deriveRecordKey(masterSecretBytes);

      onUnlockSuccess(masterSecretKey, recordKey, 'local');
    } catch (err: any) {
      setErrorMsg(err.message || 'Recovery unwrapping failed. Please check your 24 words.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 text-slate-100">
        {/* Header Icon & Title */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-display text-white">
              {activeStep === 'choose_mode' && 'Initialize Encrypted Vault'}
              {activeStep === 'show_mnemonic' && 'Your 24-Word Emergency Recovery Key'}
              {activeStep === 'verify_mnemonic' && 'Confirm Your 24-Word Key'}
              {activeStep === 'set_passphrase' && 'Set Master Passphrase'}
              {activeStep === 'unlock' && 'Unlock AegisMark Vault'}
              {activeStep === 'recover' && 'Recover Vault with 24 Words'}
            </h2>
            <p className="text-xs text-slate-400">
              Zero-Knowledge Client-Side AES-256-GCM Encryption
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: CHOOSE MODE (Local vs Cloud) */}
        {activeStep === 'choose_mode' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              Choose how you would like to run your encrypted bookmark vault:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedMode('local')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  selectedMode === 'local'
                    ? 'border-emerald-500 bg-emerald-500/10 text-white'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-semibold text-sm text-slate-200 mb-1">Local Vault Only</div>
                <div className="text-xs text-slate-400 leading-relaxed">
                  100% offline, zero server accounts. Unlimited bookmarks in local IndexedDB.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMode('cloud')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  selectedMode === 'cloud'
                    ? 'border-emerald-500 bg-emerald-500/10 text-white'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-semibold text-sm text-slate-200 mb-1">Encrypted Cloud Sync</div>
                <div className="text-xs text-slate-400 leading-relaxed">
                  Zero-knowledge sync across Chrome, Edge, Firefox, and mobile devices.
                </div>
              </button>
            </div>

            {selectedMode === 'cloud' && (
              <div className="pt-2">
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Account Email (used for account sync handshake)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}

            <button
              onClick={() => handleStartSetup(selectedMode)}
              disabled={isProcessing}
              className="w-full mt-4 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
            >
              <span>Continue to Recovery Key Generation</span>
            </button>
          </div>
        )}

        {/* STEP 2: DISPLAY 24-WORD BIP39 MNEMONIC */}
        {activeStep === 'show_mnemonic' && (
          <div className="space-y-4">
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300 text-xs leading-relaxed">
              <strong>CRITICAL SECURITY STEP:</strong> Write down these 24 words in exact order and store them in a secure physical location. If you forget your master passphrase, this is the <em>only</em> way to recover your encrypted bookmarks.
            </div>

            {/* 24-word grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono max-h-56 overflow-y-auto">
              {generatedMnemonic.split(' ').map((word, idx) => (
                <div key={idx} className="flex items-center gap-1.5 py-1 px-2 rounded bg-slate-900 border border-slate-800/60">
                  <span className="text-slate-500 text-[10px] tabular-nums">{idx + 1}.</span>
                  <span className="text-emerald-300 font-medium">{word}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={copyToClipboard}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Copied to Clipboard' : 'Copy Words'}</span>
              </button>
            </div>

            <button
              onClick={() => setActiveStep('verify_mnemonic')}
              className="w-full mt-3 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-lg text-sm transition-colors"
            >
              I Have Securely Saved My 24 Words
            </button>
          </div>
        )}

        {/* STEP 3: VERIFY MNEMONIC CHALLENGE */}
        {activeStep === 'verify_mnemonic' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-300">
              Please paste or type your full 24-word recovery phrase below to verify you have correctly recorded it:
            </p>

            <textarea
              value={verifyMnemonicInput}
              onChange={(e) => setVerifyMnemonicInput(e.target.value)}
              placeholder="word1 word2 word3 ... word24"
              rows={4}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500 resize-none"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveStep('show_mnemonic')}
                className="w-1/3 py-2 px-3 border border-slate-700 hover:bg-slate-800 text-slate-300 font-medium rounded-lg text-xs transition-colors"
              >
                Back to Words
              </button>
              <button
                type="button"
                onClick={handleVerifySetupMnemonic}
                className="w-2/3 py-2 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-lg text-xs transition-colors"
              >
                Verify & Continue
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: SET MASTER PASSPHRASE */}
        {activeStep === 'set_passphrase' && (
          <form onSubmit={handleCommitVaultSetup} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Set Master Passphrase (minimum 8 characters)
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Enter strong master passphrase..."
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Confirm Master Passphrase
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassphrase}
                onChange={(e) => setConfirmPassphrase(e.target.value)}
                placeholder="Re-enter master passphrase..."
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 leading-relaxed font-mono">
              Encryption: PBKDF2-HMAC-SHA256 (600,000 iterations) + AES-256-GCM. Passphrases are never sent to any server.
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
            >
              {isProcessing && <RefreshCw className="w-4 h-4 animate-spin" />}
              <span>{isProcessing ? 'Deriving Keys & Encrypting...' : 'Initialize & Unlock Vault'}</span>
            </button>
          </form>
        )}

        {/* REGULAR UNLOCK VIEW */}
        {activeStep === 'unlock' && (
          <form onSubmit={handleUnlockVault} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Master Passphrase
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Enter your master passphrase..."
                  required
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
            >
              {isProcessing && <RefreshCw className="w-4 h-4 animate-spin" />}
              <span>{isProcessing ? 'Verifying & Unlocking...' : 'Unlock Vault'}</span>
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  setActiveStep('recover');
                }}
                className="text-xs text-slate-400 hover:text-emerald-400 transition-colors"
              >
                Forgot passphrase? Recover with 24-Word Key →
              </button>
            </div>
          </form>
        )}

        {/* RECOVER WITH 24 WORDS */}
        {activeStep === 'recover' && (
          <form onSubmit={handleRecoverWithMnemonic} className="space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed">
              Enter your original 24-word BIP39 recovery phrase and set a new master passphrase:
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                24-Word Recovery Phrase
              </label>
              <textarea
                value={recoveryMnemonicInput}
                onChange={(e) => setRecoveryMnemonicInput(e.target.value)}
                placeholder="word1 word2 word3 ... word24"
                rows={3}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                New Master Passphrase
              </label>
              <input
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Minimum 8 characters"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Confirm New Master Passphrase
              </label>
              <input
                type="password"
                value={confirmPassphrase}
                onChange={(e) => setConfirmPassphrase(e.target.value)}
                placeholder="Re-enter new passphrase"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  setActiveStep('unlock');
                }}
                className="w-1/3 py-2 px-3 border border-slate-700 hover:bg-slate-800 text-slate-300 font-medium rounded-lg text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="w-2/3 py-2 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                {isProcessing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{isProcessing ? 'Recovering...' : 'Reset & Unlock'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
