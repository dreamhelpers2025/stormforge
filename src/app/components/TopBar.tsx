import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Icon from './Icon';

interface Props {
  onOpenCmdK: () => void;
  title?: string;
  breadcrumbs?: { label: string; to?: string }[];
  right?: React.ReactNode;
}

export default function TopBar({ onOpenCmdK, title, breadcrumbs, right }: Props) {
  const navigate = useNavigate();
  return (
    <div className="topbar">
      <button
        className="btn btn-ghost btn-icon"
        onClick={() => window.history.length > 1 ? window.history.back() : navigate('/worlds')}
        title="Back"
      >
        <Icon name="arrow-left" size={15} />
      </button>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
        {breadcrumbs?.length ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, overflow: 'hidden' }}>
            {breadcrumbs.map((b, i) => (
              <React.Fragment key={i}>
                {b.to ? (
                  <a
                    onClick={() => navigate(b.to!)}
                    className="text-mute"
                    style={{ cursor: 'pointer' }}
                    onMouseOver={e => e.currentTarget.style.color = 'var(--text)'}
                    onMouseOut={e => e.currentTarget.style.color = ''}
                  >{b.label}</a>
                ) : (
                  <span style={{ color: 'var(--text)' }}>{b.label}</span>
                )}
                {i < breadcrumbs.length - 1 && <Icon name="chevron-right" size={11} className="text-dim" />}
              </React.Fragment>
            ))}
          </div>
        ) : title ? (
          <div className="text-display" style={{ fontSize: 14, letterSpacing: '0.15em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title}
          </div>
        ) : null}
      </div>

      <button
        className="btn btn-ghost"
        onClick={onOpenCmdK}
        style={{ minWidth: 220, justifyContent: 'flex-start', color: 'var(--text-mute)' }}
        title="Search (Ctrl/Cmd + K)"
      >
        <Icon name="search" size={14} />
        <span style={{ fontSize: 12.5 }}>Search the archive…</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-dim)' }}>⌘K</span>
      </button>

      {right}
    </div>
  );
}
