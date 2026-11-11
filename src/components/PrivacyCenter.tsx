/**
 * @license
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 sakibcraft@gmail.com
 * 
 * Security Center, Storage Quota Diagnostics & Honest Metadata Audit
 */

import React, { useEffect, useState } from 'react';
import { VaultHeader } from '../types';
import { getStorageDiagnostics, clearEntireDatabase } from '../storage/db';
import {
  Shield,
  HardDrive,
  Key,
  Lock,
  AlertTriangle,
  Info,
  CheckCircle,
  FileText
} from 'lucide-react';

interface PrivacyCenterProps {
  header: VaultHeader | null;
  onResetVault: () => void;
}

export const PrivacyCenter: React.FC<PrivacyCenterProps> = ({ header, onResetVault }) => {
  const [diagnostics, setDiagnostics] = useState<{
    usageBytes: number;
    quotaBytes: number;
    percentageUsed: number;
    recordCount: number;
  }>({ usageBytes: 0, quotaBytes: 0, percentageUsed: 0, recordCount: 0 });

  const [confirmWipe, setConfirmWipe] = useState(false);

  useEffect(() => {
    getStorageDiagnostics().then(setDiagnostics);
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const handleWipeDatabase = async () => {
    await clearEntireDatabase();
    onResetVault();
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Overview Banner */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold font-display text-white">
            Security & Privacy Architecture
          </h2>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            AegisMark enforces client-side zero-knowledge encryption: your URLs, titles, notes, and tags are encrypted on your local machine using AES-256-GCM before storage or cloud transmission.
          </p>
        </div>
      </div>

      {/* Grid: Storage Diagnostics & Active Cryptographic Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Local Storage Quota */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-emerald-400" />
              <span>Storage Quota Diagnostics</span>
            </span>
            <span className="text-[11px] font-mono text-emerald-400">
              {diagnostics.recordCount} Encrypted Records
            </span>
          </div>

          <div className="space-y-2 mb-3">
            <div className="flex justify-between text-xs text-slate-400">
              <span>IndexedDB Usage</span>
              <span className="font-mono text-slate-200">
                {formatBytes(diagnostics.usageBytes)} / {formatBytes(diagnostics.quotaBytes)}
              </span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(1, Math.min(100, diagnostics.percentageUsed))}%` }}
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed font-mono">
            High-capacity client-side persistence with persistent storage request. Zero artificial local storage caps.
          </p>
        </div>

        {/* Card 2: Cryptographic Parameters */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Key className="w-4 h-4 text-emerald-400" />
              <span>Active Cryptographic Parameters</span>
            </span>
            <span className="text-[11px] font-mono text-emerald-400">
              KeyVersion {header?.keyVersion || 1}
            </span>
          </div>

          <div className="space-y-1.5 text-xs text-slate-400 font-mono">
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span>Symmetric Cipher</span>
              <span className="text-slate-200">AES-256-GCM (256-bit)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span>Key Derivation</span>
              <span className="text-slate-200">PBKDF2-HMAC-SHA256</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span>KDF Iterations</span>
              <span className="text-slate-200 tabular-nums">
                {header?.iterations.toLocaleString() || '600,000'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span>Record AAD Length</span>
              <span className="text-slate-200">48 Bytes (Canonical Binary)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Honest Server-Observable Metadata Audit Table */}
      <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-400" />
          <span>Honest Metadata Disclosure Audit</span>
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          In compliance with extension store guidelines and privacy first engineering, this audit explicitly specifies what is cryptographically encrypted versus operational metadata observed by the sync server:
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-800 rounded-lg overflow-hidden font-mono">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Information Type</th>
                <th className="py-2.5 px-3">Relay Visibility</th>
                <th className="py-2.5 px-3">Cryptographic Protection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              <tr>
                <td className="py-2 px-3 font-semibold text-slate-200">Bookmark URLs & Titles</td>
                <td className="py-2 px-3 text-emerald-400 font-bold">NO (Encrypted)</td>
                <td className="py-2 px-3 text-slate-400">Authenticated AES-256-GCM Ciphertext</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold text-slate-200">Folders, Tags & Notes</td>
                <td className="py-2 px-3 text-emerald-400 font-bold">NO (Encrypted)</td>
                <td className="py-2 px-3 text-slate-400">Authenticated AES-256-GCM Ciphertext</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold text-slate-200">Favorites & Read State</td>
                <td className="py-2 px-3 text-emerald-400 font-bold">NO (Encrypted)</td>
                <td className="py-2 px-3 text-slate-400">Authenticated AES-256-GCM Ciphertext</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold text-slate-200">Record UUID & Revision</td>
                <td className="py-2 px-3 text-amber-400">YES (Observable)</td>
                <td className="py-2 px-3 text-slate-400">Required for atomic CAS sync & conflict detection</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold text-slate-200">Device ID & Revision</td>
                <td className="py-2 px-3 text-amber-400">YES (Observable)</td>
                <td className="py-2 px-3 text-slate-400">Required for device authorization & revocation</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold text-slate-200">Payload Byte Length & Timing</td>
                <td className="py-2 px-3 text-amber-400">YES (Observable)</td>
                <td className="py-2 px-3 text-slate-400">Inherent to TLS network packet transmission</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Honest Web Companion vs Extension Security Boundary */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 space-y-2">
        <div className="font-semibold text-slate-200 flex items-center gap-1.5">
          <Info className="w-4 h-4 text-emerald-400" />
          <span>Security Model: Extension vs. Web Companion (PWA)</span>
        </div>
        <p className="leading-relaxed">
          <strong>Browser Extension (Desktop & Mobile AMO):</strong> The extension code is signed by Chrome Web Store or Mozilla AMO and runs from local storage. The sync relay server cannot inject or alter running code.
        </p>
        <p className="leading-relaxed">
          <strong>Web Companion (PWA on iOS/Android):</strong> Web applications load JavaScript dynamically over HTTPS on each session. While WebCrypto handles all encryption locally in the browser runtime, operating the browser extension provides an additional hardware-isolated security boundary.
        </p>
      </div>

      {/* Danger Zone: Vault Reset / Delete Local Data */}
      <div className="p-5 rounded-xl border border-red-500/30 bg-red-500/5 space-y-3">
        <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>Danger Zone: Local Vault Reset</span>
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Clears all local encrypted records, vault headers, and session credentials from IndexedDB. This action cannot be undone. Ensure you have exported an `.aegis` backup if you wish to retain your data.
        </p>

        {confirmWipe ? (
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleWipeDatabase}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs rounded-lg transition-colors"
            >
              Confirm Permanent Wipe
            </button>
            <button
              onClick={() => setConfirmWipe(false)}
              className="px-4 py-2 border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmWipe(true)}
            className="px-3.5 py-1.5 text-xs font-semibold text-red-400 border border-red-500/40 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            Clear Local Database
          </button>
        )}
      </div>
    </div>
  );
};
