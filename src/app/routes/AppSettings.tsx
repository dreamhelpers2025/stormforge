import React, { useRef } from 'react';
import { useSettings } from '../stores/useSettings';
import { useToast } from '../stores/useToast';
import { db } from '../db';
import { useWorlds } from '../stores/useWorlds';
import { importWorld } from '../lib/export';
import Icon from '../components/Icon';
import Sigil from '../components/Sigil';

export default function AppSettings() {
  const theme = useSettings(s => s.settings.theme);
  const setTheme = useSettings(s => s.setTheme);
  const push = useToast(s => s.push);
  const importInputRef = useRef<HTMLInputElement>(null);

  async function clearAll() {
    if (!confirm('This will erase ALL worlds and articles from this browser. Are you sure?')) return;
    if (!confirm('Last chance. This cannot be undone. Proceed?')) return;
    await db.delete();
    location.reload();
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      await importWorld(data, { newId: true });
      await useWorlds.getState().hydrate();
      push('World imported.', 'success');
    } catch (err: any) {
      push('Import failed: ' + err.message, 'error');
    } finally {
      e.target.value = '';
    }
  }

  function replayTutorial() {
    (window as any).__stormforgeReopenTutorial?.();
  }

  return (
    <div className="fade-in" style={{ maxWidth: 720, margin: '0 auto', padding: '24px 28px 80px' }}>
      <div className="text-eyebrow">Configuration</div>
      <h1 className="text-display" style={{ fontSize: 28, margin: '4px 0 22px' }}>Settings</h1>

      <section className="sf-card" style={{ padding: 18, marginBottom: 14 }}>
        <div className="text-display" style={{ fontSize: 13, letterSpacing: '0.2em', marginBottom: 12 }}>APPEARANCE</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className={`btn ${theme === 'dark' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTheme('dark')}
          >
            <Icon name="moon" size={14} /> Tempest (Dark)
          </button>
          <button
            className={`btn ${theme === 'light' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTheme('light')}
          >
            <Icon name="sun" size={14} /> Parchment (Light)
          </button>
        </div>
        <p className="text-mute" style={{ fontSize: 12.5, marginTop: 10 }}>
          Dark is recommended for long sessions. Parchment is high-contrast and easier in bright rooms.
        </p>
      </section>

      <section className="sf-card" style={{ padding: 18, marginBottom: 14 }}>
        <div className="text-display" style={{ fontSize: 13, letterSpacing: '0.2em', marginBottom: 12 }}>DATA</div>
        <p className="text-mute" style={{ fontSize: 13, marginBottom: 12, lineHeight: 1.55 }}>
          Stormforge stores everything in your browser. Use export buttons on each world to back them up as JSON files
          (save them to Drive, Dropbox, or anywhere safe). Import them back here on any device.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => importInputRef.current?.click()}>
            <Icon name="upload" size={13} /> Import a world
          </button>
          <button className="btn btn-danger" onClick={clearAll}>
            <Icon name="trash" size={13} /> Erase all data
          </button>
          <input ref={importInputRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={handleImport} />
        </div>
      </section>

      <section className="sf-card" style={{ padding: 18, marginBottom: 14 }}>
        <div className="text-display" style={{ fontSize: 13, letterSpacing: '0.2em', marginBottom: 12 }}>HELP</div>
        <button className="btn btn-ghost" onClick={replayTutorial}>
          <Icon name="sparkles" size={13} /> Replay tutorial
        </button>
      </section>

      <section className="sf-card" style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
        <Sigil size={48} className="text-accent" />
        <div>
          <div className="text-display" style={{ fontSize: 15 }}>STORMFORGE · ARCHIVE</div>
          <div className="text-mute" style={{ fontSize: 12 }}>Vol. I of the Living Codex · Phase 1 build</div>
          <div className="text-dim" style={{ fontSize: 11, marginTop: 4 }}>
            Coming next: evolution tree, magic-system simulator, interactive maps, version history, soundscapes, community sharing.
          </div>
        </div>
      </section>
    </div>
  );
}
