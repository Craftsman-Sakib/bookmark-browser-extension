/**
 * @license
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 sakibcraft@gmail.com
 * 
 * Freemium Plans, Pricing & 14-Day Trial Modal
 */

import React from 'react';
import { SubscriptionTier } from '../types';
import { Check, Shield, Zap, Sparkles, X } from 'lucide-react';

interface PricingModalProps {
  currentTier: SubscriptionTier;
  onUpgradeOrActivateTrial: (plan: 'free' | 'pro') => void;
  onClose: () => void;
}

export const PricingModal: React.FC<PricingModalProps> = ({
  currentTier,
  onUpgradeOrActivateTrial,
  onClose
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 text-slate-100">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold font-display text-white">Transparent Plans & Pricing</h2>
            <p className="text-xs text-slate-400 mt-1">
              Privacy-first local vaults are free forever. Cloud sync unlocks multi-device convenience.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Plan Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* FREE TIER CARD */}
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-950/50 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-display font-bold text-base text-white">Personal Vault</span>
                <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded">
                  Free Forever
                </span>
              </div>
              <div className="text-2xl font-bold font-mono text-white mb-2">$0</div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Unlimited local bookmarks with client-side AES-256-GCM encryption. Zero server account required.
              </p>

              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Unlimited local bookmarks (quota bounded)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Client-side AES-256-GCM encryption</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>BIP39 24-word emergency recovery phrase</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>30-Day recoverable Trash bin</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Encrypted .aegis backup import/export</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => {
                onUpgradeOrActivateTrial('free');
                onClose();
              }}
              className={`w-full py-2.5 px-3 rounded-lg text-xs font-semibold border transition-colors ${
                currentTier.plan === 'free' && !currentTier.isTrial
                  ? 'bg-slate-800 text-slate-300 border-slate-700'
                  : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-700'
              }`}
            >
              {currentTier.plan === 'free' && !currentTier.isTrial ? 'Current Plan' : 'Switch to Local-Only'}
            </button>
          </div>

          {/* PRO TIER CARD */}
          <div className="p-5 rounded-xl border-2 border-emerald-500/60 bg-emerald-500/5 flex flex-col justify-between space-y-4 relative overflow-hidden">
            <div className="absolute top-3 right-3">
              <span className="text-[10px] font-mono uppercase tracking-wider font-bold bg-emerald-500 text-slate-950 px-2 py-0.5 rounded">
                14-Day Free Trial
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span className="font-display font-bold text-base text-white">Pro Sync</span>
              </div>
              <div className="flex items-baseline gap-1 text-white mb-2">
                <span className="text-2xl font-bold font-mono">$4</span>
                <span className="text-xs text-slate-400 font-mono">/month or $39/year</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Automated zero-knowledge cloud sync across all your desktop and mobile browser sessions.
              </p>

              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Everything in Personal Vault</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Automated multi-device E2EE cloud sync</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Atomic CAS revision conflict engine</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Device enrollment & remote key revocation</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>30-day grace period on expiration</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => {
                onUpgradeOrActivateTrial('pro');
                onClose();
              }}
              className="w-full py-2.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-lg text-xs transition-colors shadow-sm shadow-emerald-500/20"
            >
              {currentTier.plan === 'pro'
                ? 'Pro Active'
                : 'Start 14-Day Free Pro Trial'}
            </button>
          </div>
        </div>

        {/* Honest Expiration Disclosure */}
        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-slate-500 font-mono leading-relaxed">
          <strong>No Vendor Lock-In Guarantee:</strong> If your Pro trial or subscription ends, you will never lose access to your bookmarks. Local vault editing, searching, and exporting remain 100% functional forever.
        </div>
      </div>
    </div>
  );
};
