import React from 'react';

export default function ConfirmModal({ open, title = 'Confirm', message = 'Are you sure?', onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-xl border p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-600 mb-4">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 rounded-md border">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-md bg-rc-teal text-white">Confirm</button>
        </div>
      </div>
    </div>
  );
}
