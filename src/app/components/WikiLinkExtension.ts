import { Node, mergeAttributes, InputRule } from '@tiptap/core';

/**
 * WikiLink inline node.
 * Renders [[Target|Display]] as an inline mention-style link that can be
 * clicked to navigate. Stored target is plain text; display is optional.
 */
export interface WikiLinkOptions {
  HTMLAttributes: Record<string, any>;
  onClick?: (target: string) => void;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    wikilink: {
      insertWikiLink: (target: string, display?: string) => ReturnType;
    };
  }
}

export const WikiLink = Node.create<WikiLinkOptions>({
  name: 'wikilink',
  inline: true,
  group: 'inline',
  atom: true,
  selectable: true,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      target: { default: '' },
      display: { default: null },
      broken: { default: false, rendered: false },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-wikilink]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const display = node.attrs.display || node.attrs.target;
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-wikilink': node.attrs.target,
        class: 'wikilink' + (node.attrs.broken ? ' broken' : ''),
        title: 'Open ' + node.attrs.target,
      }),
      display,
    ];
  },

  renderText({ node }) {
    const t = node.attrs.target;
    const d = node.attrs.display;
    return d ? `[[${t}|${d}]]` : `[[${t}]]`;
  },

  addCommands() {
    return {
      insertWikiLink: (target, display) => ({ chain }) =>
        chain().insertContent({ type: this.name, attrs: { target, display: display ?? null } }).insertContent(' ').run(),
    };
  },

  addInputRules() {
    return [
      new InputRule({
        find: /\[\[([^\]\|]+)(?:\|([^\]]+))?\]\]$/,
        handler: ({ range, match, chain }) => {
          const target = (match[1] ?? '').trim();
          const display = match[2] ? match[2].trim() : null;
          if (!target) return;
          chain()
            .deleteRange(range)
            .insertContent({ type: 'wikilink', attrs: { target, display } })
            .insertContent(' ')
            .run();
        },
      }),
    ];
  },

  addProseMirrorPlugins() {
    const onClick = this.options.onClick;
    return [
      // we use event delegation in the editor wrapper instead, so no plugin
    ];
  },
});
