/**
 * @license
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 sakibcraft@gmail.com
 * 
 * 30-Day Trash Manager
 */

import React from 'react';
import { BookmarkItem } from '../types';
import { Trash2, RotateCcw, AlertTriangle, ShieldCheck } from 'lucide-react';

interface TrashViewProps {
  bookmarks: BookmarkItem[];
  onRestore: (item: BookmarkItem) => Promise<void>;
  onPermanentDelete: (id: string) => Promise<void>;
  onEmptyTrash: () => Promise<void>;
}

export const TrashView: React.FC<TrashViewProps> = ({
  bookmarks,
  onRestore,
  onPermanentDelete,
  onEmptyTrash
}) => {
  const trashedItems = bookmarks.filter(b => b.isInTrash);

  return (
    <div className="space-y-6">
      {/* Header and Policy Callout */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div>
          <h2 className="text-lg font-bold font-display text-white flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-400" />
            <span>30-Day Recoverable Trash</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Deleted bookmarks remain restorable for 30 days before permanent erasure, protecting against accidental bulk deletions.
          </p>
        </div>

        {trashedItems.length > 0 && (
          <button
            onClick={onEmptyTrash}
            className="px-3.5 py-1.5 text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 rounded-lg transition-colors whitespace-nowrap"
          >
            Empty Trash Now
          </button>
        )}
      </div>

      {trashedItems.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40">
          <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mx-auto mb-3">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-200 mb-1">Trash is Empty</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You have no deleted bookmarks. Any deleted bookmarks will appear here for 30 days before permanent erasure.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden divide-y divide-slate-800">
          {trashedItems.map(item => {
            const domain = item.url.replace(/^https?:\/\//, '').split('/')[0];
            const daysLeft = item.trashedAt
              ? Math.max(0, 30 - Math.floor((Date.now() - item.trashedAt) / (1000 * 60 * 60 * 24)))
              : 30;

            return (
              <div
                key={item.id}
                className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-slate-800/40 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-xs sm:text-sm text-slate-300 truncate mb-1">
                    {item.title}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                    <span>{domain}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-amber-400/90 font-medium">{daysLeft} days until purge</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onRestore(item)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore</span>
                  </button>

                  <button
                    onClick={() => onPermanentDelete(item.id)}
                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                    title="Permanently Delete Now"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
