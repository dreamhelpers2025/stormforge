import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Toaster from './components/Toaster';
import CommandPalette from './components/CommandPalette';
import Tutorial from './components/Tutorial';

import WorldPicker from './routes/WorldPicker';
import WorldHome from './routes/WorldHome';
import ArticlesList from './routes/ArticlesList';
import ArticleEditor from './routes/ArticleEditor';
import Scratchpad from './routes/Scratchpad';
import Prompts from './routes/Prompts';
import AppSettings from './routes/AppSettings';

import { useSettings } from './stores/useSettings';
import { useWorlds } from './stores/useWorlds';
import { useArticles } from './stores/useArticles';
import { CATEGORY_MAP } from './lib/categories';
import type { ArticleCategory } from './types';

export default function App() {
  return (
    <HashRouter>
      <Bootstrap>
        <Routes>
          <Route path="/" element={<EntryRedirect />} />
          <Route path="/worlds" element={<Shell><WorldPicker /></Shell>} />
          <Route path="/settings" element={<Shell><AppSettings /></Shell>} />
          <Route path="/w/:worldId" element={<WorldShell><WorldHome /></WorldShell>} />
          <Route path="/w/:worldId/articles" element={<WorldShell><ArticlesList /></WorldShell>} />
          <Route path="/w/:worldId/articles/:articleId" element={<WorldShell><ArticleEditor /></WorldShell>} />
          <Route path="/w/:worldId/category/:category" element={<WorldShell><CategoryRoute /></WorldShell>} />
          <Route path="/w/:worldId/scratchpad" element={<WorldShell><Scratchpad /></WorldShell>} />
          <Route path="/w/:worldId/prompts" element={<WorldShell><Prompts /></WorldShell>} />
          <Route path="*" element={<Navigate to="/worlds" replace />} />
        </Routes>
      </Bootstrap>
      <Tutorial />
      <Toaster />
    </HashRouter>
  );
}

function Bootstrap({ children }: { children: React.ReactNode }) {
  const hydrateSettings = useSettings(s => s.hydrate);
  const hydrateWorlds = useWorlds(s => s.hydrate);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    (async () => {
      await Promise.all([hydrateSettings(), hydrateWorlds()]);
      setReady(true);
    })();
  }, [hydrateSettings, hydrateWorlds]);
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
