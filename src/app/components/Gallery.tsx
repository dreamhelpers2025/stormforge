import React, { useRef, useState } from 'react';
import { nanoid } from 'nanoid';
import type { GalleryImage } from '../types';
import { compressFile } from '../lib/imageCompress';
import Icon from './Icon';

interface Props {
  images: GalleryImage[];
  onChange: (next: GalleryImage[]) => void;
}

export default function Gallery({ images, onChange }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);

  async function handleAdd(files: FileList | null) {
    if (!files || !files.length) return;
    const compressed = await Promise.all(
      Array.from(files).map(async file => ({
        id: nanoid(8),
        dataUrl: await compressFile(file, 1600, 0.82),
        caption: file.name,
      }))
    );
    onChange([...images, ...compressed]);
  }

  function updateCaption(id: string, caption: string) {
    onChange(images.map(i => i.id === id ? { ...i, caption } : i));
  }
  function remove(id: string) {
    onChange(images.filter(i => i.id !== id));
  }
  function move(id: string, dir: -1 | 1) {
    const idx = images.findIndex(i => i.id === id);
    if (idx < 0) return;
    const target = idx + dir;
    if (target < 0 || target >= images.length) return;
    const next = images.slice();
    const [item] = next.splice(idx, 1);
    next.splice(target, 0, item);
    onChange(next);
  }

  return (
    <div className="sf-card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div className="text-eyebrow">Gallery</div>
          <div className="text-mute" style={{ fontSize: 12, marginTop: 2 }}>
            {images.length === 0 ? 'No images yet' : `${images.length} image${images.length === 1 ? '' : 's'}`}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => fileInput.current?.click()}>
          <Icon name="plus" size={13} /> Add images
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={e => { handleAdd(e.target.files); e.target.value = ''; }}
        />
      </div>

      {images.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
          {images.map((img, idx) => (
            <div key={img.id} className="sf-card" style={{ padding: 6, overflow: 'hidden' }}>
              <div
                style={{
                  aspectRatio: '1 / 1',
                  background: `url(${img.dataUrl}) center/cover`,
                  borderRadius: 6,
                  cursor: 'zoom-in',
                  border: '1px solid var(--border)',
                }}
                onClick={() => setLightbox(idx)}
              />
              <input
                className="input"
                style={{ marginTop: 6, fontSize: 12, padding: '5px 8px' }}
                placeholder="Caption…"
                value={img.caption || ''}
                onChange={e => updateCaption(img.id, e.target.value)}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <div style={{ display: 'flex', gap: 2 }}>
                  <button className="btn btn-ghost btn-icon" title="Move left" disabled={idx === 0} onClick={() => move(img.id, -1)}>
                    <Icon name="arrow-left" size={12} />
                  </button>
                  <button className="btn btn-ghost btn-icon" title="Move right" disabled={idx === images.length - 1} onClick={() => move(img.id, 1)}>
                    <Icon name="arrow-right" size={12} />
                  </button>
                </div>
                <button className="btn btn-ghost btn-icon" title="Remove" onClick={() => remove(img.id)}>
                  <Icon name="trash" size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {lightbox != null && images[lightbox] && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 90,
            background: 'rgba(5,11,16,0.85)', backdropFilter: 'blur(6px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: 24,
          }}
        >
          <img
            src={images[lightbox].dataUrl}
            alt={images[lightbox].caption || ''}
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '88vw', maxHeight: '80vh', borderRadius: 8, boxShadow: '0 40px 80px rgba(0,0,0,0.6)' }}
          />
          {images[lightbox].caption && (
            <div className="text-serif" style={{ fontStyle: 'italic', marginTop: 12, color: '#fff', maxWidth: 600, textAlign: 'center' }}>
              {images[lightbox].caption}
            </div>
          )}
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} disabled={lightbox === 0} onClick={e => { e.stopPropagation(); setLightbox(lightbox - 1); }}>
              <Icon name="arrow-left" size={13} /> Previous
            </button>
            <button className="btn btn-ghost" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} disabled={lightbox === images.length - 1} onClick={e => { e.stopPropagation(); setLightbox(lightbox + 1); }}>
              Next <Icon name="arrow-right" size={13} />
            </button>
            <button className="btn btn-ghost" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} onClick={() => setLightbox(null)}>
              <Icon name="x" size={13} /> Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
