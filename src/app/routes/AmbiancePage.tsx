import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAudio, EMPTY_TRACKS, MAX_TRACKS_PER_WORLD, MAX_FILE_BYTES } from '../stores/useAudio';
import { useWorlds } from '../stores/useWorlds';
import { useAuth } from '../stores/useAuth';
import { useMembers } from '../stores/useMembers';
import { useToast } from '../stores/useToast';
import Icon from '../components/Icon';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import type { AudioTrack } from '../types';

export default function AmbiancePage() {
  const { worldId = '' } = useParams();
  const tracks = useAudio(s => s.byWorld[worldId] ?? EMPTY_TRACKS) as unknown as AudioTrack[];
  const loadWorld = useAudio(s => s.loadWorld);
  const uploadTrack = useAudio(s => s.uploadTrack);
  const renameTrack = useAudio(s => s.renameTrack);
  const updateAttribution = useAudio(s => s.updateAttribution);
  const removeTrack = useAudio(s => s.removeTrack);
  const play = useAudio(s => s.play);
  const currentTrackId = useAudio(s => s.currentTrackId);
  const isPlaying = useAudio(s => s.isPlaying);
  const toggle = useAudio(s => s.toggle);

  const worlds = useWorlds(s => s.worlds);
  const world = worlds.find(w => w.id === worldId);
  const currentUserId = useAuth(s => s.user?.id ?? null);
  const myMemberRoles = useMembers(s => s.myMemberRoles);
  const isOwner = !!world && (!world.ownerUserId || world.ownerUserId === currentUserId);
  const canEdit = isOwner || myMemberRoles[worldId] === 'editor';

  const push = useToast(s => s.push);

  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingName, setPendingName] = useState('');
  const [pendingAttribution, setPendingAttribution] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<AudioTrack | null>(null);

  useEffect(() => { if (worldId) loadWorld(worldId).catch(() => {}); }, [worldId, loadWorld]);

  function pickFile() { fileRef.current?.click(); }

  function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (f.size > MAX_FILE_BYTES) {
      push(`That file is over ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} MB. Try a shorter clip or re-export as a smaller mp3/ogg.`, 'error');
      return;
    }
    if (tracks.length >= MAX_TRACKS_PER_WORLD) {
      push(`This world already has the maximum of ${MAX_TRACKS_PER_WORLD} ambient tracks. Remove one before adding another.`, 'error');
      return;
    }
    setPendingFile(f);
    setPendingName(f.name.replace(/\.[^.]+$/, ''));
    setPendingAttribution('');
  }

  async function confirmUpload() {
    if (!pendingFile) return;
    setUploading(true);
    try {
      await uploadTrack(worldId, pendingFile, {
        name: pendingName.trim() || undefined,
        attribution: pendingAttribution.trim() || undefined,
      });
      push('Track added.', 'success');
      setPendingFile(null);
      setPendingName('');
      setPendingAttribution('');
    } catch (e: any) {
      push('Upload failed: ' + (e?.message ?? String(e)), 'error');
    } finally {
      setUploading(false);
    }
  }

  async function handlePlay(t: AudioTrack) {
    try {
      if (t.id === currentTrackId) {
        await toggle();
      } else {
        await play(t.id);
      }
    } catch (e: any) {
      push(e?.message ?? String(e), 'error');
    }
  }

  async function handleRename(t: AudioTrack) {
    const next = prompt('Rename track', t.name);
    if (next == null) return;
    try { await renameTrack(t.id, next); } catch (e: any) { push(e?.message ?? String(e), 'error'); }
  }

  async function handleAttribution(t: AudioTrack) {
    const next = prompt(
      'Edit attribution (artist · license · source URL):',
      t.attribution ?? '',
    );
    if (next == null) return;
    try { await updateAttribution(t.id, next); } catch (e: any) { push(e?.message ?? String(e), 'error'); }
  }

  async function doRemove(t: AudioTrack) {
    try {
      await removeTrack(t.id);
      push('Track removed.', 'info');
    } catch (e: any) {
      push('Remove failed: ' + (e?.message ?? String(e)), 'error');
    } finally {
      setConfirmDelete(null);
    }
  }

  return (
    <div className="fade-in" style={{ maxWidth: 980, margin: '0 auto', padding: '32px 28px 80px' }}>
      <div className="text-eyebrow">Atmosphere</div>
      <h1 className="text-display" style={{ fontSize: 28, margin: '6px 0 8px' }}>Ambient Music</h1>
      <p className="text-mute" style={{ fontSize: 14, maxWidth: 620, lineHeight: 1.6 }}>
        Add looping music to set the mood while you write in this world. Audio plays from the bar at
        the bottom of the screen — it follows you between pages and pauses when you sign out.
      </p>

      {/* Upload bar */}
      {canEdit && (
        <div
          className="sf-card"
          style={{ marginTop: 22, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div className="text-eyebrow">Add</div>
              <div className="text-display" style={{ fontSize: 14, letterSpacing: '0.18em', marginTop: 4 }}>
                UPLOAD A TRACK · {tracks.length} / {MAX_TRACKS_PER_WORLD}
              </div>
              <div className="text-mute" style={{ fontSize: 12, marginTop: 4 }}>
                MP3, OGG, WAV, M4A, FLAC. {Math.round(MAX_FILE_BYTES / 1024 / 1024)} MB max per file, {MAX_TRACKS_PER_WORLD} tracks per world.
              </div>
              {tracks.length >= MAX_TRACKS_PER_WORLD && (
                <div style={{ color: 'var(--ember)', fontSize: 12, marginTop: 6 }}>
                  Library is full. Remove a track below before adding another.
                </div>
              )}
            </div>
            <button
              className="btn btn-primary"
              onClick={pickFile}
              disabled={uploading || tracks.length >= MAX_TRACKS_PER_WORLD}
            >
              <Icon name="upload" size={13} /> Choose file
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="audio/mpeg,audio/mp3,audio/ogg,audio/wav,audio/x-wav,audio/webm,audio/aac,audio/mp4,audio/x-m4a,audio/flac"
              style={{ display: 'none' }}
              onChange={onFileChosen}
            />
          </div>

          {pendingFile && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="text-dim" style={{ fontSize: 12 }}>
                Selected: <strong>{pendingFile.name}</strong> · {(pendingFile.size / 1024 / 1024).toFixed(2)} MB
              </div>
              <input
                className="input"
                placeholder="Track name (what you'll see in the bar)"
                value={pendingName}
                onChange={e => setPendingName(e.target.value)}
              />
              <input
                className="input"
                placeholder="Attribution — e.g. 'Kevin MacLeod · incompetech.com · CC-BY 4.0'"
                value={pendingAttribution}
                onChange={e => setPendingAttribution(e.target.value)}
              />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setPendingFile(null)} disabled={uploading}>Cancel</button>
                <button className="btn btn-primary" onClick={confirmUpload} disabled={uploading}>
                  {uploading ? 'Uploading…' : 'Add to library'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Track list */}
      <div style={{ marginTop: 24 }}>
        <div className="text-eyebrow" style={{ marginBottom: 10 }}>Library · {tracks.length}</div>
        {tracks.length === 0 ? (
          <EmptyState
            icon="music"
            title="No tracks yet"
            description={
              canEdit
                ? 'Upload your first ambient track above, or grab something from the free sources below.'
                : 'Only the owner of this world (or its editors) can add tracks.'
            }
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tracks.map(t => {
              const playingThis = t.id === currentTrackId && isPlaying;
              return (
                <div
                  key={t.id}
                  className="sf-card"
                  style={{
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <button
                    className="btn btn-ghost btn-icon"
                    title={playingThis ? 'Pause' : 'Play'}
                    onClick={() => handlePlay(t)}
                    style={{ color: 'var(--accent)' }}
                  >
                    <Icon name={playingThis ? 'pause' : 'play'} size={14} />
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.durationMs ? formatDuration(t.durationMs) + ' · ' : ''}
                      {t.attribution || (canEdit ? 'No attribution set' : '')}
                    </div>
                  </div>
                  {canEdit && (
                    <>
                      <button
                        className="btn btn-ghost btn-icon"
                        title="Rename"
                        onClick={() => handleRename(t)}
                      >
                        <Icon name="edit" size={12} />
                      </button>
                      <button
                        className="btn btn-ghost btn-icon"
                        title="Edit attribution"
                        onClick={() => handleAttribution(t)}
                      >
                        <Icon name="scroll" size={12} />
                      </button>
                      <button
                        className="btn btn-ghost btn-icon"
                        title="Remove"
                        onClick={() => setConfirmDelete(t)}
                      >
                        <Icon name="trash" size={12} />
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Free music sources */}
      <div style={{ marginTop: 36 }}>
        <div className="text-eyebrow" style={{ marginBottom: 10 }}>Where to find free music</div>
        <p className="text-mute" style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 16, maxWidth: 680 }}>
          These libraries offer royalty-free or Creative Commons music you can download and upload here.
          Always read the license on the specific track — most CC-BY tracks just require crediting the
          artist in the attribution field.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          <SourceCard
            name="Pixabay Music"
            href="https://pixabay.com/music/"
            license="Pixabay Content License (free for any use, no credit required)"
            note="Easy genre + mood filters. Search 'cinematic', 'fantasy', 'ambient'."
          />
          <SourceCard
            name="Incompetech (Kevin MacLeod)"
            href="https://incompetech.com/music/royalty-free/music.html"
            license="CC-BY 4.0 (credit required)"
            note="Huge fantasy / medieval catalog. Credit example provided below."
          />
          <SourceCard
            name="Free Music Archive"
            href="https://freemusicarchive.org/genre/Soundtrack/"
            license="Mixed — filter by 'CC0' or 'CC-BY' before downloading"
            note="Curated indie + soundtrack work. Soundtrack genre is the closest match."
          />
          <SourceCard
            name="Tabletop Audio"
            href="https://tabletopaudio.com/"
            license="Free for personal use; downloads need a small membership"
            note="Streamable ambient soundscapes built for RPG worlds."
          />
          <SourceCard
            name="OpenGameArt — Music"
            href="https://opengameart.org/art-search-advanced?field_art_type_tid%5B%5D=12&sort_by=count"
            license="Mostly CC0 / CC-BY / CC-BY-SA"
            note="Built for game devs — heavy on fantasy and ambient loops."
          />
          <SourceCard
            name="ccMixter"
            href="https://ccmixter.org/"
            license="CC-BY or CC-BY-NC (check per track)"
            note="Community remixes. Watch for the NC tag if you ever monetize."
          />
        </div>

        <div className="sf-card" style={{ marginTop: 16, padding: 14 }}>
          <div className="text-eyebrow">Example attribution</div>
          <div className="text-mute" style={{ fontSize: 12.5, lineHeight: 1.6, marginTop: 6, fontStyle: 'italic' }}>
            "Dragon and Toast" by Kevin MacLeod · incompetech.com · Licensed under CC-BY 4.0
          </div>
        </div>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title={`Remove "${confirmDelete.name}"?`}
          description="The file will be deleted from storage. Anyone with the world open will stop hearing it."
          confirmLabel="Remove"
          danger
          onConfirm={() => doRemove(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

function SourceCard({ name, href, license, note }: { name: string; href: string; license: string; note: string }) {
  return (
    <a
      className="sf-card hoverable"
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      style={{ padding: 14, textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', gap: 6 }}
    >
      <div className="text-display" style={{ fontSize: 14, letterSpacing: '0.08em' }}>{name}</div>
      <div style={{ fontSize: 11, color: 'var(--ember)', letterSpacing: '0.05em' }}>{license}</div>
      <div className="text-mute" style={{ fontSize: 12.5, lineHeight: 1.5 }}>{note}</div>
      <div style={{ marginTop: 4, fontSize: 11, color: 'var(--accent)' }}>
        Open ↗
      </div>
    </a>
  );
}

function formatDuration(ms: number): string {
  const sec = Math.round(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
