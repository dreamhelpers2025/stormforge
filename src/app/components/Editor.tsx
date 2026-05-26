import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { WikiLink } from './WikiLinkExtension';
import Icon from './Icon';
import type { Article } from '../types';

interface Props {
  initialJson: any;
  articlesIndex: Record<string, Article>;
  onChange: (json: any, plain: string) => void;
  onOpenArticle?: (id: string) => void;
}

export default function Editor({ initialJson, articlesIndex, onChange, onOpenArticle }: Props) {
  const [linkPrompt, setLinkPrompt] = useState<null | { target: string }>(null);
  const articlesByTitle = useMemo(() => {
    const out: Record<string, Article> = {};
    for (const id in articlesIndex) {
      const a = articlesIndex[id];
      out[a.title.toLowerCase()] = a;
    }
    return out;
  }, [articlesIndex]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Image.configure({ allowBase64: true, inline: false }),
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
      Placeholder.configure({ placeholder: 'Begin writing… use [[Title]] to link to other articles.' }),
      WikiLink,
    ],
    content: initialJson,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON(), editor.getText());
      reflectBroken(editor);
    },
    onCreate: ({ editor }) => reflectBroken(editor),
  });

  // After articles index changes, recompute broken state visually
  useEffect(() => { if (editor) reflectBroken(editor); }, [articlesByTitle, editor]);

  function reflectBroken(ed: any) {
    if (!ed) return;
    const wrapper: HTMLElement | null = ed.view?.dom;
    if (!wrapper) return;
    const spans = wrapper.querySelectorAll('span[data-wikilink]');
    spans.forEach(s => {
      const t = (s.getAttribute('data-wikilink') || '').toLowerCase();
      const found = !!articlesByTitle[t];
      s.classList.toggle('broken', !found);
      if (found) s.setAttribute('title', 'Open: ' + articlesByTitle[t].title);
      else       s.setAttribute('title', 'No article named "' + s.getAttribute('data-wikilink') + '" yet — click to think about creating one');
    });
  }

  // Delegate clicks on wiki links to open the target article
  const wrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    function handler(e: MouseEvent) {
      const t = e.target as HTMLElement;
      const wl = t.closest('span[data-wikilink]') as HTMLElement | null;
      if (wl) {
        e.preventDefault();
        const target = (wl.getAttribute('data-wikilink') || '').toLowerCase();
        const art = articlesByTitle[target];
        if (art && onOpenArticle) onOpenArticle(art.id);
      }
    }
    el.addEventListener('click', handler);
    return () => el.removeEventListener('click', handler);
  }, [articlesByTitle, onOpenArticle]);

  function fileInputRef() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file || !editor) return;
      const reader = new FileReader();
      reader.onload = () => {
        editor.chain().focus().setImage({ src: reader.result as string, alt: file.name }).run();
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  function addLink() {
    if (!editor) return;
    const url = prompt('URL:');
    if (!url) return;
    editor.chain().focus().setLink({ href: url }).run();
  }

  function insertWiki() {
    setLinkPrompt({ target: '' });
  }

  function confirmWiki(target: string) {
    if (!editor || !target.trim()) { setLinkPrompt(null); return; }
    editor.chain().focus().insertWikiLink(target.trim()).run();
    setLinkPrompt(null);
  }

  if (!editor) return null;

  return (
    <div>
      <div className="editor-toolbar">
        <button onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'is-active' : ''} title="Bold (Ctrl+B)"><Icon name="bold" size={14} /></button>
        <button onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'is-active' : ''} title="Italic (Ctrl+I)"><Icon name="italic" size={14} /></button>
        <button onClick={() => editor.chain().focus().toggleStrike().run()} className={editor.isActive('strike') ? 'is-active' : ''} title="Strike"><span style={{ textDecoration: 'line-through', fontSize: 13 }}>S</span></button>
        <button onClick={() => editor.chain().focus().toggleCode().run()} className={editor.isActive('code') ? 'is-active' : ''} title="Code">{`<>`}</button>
        <div className="sep" />
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''} title="H1"><Icon name="heading-1" size={14} /></button>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''} title="H2"><Icon name="heading-2" size={14} /></button>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''} title="H3"><Icon name="heading-3" size={14} /></button>
        <div className="sep" />
        <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={editor.isActive('bulletList') ? 'is-active' : ''} title="Bullet list"><Icon name="list" size={14} /></button>
        <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={editor.isActive('orderedList') ? 'is-active' : ''} title="Numbered list"><Icon name="list-ordered" size={14} /></button>
        <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={editor.isActive('blockquote') ? 'is-active' : ''} title="Quote"><Icon name="quote" size={14} /></button>
        <div className="sep" />
        <button onClick={insertWiki} title="Insert wiki link"><Icon name="link" size={14} /> [[ ]]</button>
        <button onClick={addLink} title="External link"><Icon name="link" size={14} /></button>
        <button onClick={fileInputRef} title="Insert image"><Icon name="image" size={14} /></button>
        <div className="sep" />
        <button onClick={() => editor.chain().focus().undo().run()} title="Undo"><Icon name="undo" size={14} /></button>
        <button onClick={() => editor.chain().focus().redo().run()} title="Redo"><Icon name="redo" size={14} /></button>
      </div>

      <div ref={wrapperRef} className="tiptap-wrap">
        <EditorContent editor={editor} className="tiptap" />
      </div>

      {linkPrompt && (
        <div className="modal-backdrop" onClick={() => setLinkPrompt(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="text-eyebrow">Wiki Link</div>
            <h2 className="text-display" style={{ fontSize: 18, margin: '6px 0 14px' }}>Link to which article?</h2>
            <input
              autoFocus
              className="input"
              placeholder="Article title (e.g. House Vorelith)"
              value={linkPrompt.target}
              onChange={e => setLinkPrompt({ target: e.target.value })}
              onKeyDown={e => {
                if (e.key === 'Enter') confirmWiki(linkPrompt.target);
                if (e.key === 'Escape') setLinkPrompt(null);
              }}
            />
            <div className="text-mute" style={{ fontSize: 12, marginTop: 8 }}>
              Tip: you can also type <code>[[Title]]</code> directly in the editor.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={() => setLinkPrompt(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => confirmWiki(linkPrompt.target)}>Insert</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
