/**
 * @license
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 sakibcraft@gmail.com
 * 
 * 1-Click Extension Package Downloader & Unpacked Installation Guide
 */

import React, { useState } from 'react';
import { downloadExtensionZip } from '../services/extensionExporter';
import { Download, Check, Chrome, Compass, X, RefreshCw, FileCode, Shield } from 'lucide-react';

interface ExportExtensionModalProps {
  onClose: () => void;
}

export const ExportExtensionModal: React.FC<ExportExtensionModalProps> = ({ onClose }) => {
  const [downloadingBrowser, setDownloadingBrowser] = useState<'chrome' | 'firefox' | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const handleDownload = async (browser: 'chrome' | 'firefox') => {
    setDownloadingBrowser(browser);
    setDownloadSuccess(null);
    try {
      await downloadExtensionZip(browser);
      setDownloadSuccess(`Downloaded aegismark-extension-${browser}-v1.0.0.zip!`);
      setTimeout(() => setDownloadSuccess(null), 4000);
    } catch (err: any) {
      alert(`Download failed: ${err.message}`);
    } finally {
      setDownloadingBrowser(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 text-slate-100">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold font-display text-white flex items-center gap-2">
              <Download className="w-5 h-5 text-emerald-400" />
              <span>Download Browser Extension Packages</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Store-ready, Manifest V3 compliant packages with full source code and icons.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {downloadSuccess && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{downloadSuccess}</span>
          </div>
        )}

        {/* 1-Click Download Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Chrome / Edge Package */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/50 flex flex-col justify-between space-y-3">
            <div>
              <div className="font-semibold text-sm text-white flex items-center gap-2 mb-1">
                <Chrome className="w-4 h-4 text-emerald-400" />
                <span>Chrome & Edge (MV3)</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-mono">
                Service Worker background · Manifest V3 · Least privilege
              </p>
            </div>

            <button
              onClick={() => handleDownload('chrome')}
              disabled={downloadingBrowser !== null}
              className="w-full py-2 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              {downloadingBrowser === 'chrome' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>Download Chrome ZIP</span>
            </button>
          </div>

          {/* Firefox Package */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/50 flex flex-col justify-between space-y-3">
            <div>
              <div className="font-semibold text-sm text-white flex items-center gap-2 mb-1">
                <Compass className="w-4 h-4 text-amber-400" />
                <span>Firefox (MV3)</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-mono">
                Event Page background · Firefox 115+ storage.session
              </p>
            </div>

            <button
              onClick={() => handleDownload('firefox')}
              disabled={downloadingBrowser !== null}
              className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              {downloadingBrowser === 'firefox' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>Download Firefox ZIP</span>
            </button>
          </div>
        </div>

        {/* Installation Instructions */}
        <div className="space-y-3 p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400">
          <h4 className="font-semibold text-slate-200 flex items-center gap-1.5">
            <FileCode className="w-4 h-4 text-emerald-400" />
            <span>How to Load Unpacked in Developer Mode:</span>
          </h4>
          <ol className="list-decimal list-inside space-y-1.5 leading-relaxed font-mono text-[11px] text-slate-300">
            <li>Extract the downloaded ZIP archive into a local folder.</li>
            <li>In Chrome/Edge: Open <code className="text-emerald-400">chrome://extensions</code>, enable <strong>Developer mode</strong>, and click <strong>Load unpacked</strong>.</li>
            <li>In Firefox: Open <code className="text-emerald-400">about:debugging#/runtime/this-firefox</code> and click <strong>Load Temporary Add-on...</strong>.</li>
            <li>Select the extracted folder containing <code className="text-emerald-400">manifest.json</code>.</li>
          </ol>
        </div>

        <div className="text-[11px] text-center text-slate-500 font-mono">
          Includes PRIVACY_POLICY.md and STORE_LISTING.md for instant store publishing.
        </div>
      </div>
    </div>
  );
};
