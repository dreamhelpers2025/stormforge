import React from 'react';

export type IconName =
  | 'codex' | 'dragon' | 'map' | 'scroll' | 'shield' | 'compass' | 'crown'
  | 'rune' | 'flame' | 'feather' | 'lightning' | 'claw' | 'user' | 'search'
  | 'plus' | 'settings' | 'sun' | 'moon' | 'trash' | 'edit' | 'check' | 'x'
  | 'arrow-left' | 'arrow-right' | 'home' | 'globe' | 'book' | 'image'
  | 'star' | 'bold' | 'italic' | 'underline' | 'list' | 'list-ordered'
  | 'quote' | 'heading-1' | 'heading-2' | 'heading-3' | 'link' | 'undo'
  | 'redo' | 'eye' | 'eye-off' | 'download' | 'upload' | 'menu' | 'sparkles'
  | 'chevron-down' | 'chevron-right';

interface Props {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

export default function Icon({ name, size = 16, className = '', strokeWidth = 1.5 }: Props) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
  };
  switch (name) {
    case 'codex':
    case 'book':         return <svg {...props}><path d="M4 4c3-1 5-1 8 1 3-2 5-2 8-1v15c-3-1-5-1-8 1-3-2-5-2-8-1V4Z"/><path d="M12 5v16"/></svg>;
    case 'dragon':       return <svg {...props}><path d="M3 16c1-4 5-7 10-7l4-3-1 4c2 1 3 3 3 5"/><path d="M14 9c2 0 3 2 3 4"/><circle cx="15" cy="10" r=".7" fill="currentColor"/><path d="M7 17l-2 4 4-2 2 2 2-2 3 2-1-4"/></svg>;
    case 'map':          return <svg {...props}><path d="M3 6l6-2 6 2 6-2v16l-6 2-6-2-6 2V6Z"/><path d="M9 4v18M15 6v18"/></svg>;
    case 'scroll':       return <svg {...props}><path d="M5 5h12a2 2 0 012 2v2H7V7a2 2 0 00-2-2Z"/><path d="M5 5a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V9"/><path d="M9 13h6M9 17h6"/></svg>;
    case 'shield':       return <svg {...props}><path d="M12 3l8 2v6c0 5-4 8-8 10-4-2-8-5-8-10V5l8-2Z"/><path d="M9 12l2 2 4-4"/></svg>;
    case 'compass':      return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M12 5l2 5-2 7-2-7 2-5Z"/></svg>;
    case 'crown':        return <svg {...props}><path d="M3 9l3 7h12l3-7-4 3-3-6-3 6-3-6-3 6-2-3Z"/><path d="M6 18h12"/></svg>;
    case 'rune':         return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M8 7v10M8 7l4 4 4-4M8 12l4 4 4-4"/></svg>;
    case 'flame':        return <svg {...props}><path d="M12 3c2 4 5 6 5 10a5 5 0 11-10 0c0-3 2-4 3-7 1 2 2 4 2 6"/></svg>;
    case 'feather':      return <svg {...props}><path d="M20 4c-6 1-11 5-11 12v3l3-3c6 0 11-4 11-11"/><path d="M9 18l9-9"/></svg>;
    case 'lightning':    return <svg {...props}><path d="M13 2L4 14h7l-1 8 9-13h-7l1-7Z"/></svg>;
    case 'claw':         return <svg {...props}><path d="M5 5c3 3 3 7 0 10"/><path d="M9 4c4 4 4 9 0 13"/><path d="M14 4c5 5 5 11 0 16"/></svg>;
    case 'user':         return <svg {...props}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>;
    case 'search':       return <svg {...props}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>;
    case 'plus':         return <svg {...props}><path d="M12 5v14M5 12h14"/></svg>;
    case 'settings':     return <svg {...props}><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 00-.1-1.2l2-1.6-2-3.4-2.3.9a7 7 0 00-2-1.2L14 3h-4l-.6 2.5a7 7 0 00-2 1.2L5 5.8 3 9.2l2 1.6A7 7 0 005 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.3-.9a7 7 0 002 1.2L10 21h4l.6-2.5a7 7 0 002-1.2l2.3.9 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z"/></svg>;
    case 'sun':          return <svg {...props}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/></svg>;
    case 'moon':         return <svg {...props}><path d="M21 12.8A8 8 0 1111.2 3 6 6 0 0021 12.8Z"/></svg>;
    case 'trash':        return <svg {...props}><path d="M4 6h16M9 6V4h6v2M6 6l1 14h10l1-14"/></svg>;
    case 'edit':         return <svg {...props}><path d="M4 20h4l10-10-4-4L4 16v4Z"/><path d="M14 6l4 4"/></svg>;
    case 'check':        return <svg {...props}><path d="M4 12l5 5L20 6"/></svg>;
    case 'x':            return <svg {...props}><path d="M6 6l12 12M18 6L6 18"/></svg>;
    case 'arrow-left':   return <svg {...props}><path d="M19 12H5M12 5l-7 7 7 7"/></svg>;
    case 'arrow-right':  return <svg {...props}><path d="M5 12h14M12 5l7 7-7 7"/></svg>;
    case 'home':         return <svg {...props}><path d="M3 11l9-8 9 8v9a2 2 0 01-2 2h-4v-6h-6v6H5a2 2 0 01-2-2v-9Z"/></svg>;
    case 'globe':        return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/></svg>;
    case 'image':        return <svg {...props}><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/></svg>;
    case 'star':         return <svg {...props}><path d="M12 3l3 6 6 1-4.5 4.5L18 21l-6-3-6 3 1.5-6.5L3 10l6-1 3-6Z"/></svg>;
    case 'bold':         return <svg {...props}><path d="M7 4h6a4 4 0 010 8H7V4ZM7 12h7a4 4 0 010 8H7v-8Z"/></svg>;
    case 'italic':       return <svg {...props}><path d="M14 4h-4M14 20h-4M15 4l-6 16"/></svg>;
    case 'underline':    return <svg {...props}><path d="M6 4v8a6 6 0 0012 0V4M5 21h14"/></svg>;
    case 'list':         return <svg {...props}><path d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01"/></svg>;
    case 'list-ordered': return <svg {...props}><path d="M9 6h12M9 12h12M9 18h12M5 4v4M3 4h2M3 14h2v2H3v2h2"/></svg>;
    case 'quote':        return <svg {...props}><path d="M7 7H4v6h4v-2H6V9c0-1 1-2 2-2V5C6 5 4 6 4 9M15 7h-3v6h4v-2h-2V9c0-1 1-2 2-2V5c-2 0-4 1-4 4"/></svg>;
    case 'heading-1':    return <svg {...props}><path d="M5 4v16M14 4v16M5 12h9M19 8v12"/></svg>;
    case 'heading-2':    return <svg {...props}><path d="M5 4v16M14 4v16M5 12h9M18 20h4l-4-6c0-2 1-3 2-3s2 1 2 2"/></svg>;
    case 'heading-3':    return <svg {...props}><path d="M5 4v16M14 4v16M5 12h9M18 9c1-1 4-1 4 1s-2 2-3 2c2 0 4 1 4 3s-3 3-5 1"/></svg>;
    case 'link':         return <svg {...props}><path d="M10 14a4 4 0 005.66 0l3-3a4 4 0 10-5.66-5.66l-1.5 1.5"/><path d="M14 10a4 4 0 00-5.66 0l-3 3a4 4 0 105.66 5.66l1.5-1.5"/></svg>;
    case 'undo':         return <svg {...props}><path d="M3 7h11a6 6 0 010 12H8M3 7l4-4M3 7l4 4"/></svg>;
    case 'redo':         return <svg {...props}><path d="M21 7H10a6 6 0 000 12h6M21 7l-4-4M21 7l-4 4"/></svg>;
    case 'eye':          return <svg {...props}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>;
    case 'eye-off':      return <svg {...props}><path d="M17 17a10 10 0 01-5 1c-6 0-10-7-10-7a18 18 0 014-4M9.9 5.1A10 10 0 0112 5c6 0 10 7 10 7a18 18 0 01-3 3.7M14 14a3 3 0 11-4-4M2 2l20 20"/></svg>;
    case 'download':     return <svg {...props}><path d="M12 4v12M6 12l6 6 6-6M4 20h16"/></svg>;
    case 'upload':       return <svg {...props}><path d="M12 20V8M6 12l6-6 6 6M4 4h16"/></svg>;
    case 'menu':         return <svg {...props}><path d="M3 6h18M3 12h18M3 18h18"/></svg>;
    case 'sparkles':     return <svg {...props}><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3ZM19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14ZM5 14l.6 1.4L7 16l-1.4.6L5 18l-.6-1.4L3 16l1.4-.6L5 14Z"/></svg>;
    case 'chevron-down': return <svg {...props}><path d="M6 9l6 6 6-6"/></svg>;
    case 'chevron-right':return <svg {...props}><path d="M9 6l6 6-6 6"/></svg>;
  }
  return null;
}
