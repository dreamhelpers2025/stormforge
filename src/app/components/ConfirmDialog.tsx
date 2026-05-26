import React from 'react';

interface Props {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div className="modal-backdrop fade-in" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2 className="text-display" style={{ fontSize: 18, marginBottom: 8 }}>{title}</h2>
        {description && <p className="text-mute" style={{ fontSize: 14, lineHeight: 1.5 }}>{description}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 22 }}>
          <button className="btn btn-ghost" onClick={onCancel}>{cancelLabel}</button>
          <button className={danger ? 'btn btn-danger' : 'btn btn-primary'} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
