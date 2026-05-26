import React from 'react';
import Icon, { type IconName } from './Icon';

interface Props {
  icon?: IconName;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon = 'sparkles', title, description, action }: Props) {
  return (
    <div className="empty-state fade-in">
      <div className="empty-glyph text-accent">
        <Icon name={icon} size={28} />
      </div>
      <div className="text-display" style={{ fontSize: 17, color: 'var(--text)' }}>{title}</div>
      {description && <div style={{ maxWidth: 360, fontSize: 13.5, lineHeight: 1.55 }}>{description}</div>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}
