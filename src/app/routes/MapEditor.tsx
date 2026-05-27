import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { useMaps, EMPTY_MAPS } from '../stores/useMaps';
import { useArticles, EMPTY_ARTICLES } from '../stores/useArticles';
import { useToast } from '../stores/useToast';
import { CATEGORY_MAP } from '../lib/categories';
import Icon from '../components/Icon';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import { compressImageDataUrl, fileToDataUrl } from '../lib/imageCompress';
import { MAP_STYLE_PRESETS, getEffectiveBackground, getInkColor, isLightStyle } from '../lib/mapStyles';
import { STAMPS, STAMPS_BY_CATEGORY, CATEGORY_LABELS, getStamp, type StampCategory } from '../lib/mapStamps';
import type { MapData, MapPin, MapRegion, MapStamp, MapStyle, PinKind, Article } from '../types';

const PIN_KINDS: { key: PinKind; label: string; emoji: string; color: string }[] = [
  { key: 'capital',  label: 'Capital',   emoji: '👑', color: '#B88A3B' },
  { key: 'city',     label: 'City',      emoji: '🏰', color: '#D8E0E5' },
  { key: 'town',     label: 'Town',      emoji: '🏘️', color: '#B5C0C9' },
  { key: 'ruin',     label: 'Ruin',      emoji: '🏚️', color: '#7d8a96' },
  { key: 'landmark', label: 'Landmark',  emoji: '⭐', color: '#43C7C7' },
  { key: 'dungeon',  label: 'Dungeon',   emoji: '🕳️', color: '#6b3f9e' },
  { key: 'battle',   label: 'Battle',    emoji: '⚔️', color: '#B0413E' },
  { key: 'lore',     label: 'Lore',      emoji: '📜', color: '#43C7C7' },
  { key: 'roost',    label: 'Roost',     emoji: '🐉', color: '#43C7C7' },
  { key: 'shrine',   label: 'Shrine',    emoji: '⛩️', color: '#c084fc' },
  { key: 'rift',     label: 'Rift',      emoji: '🌀', color: '#43C7C7' },
  { key: 'custom',   label: 'Custom',    emoji: '📍', color: '#43C7C7' },
];

const REGION_COLORS = ['#43C7C7', '#B88A3B', '#B0413E', '#6ed099', '#c084fc', '#93c5fd', '#D8E0E5', '#7d8a96'];

type Tool = 'pan' | 'pin' | 'region' | 'stamp' | 'edit';

export default function MapEditor() {
  const { worldId = '', mapId = '' } = useParams();
  const navigate = useNavigate();
  const maps = useMaps(s => s.byWorld[worldId] ?? EMPTY_MAPS) as any as MapData[];
  const updateMap = useMaps(s => s.update);
  const removeMap = useMaps(s => s.remove);
  const articles = useArticles(s => s.byWorld[worldId] ?? EMPTY_ARTICLES) as any as Article[];
  const push = useToast(s => s.push);

  const map = useMemo(() => maps.find(m => m.id === mapId), [maps, mapId]);

  // Local interaction state
  const [tool, setTool] = useState<Tool>('pan');
  const [pendingKind, setPendingKind] = useState<PinKind>('city');
  const [pendingStampKey, setPendingStampKey] = useState<string>('mountain');
  const [pendingRegionPoints, setPendingRegionPoints] = useState<[number, number][]>([]);
  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedStamp, setSelectedStamp] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [confirmDeleteMap, setConfirmDeleteMap] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef<{ x: number; y: number } | null>(null);
  const draggingPin = useRef<string | null>(null);
  const draggingStamp = useRef<string | null>(null);

  // Normalize stamps array so existing maps without it don't crash.
  const stamps: MapStamp[] = (map as any)?.stamps ?? [];

  if (!map) return <EmptyState title="Map not found" />;

  function patchMap(p: Partial<MapData>) { updateMap(mapId, p); }

  function svgCoords(clientX: number, clientY: number): { x: number; y: number } {
    const el = wrapperRef.current;
    if (!el) return { x: 50, y: 50 };
    const rect = el.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    return { x: clamp(x, 0, 100), y: clamp(y, 0, 100) };
  }

  function handleCanvasClick(e: React.MouseEvent) {
    if (tool === 'pin') {
      const { x, y } = svgCoords(e.clientX, e.clientY);
      const kind = PIN_KINDS.find(k => k.key === pendingKind)!;
      const newPin: MapPin = {
        id: nanoid(8), x, y,
        label: kind.label,
        kind: pendingKind,
        color: kind.color,
      };
      patchMap({ pins: [...map.pins, newPin] });
      setSelectedPin(newPin.id);
      setTool('edit');
      push('Pin placed. Click it to edit.', 'success');
    } else if (tool === 'region') {
      const { x, y } = svgCoords(e.clientX, e.clientY);
      setPendingRegionPoints(p => [...p, [x, y]]);
    } else if (tool === 'stamp') {
      const { x, y } = svgCoords(e.clientX, e.clientY);
      const def = getStamp(pendingStampKey) ?? STAMPS[0];
      const newStamp: MapStamp = {
        id: nanoid(8), x, y,
        kind: def.key,
        scale: 1,
        rotation: 0,
        color: def.defaultColor,
      };
      patchMap({ stamps: [...stamps, newStamp] });
      // Stay in stamp mode so user can rapid-fire place a mountain range.
      // Don't auto-select — that would make the next click move it.
    } else if (tool === 'edit') {
      // click on empty canvas deselects
      setSelectedPin(null);
      setSelectedRegion(null);
      setSelectedStamp(null);
    }
  }

  function finishRegion() {
    if (pendingRegionPoints.length < 3) {
      push('A region needs at least 3 points.', 'error');
      return;
    }
    const newRegion: MapRegion = {
      id: nanoid(8),
      label: 'New Region',
      color: REGION_COLORS[map.regions.length % REGION_COLORS.length],
      points: pendingRegionPoints,
    };
    patchMap({ regions: [...map.regions, newRegion] });
    setPendingRegionPoints([]);
    setSelectedRegion(newRegion.id);
    setTool('edit');
    push('Region drawn.', 'success');
  }

  function cancelRegion() {
    setPendingRegionPoints([]);
    setTool('pan');
  }

  function startDragPin(pinId: string, e: React.MouseEvent) {
    if (tool !== 'edit') return;
    e.stopPropagation();
    draggingPin.current = pinId;
    setSelectedPin(pinId);
    setSelectedRegion(null);
    setSelectedStamp(null);
  }

  function startDragStamp(stampId: string, e: React.MouseEvent) {
    if (tool !== 'edit') return;
    e.stopPropagation();
    draggingStamp.current = stampId;
    setSelectedStamp(stampId);
    setSelectedPin(null);
    setSelectedRegion(null);
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (draggingPin.current) {
      const { x, y } = svgCoords(e.clientX, e.clientY);
      const updated = map.pins.map(p => p.id === draggingPin.current ? { ...p, x, y } : p);
      patchMap({ pins: updated });
    } else if (draggingStamp.current) {
      const { x, y } = svgCoords(e.clientX, e.clientY);
      const updated = stamps.map(s => s.id === draggingStamp.current ? { ...s, x, y } : s);
      patchMap({ stamps: updated });
    } else if (isPanning.current) {
      const dx = e.clientX - isPanning.current.x;
      const dy = e.clientY - isPanning.current.y;
      isPanning.current = { x: e.clientX, y: e.clientY };
      setPan(p => ({ x: p.x + dx, y: p.y + dy }));
    }
  }

  function handleMouseUp() {
    draggingPin.current = null;
    draggingStamp.current = null;
    isPanning.current = null;
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (tool === 'pan') {
      isPanning.current = { x: e.clientX, y: e.clientY };
    }
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    const dz = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(z => clamp(z + dz, 0.4, 4));
  }

  function updatePin(id: string, patch: Partial<MapPin>) {
    patchMap({ pins: map.pins.map(p => p.id === id ? { ...p, ...patch } : p) });
  }
  function deletePin(id: string) {
    patchMap({ pins: map.pins.filter(p => p.id !== id) });
    setSelectedPin(null);
  }
  function updateRegion(id: string, patch: Partial<MapRegion>) {
    patchMap({ regions: map.regions.map(r => r.id === id ? { ...r, ...patch } : r) });
  }
  function deleteRegion(id: string) {
    patchMap({ regions: map.regions.filter(r => r.id !== id) });
    setSelectedRegion(null);
  }
  function updateStamp(id: string, patch: Partial<MapStamp>) {
    patchMap({ stamps: stamps.map(s => s.id === id ? { ...s, ...patch } : s) });
  }
  function deleteStamp(id: string) {
    patchMap({ stamps: stamps.filter(s => s.id !== id) });
    setSelectedStamp(null);
  }

  async function onUploadBg(file: File) {
    // Get aspect ratio from the raw image, then store a compressed JPEG.
    const raw = await fileToDataUrl(file);
    const img = new Image();
    img.src = raw;
    await new Promise<void>((res) => { img.onload = () => res(); });
    const aspect = img.width / img.height;
    // Maps are bigger — allow 2400px on longest edge
    const compressed = await compressImageDataUrl(raw, 2400, 0.85);
    patchMap({ background: compressed, aspectRatio: aspect, style: 'image' });
  }

  const selPin = map.pins.find(p => p.id === selectedPin);
  const selRegion = map.regions.find(r => r.id === selectedRegion);
  const selStamp = stamps.find(s => s.id === selectedStamp);

  // Effective background CSS string (handles style presets + legacy maps).
  const effectiveBg = getEffectiveBackground(map);
  const ink = getInkColor(map);
  const lightStyle = isLightStyle(map);

  return (
    <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', height: '100%', minHeight: 0 }}>
      {/* Map canvas */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--panel-2)', flexWrap: 'wrap' }}>
          <input
            className="input"
            style={{ width: 'auto', fontFamily: 'Cinzel, serif', letterSpacing: '0.05em', fontSize: 16, background: 'transparent', border: 'none', padding: '4px 6px' }}
            value={map.name}
            onChange={e => patchMap({ name: e.target.value })}
          />
          <div style={{ width: 1, height: 24, background: 'var(--border)' }} />

          <ToolBtn active={tool === 'pan'} onClick={() => setTool('pan')} icon="globe" label="Pan" />
          <ToolBtn active={tool === 'pin'} onClick={() => setTool('pin')} icon="plus" label="Place pin" />
          <ToolBtn active={tool === 'stamp'} onClick={() => setTool('stamp')} icon="image" label="Stamp" />
          <ToolBtn active={tool === 'region'} onClick={() => setTool('region')} icon="shield" label="Draw region" />
          <ToolBtn active={tool === 'edit'} onClick={() => setTool('edit')} icon="edit" label="Select & move" />

          {tool === 'pin' && (
            <select className="select" style={{ width: 'auto' }} value={pendingKind} onChange={e => setPendingKind(e.target.value as PinKind)}>
              {PIN_KINDS.map(k => <option key={k.key} value={k.key}>{k.emoji} {k.label}</option>)}
            </select>
          )}

          {tool === 'stamp' && (
            <select className="select" style={{ width: 'auto' }} value={pendingStampKey} onChange={e => setPendingStampKey(e.target.value)}>
              {(Object.keys(STAMPS_BY_CATEGORY) as StampCategory[]).map(cat => (
                <optgroup key={cat} label={CATEGORY_LABELS[cat]}>
                  {STAMPS_BY_CATEGORY[cat].map(s => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          )}

          {tool === 'region' && (
            <>
              <button className="btn btn-primary" onClick={finishRegion} disabled={pendingRegionPoints.length < 3}>
                <Icon name="check" size={12} /> Finish region ({pendingRegionPoints.length} pts)
              </button>
              <button className="btn btn-ghost" onClick={cancelRegion}>
                <Icon name="x" size={12} /> Cancel
              </button>
            </>
          )}

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <button className="btn btn-ghost btn-icon" title="Zoom in" onClick={() => setZoom(z => clamp(z + 0.2, 0.4, 4))}><Icon name="plus" size={13} /></button>
            <span className="text-mute" style={{ fontSize: 12, minWidth: 36, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
            <button className="btn btn-ghost btn-icon" title="Zoom out" onClick={() => setZoom(z => clamp(z - 0.2, 0.4, 4))}><Icon name="x" size={13} /></button>
            <button className="btn btn-ghost btn-icon" title="Reset view" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}><Icon name="home" size={13} /></button>
          </div>
        </div>

        {/* Canvas */}
        <div
          style={{
            flex: 1, overflow: 'hidden', position: 'relative',
            cursor: tool === 'pan' ? 'grab' : (tool === 'pin' || tool === 'region' || tool === 'stamp') ? 'crosshair' : 'default',
            background: 'var(--bg)',
          }}
          onWheel={handleWheel}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            ref={wrapperRef}
            onClick={handleCanvasClick}
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseDown}
            style={{
              position: 'absolute',
              top: '50%', left: '50%',
              transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`,
              transformOrigin: 'center center',
              width: 'min(92%, 1400px)',
              aspectRatio: map.aspectRatio || (16 / 9),
              background: effectiveBg,
              borderRadius: 12,
              border: '1px solid var(--border)',
              boxShadow: '0 30px 60px -20px rgba(0,0,0,0.6)',
              userSelect: 'none',
            }}
          >
            {/* Grid */}
            {map.showGrid && (
              <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.25 }} viewBox="0 0 100 56" preserveAspectRatio="none">
                <g stroke="#43C7C7" strokeOpacity="0.4" strokeWidth="0.08">
                  {Array.from({ length: 11 }).map((_, i) => <line key={'v' + i} x1={i * 10} y1={0} x2={i * 10} y2={56} />)}
                  {Array.from({ length: 7 }).map((_, i) => <line key={'h' + i} x1={0} y1={i * 8} x2={100} y2={i * 8} />)}
                </g>
              </svg>
            )}

            {/* Regions */}
            <svg style={{ position: 'absolute', inset: 0, pointerEvents: tool === 'edit' ? 'auto' : 'none' }} viewBox="0 0 100 100" preserveAspectRatio="none">
              {map.regions.map(r => {
                const d = polygonPath(r.points);
                const isSelected = r.id === selectedRegion;
                return (
                  <path
                    key={r.id}
                    d={d}
                    fill={r.color}
                    fillOpacity={isSelected ? 0.35 : 0.18}
                    stroke={r.color}
                    strokeOpacity={isSelected ? 1 : 0.65}
                    strokeWidth="0.3"
                    style={{ cursor: tool === 'edit' ? 'pointer' : 'default' }}
                    onClick={e => {
                      if (tool !== 'edit') return;
                      e.stopPropagation();
                      setSelectedRegion(r.id);
                      setSelectedPin(null);
                    }}
                  />
                );
              })}

              {/* Pending region preview */}
              {pendingRegionPoints.length > 0 && (
                <>
                  <polyline
                    points={pendingRegionPoints.map(([x, y]) => `${x},${y}`).join(' ')}
                    fill="none"
                    stroke="#43C7C7"
                    strokeWidth="0.3"
                    strokeDasharray="1 1"
                  />
                  {pendingRegionPoints.map(([x, y], i) => (
                    <circle key={i} cx={x} cy={y} r="0.6" fill="#43C7C7" />
                  ))}
                </>
              )}
            </svg>

            {/* Stamps (decorative scenery) — between regions and pins */}
            {stamps.map(s => {
              const def = getStamp(s.kind);
              if (!def) return null;
              const isSel = s.id === selectedStamp;
              // Base size: ~4% of map's smaller dimension, then scaled.
              const sizePct = 4 * s.scale;
              const interactive = tool === 'edit';
              return (
                <div
                  key={s.id}
                  onMouseDown={e => startDragStamp(s.id, e)}
                  onClick={e => {
                    if (tool === 'edit') {
                      e.stopPropagation();
                      setSelectedStamp(s.id);
                      setSelectedPin(null);
                      setSelectedRegion(null);
                    }
                  }}
                  style={{
                    position: 'absolute',
                    left: `${s.x}%`, top: `${s.y}%`,
                    width: `${sizePct}%`,
                    transform: `translate(-50%, -50%) rotate(${s.rotation}deg)`,
                    cursor: interactive ? 'grab' : 'default',
                    pointerEvents: interactive ? 'auto' : 'none',
                    filter: isSel ? `drop-shadow(0 0 6px ${s.color ?? def.defaultColor})` : 'drop-shadow(0 1px 1px rgba(0,0,0,0.35))',
                  }}
                >
                  <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="xMidYMid meet"
                    style={{ width: '100%', height: '100%', display: 'block', color: s.color ?? def.defaultColor, overflow: 'visible' }}
                    dangerouslySetInnerHTML={{ __html: def.svg }}
                  />
                  {isSel && (
                    <div style={{
                      position: 'absolute', top: '100%', left: '50%', transform: 'translate(-50%, 4px)',
                      padding: '1px 6px', borderRadius: 4,
                      background: 'rgba(11,30,45,0.85)', border: '1px solid var(--border)',
                      fontSize: 10, whiteSpace: 'nowrap', color: 'var(--text)', pointerEvents: 'none',
                    }}>
                      {def.label}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Pins */}
            {map.pins.map(p => {
              const isSel = p.id === selectedPin;
              const k = PIN_KINDS.find(x => x.key === p.kind);
              return (
                <div
                  key={p.id}
                  onMouseDown={e => startDragPin(p.id, e)}
                  onClick={e => {
                    if (tool === 'edit') { e.stopPropagation(); setSelectedPin(p.id); setSelectedRegion(null); }
                  }}
                  style={{
                    position: 'absolute',
                    left: `${p.x}%`, top: `${p.y}%`,
                    transform: 'translate(-50%, -50%)',
                    cursor: tool === 'edit' ? 'grab' : 'default',
                    pointerEvents: tool === 'edit' ? 'auto' : 'none',
                  }}
                >
                  <div style={{
                    width: 22, height: 22, borderRadius: 999,
                    background: p.color || '#43C7C7',
                    border: isSel ? '2px solid #fff' : '2px solid rgba(255,255,255,0.4)',
                    boxShadow: isSel ? `0 0 0 4px ${(p.color || '#43C7C7')}55, 0 0 24px ${(p.color || '#43C7C7')}aa` : `0 0 12px ${(p.color || '#43C7C7')}99`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12,
                  }}>
                    <span>{k?.emoji || '📍'}</span>
                  </div>
                  {(isSel || tool === 'edit') && (
                    <div style={{
                      position: 'absolute', left: 26, top: '50%', transform: 'translateY(-50%)',
                      padding: '2px 8px', borderRadius: 4,
                      background: 'rgba(11,30,45,0.85)', border: '1px solid var(--border)',
                      fontSize: 11, whiteSpace: 'nowrap', color: 'var(--text)', pointerEvents: 'none',
                    }}>
                      {p.label}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Hint overlays */}
            {tool === 'region' && (
              <div style={{ position: 'absolute', top: 12, left: 12, padding: '6px 10px', background: 'rgba(11,30,45,0.85)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, color: 'var(--text)', pointerEvents: 'none' }}>
                Click to add polygon vertices. Need at least 3 to finish.
              </div>
            )}
            {tool === 'pin' && (
              <div style={{ position: 'absolute', top: 12, left: 12, padding: '6px 10px', background: 'rgba(11,30,45,0.85)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, color: 'var(--text)', pointerEvents: 'none' }}>
                Click anywhere to place a {PIN_KINDS.find(k => k.key === pendingKind)?.label.toLowerCase()}.
              </div>
            )}
            {tool === 'stamp' && (
              <div style={{ position: 'absolute', top: 12, left: 12, padding: '6px 10px', background: 'rgba(11,30,45,0.85)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, color: 'var(--text)', pointerEvents: 'none' }}>
                Click to scatter {getStamp(pendingStampKey)?.label.toLowerCase() ?? 'stamp'}s. Switch to <strong>Select</strong> to move, scale, or recolor.
              </div>
            )}

            {/* Compass rose */}
            {map.showCompass && (
              <div style={{
                position: 'absolute', top: '3%', right: '3%',
                width: '10%', maxWidth: 80, minWidth: 36, aspectRatio: '1 / 1',
                pointerEvents: 'none',
                opacity: 0.85,
              }}>
                <CompassRose color={ink} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Side panel */}
      <aside style={{ borderLeft: '1px solid var(--border)', background: 'var(--panel-2)', overflowY: 'auto' }} className="scrollbar-thin">
        {selPin ? (
          <PinDetail
            pin={selPin}
            articles={articles}
            worldId={worldId}
            onUpdate={(patch) => updatePin(selPin.id, patch)}
            onDelete={() => deletePin(selPin.id)}
            onOpenArticle={(id) => navigate(`/w/${worldId}/articles/${id}`)}
            onClose={() => setSelectedPin(null)}
          />
        ) : selRegion ? (
          <RegionDetail
            region={selRegion}
            articles={articles}
            worldId={worldId}
            onUpdate={(patch) => updateRegion(selRegion.id, patch)}
            onDelete={() => deleteRegion(selRegion.id)}
            onOpenArticle={(id) => navigate(`/w/${worldId}/articles/${id}`)}
            onClose={() => setSelectedRegion(null)}
          />
        ) : selStamp ? (
          <StampDetail
            stamp={selStamp}
            onUpdate={(patch) => updateStamp(selStamp.id, patch)}
            onDelete={() => deleteStamp(selStamp.id)}
            onClose={() => setSelectedStamp(null)}
          />
        ) : (
          <MapSettingsPanel
            map={map}
            onPatch={patchMap}
            onUploadBg={onUploadBg}
            onDelete={() => setConfirmDeleteMap(true)}
            pinCount={map.pins.length}
            regionCount={map.regions.length}
            stampCount={stamps.length}
          />
        )}
      </aside>

      {confirmDeleteMap && (
        <ConfirmDialog
          title="Erase this map?"
          danger
          confirmLabel="Erase"
          onConfirm={async () => { await removeMap(mapId); navigate(`/w/${worldId}/maps`); }}
          onCancel={() => setConfirmDeleteMap(false)}
        />
      )}
    </div>
  );
}

function ToolBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button
      className={`btn ${active ? 'btn-primary' : 'btn-ghost'}`}
      onClick={onClick}
      title={label}
    >
      <Icon name={icon} size={13} /> <span style={{ fontSize: 12 }}>{label}</span>
    </button>
  );
}

function PinDetail({ pin, articles, worldId, onUpdate, onDelete, onOpenArticle, onClose }: {
  pin: MapPin; articles: Article[]; worldId: string;
  onUpdate: (p: Partial<MapPin>) => void; onDelete: () => void; onOpenArticle: (id: string) => void; onClose: () => void;
}) {
  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="text-eyebrow text-accent">Pin</div>
        <button className="btn btn-ghost btn-icon" onClick={onClose}><Icon name="x" size={13} /></button>
      </div>
      <h3 className="text-display" style={{ fontSize: 18, margin: '4px 0 14px' }}>{pin.label || 'Untitled'}</h3>

      <label className="label">Label</label>
      <input className="input" value={pin.label} onChange={e => onUpdate({ label: e.target.value })} style={{ marginBottom: 10 }} />

      <label className="label">Kind</label>
      <select className="select" value={pin.kind} onChange={e => onUpdate({ kind: e.target.value as PinKind })} style={{ marginBottom: 10 }}>
        {PIN_KINDS.map(k => <option key={k.key} value={k.key}>{k.emoji} {k.label}</option>)}
      </select>

      <label className="label">Color</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        {[...REGION_COLORS, ...PIN_KINDS.map(k => k.color).filter((v, i, a) => a.indexOf(v) === i)].slice(0, 14).map(c => (
          <button
            key={c} onClick={() => onUpdate({ color: c })}
            style={{ width: 22, height: 22, borderRadius: 99, background: c, border: pin.color === c ? '2px solid #fff' : '1px solid var(--border)', cursor: 'pointer' }}
          />
        ))}
      </div>

      <label className="label">Linked article</label>
      <select className="select" value={pin.articleId || ''} onChange={e => onUpdate({ articleId: e.target.value || undefined })} style={{ marginBottom: 6 }}>
        <option value="">— none —</option>
        {articles.map(a => <option key={a.id} value={a.id}>{a.title} ({CATEGORY_MAP[a.category]?.label})</option>)}
      </select>
      {pin.articleId && (
        <button className="btn btn-ghost" onClick={() => onOpenArticle(pin.articleId!)} style={{ marginBottom: 10 }}>
          <Icon name="arrow-right" size={12} /> Open article
        </button>
      )}

      <label className="label">Note</label>
      <textarea className="textarea" rows={3} value={pin.note || ''} onChange={e => onUpdate({ note: e.target.value })} placeholder="What lives here? Why does it matter?" />

      <div className="text-dim" style={{ fontSize: 11, margin: '12px 0' }}>
        Position: {pin.x.toFixed(1)}, {pin.y.toFixed(1)}
      </div>

      <button className="btn btn-danger" onClick={onDelete} style={{ width: '100%' }}>
        <Icon name="trash" size={13} /> Delete pin
      </button>
    </div>
  );
}

function RegionDetail({ region, articles, worldId, onUpdate, onDelete, onOpenArticle, onClose }: {
  region: MapRegion; articles: Article[]; worldId: string;
  onUpdate: (p: Partial<MapRegion>) => void; onDelete: () => void; onOpenArticle: (id: string) => void; onClose: () => void;
}) {
  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="text-eyebrow text-accent">Region</div>
        <button className="btn btn-ghost btn-icon" onClick={onClose}><Icon name="x" size={13} /></button>
      </div>
      <h3 className="text-display" style={{ fontSize: 18, margin: '4px 0 14px' }}>{region.label}</h3>

      <label className="label">Label</label>
      <input className="input" value={region.label} onChange={e => onUpdate({ label: e.target.value })} style={{ marginBottom: 10 }} />

      <label className="label">Color</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        {REGION_COLORS.map(c => (
          <button
            key={c} onClick={() => onUpdate({ color: c })}
            style={{ width: 22, height: 22, borderRadius: 99, background: c, border: region.color === c ? '2px solid #fff' : '1px solid var(--border)', cursor: 'pointer' }}
          />
        ))}
      </div>

      <label className="label">Faction / Owner article</label>
      <select className="select" value={region.factionArticleId || ''} onChange={e => onUpdate({ factionArticleId: e.target.value || undefined })} style={{ marginBottom: 6 }}>
        <option value="">— none —</option>
        {articles.filter(a => ['country', 'organization', 'religion', 'character'].includes(a.category)).map(a => (
          <option key={a.id} value={a.id}>{a.title} ({CATEGORY_MAP[a.category]?.label})</option>
        ))}
      </select>
      {region.factionArticleId && (
        <button className="btn btn-ghost" onClick={() => onOpenArticle(region.factionArticleId!)} style={{ marginBottom: 10 }}>
          <Icon name="arrow-right" size={12} /> Open faction article
        </button>
      )}

      <label className="label">Note</label>
      <textarea className="textarea" rows={3} value={region.note || ''} onChange={e => onUpdate({ note: e.target.value })} />

      <div className="text-dim" style={{ fontSize: 11, margin: '12px 0' }}>
        {region.points.length} vertices
      </div>

      <button className="btn btn-danger" onClick={onDelete} style={{ width: '100%' }}>
        <Icon name="trash" size={13} /> Delete region
      </button>
    </div>
  );
}

function MapSettingsPanel({ map, onPatch, onUploadBg, onDelete, pinCount, regionCount, stampCount }: {
  map: MapData; onPatch: (p: Partial<MapData>) => void; onUploadBg: (f: File) => void; onDelete: () => void;
  pinCount: number; regionCount: number; stampCount: number;
}) {
  const bgInput = useRef<HTMLInputElement>(null);
  return (
    <div style={{ padding: 16 }}>
      <div className="text-eyebrow">Map</div>
      <h3 className="text-display" style={{ fontSize: 18, margin: '4px 0 14px' }}>{map.name}</h3>

      <div className="text-mute" style={{ fontSize: 12.5, marginBottom: 12 }}>
        {pinCount} pin{pinCount === 1 ? '' : 's'} · {regionCount} region{regionCount === 1 ? '' : 's'} · {stampCount} stamp{stampCount === 1 ? '' : 's'}
      </div>

      <label className="label">Description</label>
      <textarea className="textarea" rows={3} value={map.description} onChange={e => onPatch({ description: e.target.value })} style={{ marginBottom: 12 }} />

      <label className="label">Map style</label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
        {MAP_STYLE_PRESETS.map(p => {
          const isActive = (map.style ?? '') === p.key;
          return (
            <button
              key={p.key}
              onClick={() => onPatch({ style: p.key })}
              title={p.label}
              style={{
                height: 44,
                borderRadius: 6,
                background: p.background,
                border: isActive ? '2px solid var(--accent)' : '1px solid var(--border)',
                cursor: 'pointer',
                color: p.inkColor,
                fontFamily: 'Cinzel, serif',
                fontSize: 11,
                letterSpacing: '0.08em',
                textShadow: p.isLight ? '0 1px 0 rgba(255,255,255,0.5)' : '0 1px 0 rgba(0,0,0,0.5)',
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <button className="btn btn-ghost" onClick={() => bgInput.current?.click()} style={{ width: '100%', marginBottom: 8 }}>
        <Icon name="image" size={13} /> Upload custom map image
      </button>
      {map.style === 'image' && map.background?.startsWith('data:') && (
        <div className="text-dim" style={{ fontSize: 11, marginBottom: 8, fontStyle: 'italic' }}>
          Using uploaded image. Pick a style above to replace it.
        </div>
      )}
      <input ref={bgInput} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onUploadBg(f); e.target.value = ''; }} />

      <label className="label" style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginTop: 4 }}>
        <input
          type="checkbox"
          checked={map.showGrid}
          onChange={e => onPatch({ showGrid: e.target.checked })}
        />
        Show grid
      </label>
      <label className="label" style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={!!map.showCompass}
          onChange={e => onPatch({ showCompass: e.target.checked })}
        />
        Show compass rose
      </label>

      <div className="rune-divider-app" />

      <div className="text-mute" style={{ fontSize: 12, lineHeight: 1.6 }}>
        <strong>Tips</strong><br />
        • <strong>Pan</strong>: click & drag · <strong>Wheel</strong>: zoom<br />
        • <strong>Pin</strong>: click to drop — labels & article links<br />
        • <strong>Stamp</strong>: scatter decorative scenery<br />
        • <strong>Region</strong>: click vertices, then "Finish region"<br />
        • <strong>Select</strong>: click anything to edit, drag pins/stamps to move
      </div>

      <div className="rune-divider-app" />

      <button className="btn btn-danger" onClick={onDelete} style={{ width: '100%' }}>
        <Icon name="trash" size={13} /> Delete map
      </button>
    </div>
  );
}

function StampDetail({ stamp, onUpdate, onDelete, onClose }: {
  stamp: MapStamp;
  onUpdate: (p: Partial<MapStamp>) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const def = getStamp(stamp.kind);
  const swatches = ['#4a3318', '#2c6a3a', '#1f4423', '#1b4a6e', '#3a3a3a', '#a83a2a', '#d49a2a', '#5c2d8a', '#d6cfb8', '#7a5a36', '#1a1a1a', '#43c7c7'];
  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="text-eyebrow text-accent">Stamp</div>
        <button className="btn btn-ghost btn-icon" onClick={onClose}><Icon name="x" size={13} /></button>
      </div>
      <h3 className="text-display" style={{ fontSize: 18, margin: '4px 0 14px' }}>{def?.label ?? 'Stamp'}</h3>

      <label className="label">Type</label>
      <select
        className="select"
        value={stamp.kind}
        onChange={e => {
          const next = getStamp(e.target.value);
          // When swapping type, adopt the new default color if user hadn't customized.
          onUpdate({ kind: e.target.value, color: stamp.color === def?.defaultColor ? next?.defaultColor : stamp.color });
        }}
        style={{ marginBottom: 10 }}
      >
        {(Object.keys(STAMPS_BY_CATEGORY) as StampCategory[]).map(cat => (
          <optgroup key={cat} label={CATEGORY_LABELS[cat]}>
            {STAMPS_BY_CATEGORY[cat].map(s => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </optgroup>
        ))}
      </select>

      <label className="label">Size · {Math.round(stamp.scale * 100)}%</label>
      <input
        type="range"
        min={0.4} max={4} step={0.05}
        value={stamp.scale}
        onChange={e => onUpdate({ scale: parseFloat(e.target.value) })}
        style={{ width: '100%', marginBottom: 8, accentColor: 'var(--accent)' }}
      />

      <label className="label">Rotation · {Math.round(stamp.rotation)}°</label>
      <input
        type="range"
        min={-180} max={180} step={1}
        value={stamp.rotation}
        onChange={e => onUpdate({ rotation: parseFloat(e.target.value) })}
        style={{ width: '100%', marginBottom: 8, accentColor: 'var(--accent)' }}
      />

      <label className="label">Color</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {swatches.map(c => (
          <button
            key={c} onClick={() => onUpdate({ color: c })}
            style={{ width: 22, height: 22, borderRadius: 99, background: c, border: (stamp.color ?? def?.defaultColor) === c ? '2px solid #fff' : '1px solid var(--border)', cursor: 'pointer' }}
          />
        ))}
      </div>

      <div className="text-dim" style={{ fontSize: 11, marginBottom: 10 }}>
        Position: {stamp.x.toFixed(1)}, {stamp.y.toFixed(1)} · drag the stamp on the canvas to move it.
      </div>

      <button className="btn btn-danger" onClick={onDelete} style={{ width: '100%' }}>
        <Icon name="trash" size={13} /> Delete stamp
      </button>
    </div>
  );
}

function CompassRose({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', color }}>
      <circle cx="50" cy="50" r="44" stroke="currentColor" strokeOpacity="0.6" strokeWidth="0.6" fill="none" />
      <circle cx="50" cy="50" r="34" stroke="currentColor" strokeOpacity="0.4" strokeWidth="0.4" fill="none" />
      {/* Main 4 points */}
      <path fill="currentColor" fillOpacity="0.9" d="M50 8 L54 50 L50 92 L46 50 Z"/>
      <path fill="currentColor" fillOpacity="0.6" d="M8 50 L50 54 L92 50 L50 46 Z"/>
      {/* Diagonals */}
      <path fill="currentColor" fillOpacity="0.5" d="M22 22 L52 48 L78 78 L48 52 Z"/>
      <path fill="currentColor" fillOpacity="0.5" d="M78 22 L52 48 L22 78 L48 52 Z"/>
      <circle cx="50" cy="50" r="3" fill="currentColor"/>
      <text x="50" y="18" textAnchor="middle" fontSize="9" fontFamily="Cinzel, serif" fill="currentColor">N</text>
    </svg>
  );
}

function polygonPath(points: [number, number][]): string {
  if (points.length === 0) return '';
  return points.map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`)).join(' ') + ' Z';
}

function clamp(n: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, n)); }
