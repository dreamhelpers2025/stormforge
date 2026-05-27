import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAudio } from '../stores/useAudio';
import { useToast } from '../stores/useToast';
import Icon from './Icon';
import type { AudioTrack } from '../types';

/**
 * Persistent ambient-music bar pinned to the bottom of the app shell.
 * Renders nothing if there are no tracks in the current world AND no track is playing.
 * The HTMLAudioElement lives in the store so playback survives navigation.
 */
export default function AudioPlayer() {
  const { worldId } = useParams();

  const tracks = useAudio(s => (worldId ? (s.byWorld[worldId] ?? null) : null));
  const currentTrackId = useAudio(s => s.currentTrackId);
  const isPlaying = useAudio(s => s.isPlaying);
  const volume = useAudio(s => s.volume);
  const muted = useAudio(s => s.muted);
  const barVisible = useAudio(s => s.barVisible);

  const loadWorld = useAudio(s => s.loadWorld);
  const play = useAudio(s => s.play);
  const toggle = useAudio(s => s.toggle);
  const next = useAudio(s => s.next);
  const prev = useAudio(s => s.prev);
  const setVolume = useAudio(s => s.setVolume);
  const setMuted = useAudio(s => s.setMuted);
  const setBarVisible = useAudio(s => s.setBarVisible);
  const push = useToast(s => s.push);

  // Load tracks for the current world on entry.
  useEffect(() => {
    if (worldId) loadWorld(worldId).catch(() => {});
  }, [worldId, loadWorld]);

  // Find the current track across all worlds (it may be from a different world we navigated away from).
  const currentTrack: AudioTrack | null = (() => {
    if (!currentTrackId) return null;
    const all = useAudio.getState().byWorld;
    for (const wid in all) {
      const f = (all[wid] ?? []).find(t => t.id === currentTrackId);
      if (f) return f;
    }
    return null;
  })();

  const hasTracksHere = (tracks?.length ?? 0) > 0;

  // Hide entirely if nothing is loaded for this world and nothing is playing.
  if (!hasTracksHere && !currentTrack) return null;

  if (!barVisible) {
    return (
      <button
        onClick={() => setBarVisible(true)}
        title="Show ambiance player"
        style={{
          position: 'fixed', right: 18, bottom: 18, zIndex: 60,
          width: 38, height: 38, borderRadius: '50%',
          background: 'var(--panel-2)', border: '1px solid var(--border)',
          color: 'var(--text)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 18px rgba(0,0,0,0.4)',
        }}
      >
        <Icon name="music" size={16} />
      </button>
    );
  }

  async function handlePlay() {
    try {
      if (currentTrackId) {
        await toggle();
      } else if (tracks && tracks.length > 0) {
        await play(tracks[0].id);
      }
    } catch (e: any) {
      push(e?.message ?? String(e), 'error');
    }
  }

  async function handleNext() {
    if (!worldId) return;
    try { await next(worldId); } catch (e: any) { push(e?.message ?? String(e), 'error'); }
  }
  async function handlePrev() {
    if (!worldId) return;
    try { await prev(worldId); } catch (e: any) { push(e?.message ?? String(e), 'error'); }
  }

  return (
    <div
      style={{
        flexShrink: 0,
        padding: '8px 14px',
        background: 'linear-gradient(180deg, rgba(11,30,45,0.85), rgba(8,21,30,0.95))',
        borderTop: '1px solid var(--border)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        minHeight: 52,
      }}
    >
      {/* Now-playing label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
        <Icon name="music" size={14} className="text-accent" />
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: 12.5, color: 'var(--text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {currentTrack ? currentTrack.name : (hasTracksHere ? 'Ambient music ready' : 'No tracks loaded')}
          </div>
          {currentTrack?.attribution && (
            <div style={{
              fontSize: 10.5, color: 'var(--text-dim)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {currentTrack.attribution}
            </div>
          )}
        </div>
      </div>

      {/* Transport */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          className="btn btn-ghost btn-icon"
          title="Previous track"
          onClick={handlePrev}
          disabled={!hasTracksHere}
        >
          <Icon name="skip-back" size={13} />
        </button>
        <button
          className="btn btn-ghost btn-icon"
          title={isPlaying ? 'Pause' : 'Play'}
          onClick={handlePlay}
          disabled={!hasTracksHere && !currentTrack}
          style={{ color: 'var(--accent)' }}
        >
          <Icon name={isPlaying ? 'pause' : 'play'} size={14} />
        </button>
        <button
          className="btn btn-ghost btn-icon"
          title="Next track"
          onClick={handleNext}
          disabled={!hasTracksHere}
        >
          <Icon name="skip-forward" size={13} />
        </button>
      </div>

      {/* Volume */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          className="btn btn-ghost btn-icon"
          title={muted ? 'Unmute' : 'Mute'}
          onClick={() => setMuted(!muted)}
        >
          <Icon name={muted ? 'volume-mute' : 'volume'} size={13} />
        </button>
        <VolumeSlider value={muted ? 0 : volume} onChange={v => { setVolume(v); if (muted && v > 0) setMuted(false); }} />
      </div>

      {/* Collapse */}
      <button
        className="btn btn-ghost btn-icon"
        title="Collapse player"
        onClick={() => setBarVisible(false)}
      >
        <Icon name="chevron-down" size={13} />
      </button>
    </div>
  );
}

function VolumeSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(false);
  return (
    <input
      type="range"
      min={0}
      max={1}
      step={0.01}
      value={value}
      onChange={e => onChange(parseFloat(e.target.value))}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: hover ? 110 : 80,
        transition: 'width 120ms ease',
        accentColor: 'var(--accent)',
        cursor: 'pointer',
      }}
      aria-label="Volume"
    />
  );
}
