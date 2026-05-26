import React from 'react';
import { useToast } from '../stores/useToast';

export default function Toaster() {
  const toasts = useToast(s => s.toasts);
  return (
    <div className="toast-stack">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.kind}`}>{t.message}</div>
      ))}
    </div>
  );
}
