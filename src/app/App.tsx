import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Toaster from './components/Toaster';
import CommandPalette from './components/CommandPalette';
import Tutorial from './components/Tutorial';
import AudioPlayer from './components/AudioPlayer';

import WorldPicker from './routes/WorldPicker';
import WorldHome from './routes/WorldHome';
import ArticlesList from './routes/ArticlesList';
import ArticleEditor from './routes/ArticleEditor';
import Scratchpad from './routes/Scratchpad';
import Prompts from './routes/Prompts';
import AppSettings from './routes/AppSettings';
import MapsList from './routes/MapsList';
import MapEditor from './routes/MapEditor';
import Profile from './routes/Profile';
import AmbiancePage from './routes/AmbiancePage';

import { useSettings } from './stores/useSettings';
import { useWorlds } from './stores/useWorlds';
import { useArticles } from './stores/useArticles';
import { useAuth } from './stores/useAuth';
import { useProfile } from './stores/useProfile';
import { useMembers } from './stores/useMembers';
import { useToast } from './stores/useToast';
import { useSync } from './stores/useSync';
import { reconcileAll, resync, setCurrentUser } from './lib/cloudSync';
import { wipeLocalDatabase } from './db';
import { CATEGORY_MAP } from './lib/categories';
import ErrorBoundary from './components/ErrorBoundary';
import type { ArticleCategory } from './types';

export default function App() {
  return (
    <ErrorBoundary>
    <HashRouter>
      <Bootstrap>
        <Routes>
          <Route path="/" element={<EntryRedirect />} />
          <Route path="/worlds" element={<Shell><WorldPicker /></Shell>} />
          <Route path="/settings" element={<Shell><AppSettings /></Shell>} />
          <Route path="/profile" element={<Shell><Profile /></Shell>} />
          <Route path="/w/:worldId" element={<WorldShell><WorldHome /></WorldShell>} />
          <Route path="/w/:worldId/articles" element={<WorldShell><ArticlesList /></WorldShell>} />
          <Route path="/w/:worldId/articles/:articleId" element={<WorldShell><ArticleEditor /></WorldShell>} />
          <Route path="/w/:worldId/category/:category" element={<WorldShell><CategoryRoute /></WorldShell>} />
          <Route path="/w/:worldId/maps" element={<WorldShell><MapsList /></WorldShell>} />
          <Route path="/w/:worldId/maps/:mapId" element={<WorldShell><MapEditor /></WorldShell>} />
          <Route path="/w/:worldId/scratchpad" element={<WorldShell><Scratchpad /></WorldShell>} />
          <Route path="/w/:worldId/ambiance" element={<WorldShell><AmbiancePage /></WorldShell>} />
          <Route path="/w/:worldId/prompts" element={<WorldShell><Prompts /></WorldShell>} />
          <Route path="*" element={<Navigate to="/worlds" replace />} />
        </Routes>
      </Bootstrap>
      <Tutorial />
      <Toaster />
    </HashRouter>
    </ErrorBoundary>
  );
}

function Bootstrap({ children }: { children: React.ReactNode }) {
  const hydrateSettings = useSettings(s => s.hydrate);
  const hydrateWorlds = useWorlds(s => s.hydrate);
  const hydrateAuth = useAuth(s => s.hydrate);
  const user = useAuth(s => s.user);
  const [ready, setReady] = useState(false);

  // Initial hydrate: settings, worlds, auth — in parallel
  useEffect(() => {
    (async () => {
      await Promise.all([hydrateSettings(), hydrateWorlds(), hydrateAuth()]);
      setReady(true);
    })();
  }, [hydrateSettings, hydrateWorlds, hydrateAuth]);

  // React to auth state: when a user signs in, reconcile cloud + local + hydrate profile.
  useEffect(() => {
    if (!ready) return;
    if (user) {
      setCurrentUser(user.id);
      (async () => {
        // Account-switch hygiene: if a DIFFERENT user signed in last time
        // than the one now signing in, wipe the local DB so we don't leak
        // their data into this session. First-ever sign-in (no lastUser
        // stored) leaves any anonymous work alone so it can sync upward.
        try {
          const LAST_USER_KEY = 'stormforge.lastUser';
          const lastUser = localStorage.getItem(LAST_USER_KEY);
          if (lastUser && lastUser !== user.id) {
            console.info('[Bootstrap] Different account detected — wiping local DB before sync.');
            await wipeLocalDatabase();
            // Re-hydrate the two stores that pulled from the (now empty) DB.
            // Reconcile will then refill them from the cloud.
            await useSettings.getState().hydrate();
            await useWorlds.getState().hydrate();
          }
          localStorage.setItem(LAST_USER_KEY, user.id);
        } catch (e) {
          console.warn('[Bootstrap] Account-switch wipe failed (continuing):', e);
        }

        // Claim any pending invites first — that way the next reconcile picks
        // up newly-accessible worlds.
        try {
          const claimed = await useMembers.getState().claimInvites();
          if (claimed > 0) {
            useToast.getState().push(`Joined ${claimed} shared world${claimed === 1 ? '' : 's'}.`, 'success');
          }
        } catch {}
        try { await useMembers.getState().hydrate(); } catch {}
        reconcileAll(user.id).catch(() => {});
        useProfile.getState().hydrate().catch(() => {});
      })();
    } else {
      setCurrentUser(null);
    }
  }, [user, ready]);

  // Listen for online/offline transitions
  useEffect(() => {
    function onOnline() {
      useSync.getState().set({ state: 'idle' });
      resync();
    }
    function onOffline() {
      useSync.getState().set({ state: 'offline' });
    }
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  if (!ready) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-mute)' }}>
        Awakening the archive…
      </div>
    );
  }
  return <>{children}</>;
}

function EntryRedirect() {
  const settings = useSettings(s => s.settings);
  const worlds = useWorlds(s => s.worlds);
  if (settings.activeWorldId && worlds.some(w => w.id === settings.activeWorldId)) {
    return <Navigate to={`/w/${settings.activeWorldId}`} replace />;
  }
  return <Navigate to="/worlds" replace />;
}

function Shell({ children }: { children: React.ReactNode }) {
  const [cmdOpen, setCmdOpen] = useState(false);
  useGlobalKeys({ openCmd: () => setCmdOpen(true) });
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        <TopBar onOpenCmdK={() => setCmdOpen(true)} />
        <div className="app-scroll scrollbar-thin">{children}</div>
        <AudioPlayer />
      </main>
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  );
}

function WorldShell({ children }: { children: React.ReactNode }) {
  const { worldId = '' } = useParams();
  const setActiveWorld = useSettings(s => s.setActiveWorld);
  const loadArticles = useArticles(s => s.loadWorld);
  useEffect(() => {
    if (worldId) {
      setActiveWorld(worldId);
      loadArticles(worldId);
    }
  }, [worldId, setActiveWorld, loadArticles]);
  return <Shell>{children}</Shell>;
}

function CategoryRoute() {
  const { category } = useParams();
  if (!category) return null;
  if (!CATEGORY_MAP[category as ArticleCategory]) return <Navigate to=".." replace />;
  return <ArticlesList category={category as ArticleCategory} />;
}

function useGlobalKeys({ openCmd }: { openCmd: () => void }) {
  const navigate = useNavigate();
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Cmd/Ctrl + K -> command palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openCmd();
      }
      // Cmd/Ctrl + / -> command palette (alternate)
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        openCmd();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openCmd, navigate]);
}
