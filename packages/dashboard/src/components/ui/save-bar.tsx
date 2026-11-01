'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

/**
 * Sticky save bar. Appears the moment a form is dirty and stays in view
 * until the change is committed or discarded.
 */
export function SaveBar({
  visible,
  saving,
  onSave,
  onReset,
  label = 'Save changes',
  resetLabel = 'Reset',
  className,
}: {
  visible: boolean;
  saving?: boolean;
  onSave: () => void;
  onReset: () => void;
  label?: string;
  resetLabel?: string;
  className?: string;
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          className={cn('fixed inset-x-0 bottom-0 z-40 px-4 pb-4 sm:px-6', className)}
        >
          <div className="mx-auto flex max-w-shell items-center justify-between gap-4 rounded-lg border border-emerald/20 bg-obsidian-raised/95 px-4 py-3 shadow-lift-lg backdrop-blur-xl">
            <p className="text-sm text-mist-dim">
              <span className="font-semibold text-mist">Unsaved changes.</span> They apply to this server only.
            </p>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onReset} disabled={saving}>
                <RotateCcw className="size-3.5" />
                {resetLabel}
              </Button>
              <Button size="sm" onClick={onSave} loading={saving}>
                {!saving && <Save className="size-3.5" />}
                {label}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
