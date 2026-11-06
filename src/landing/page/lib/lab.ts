// The Template Lab chapter's script: what the SL editor (pages/admin/lab/SlTemplate.tsx) shows at each beat.
// Beats follow copy.ts tags: YZ, SL, Settings, AI Template Builder, then Coming to the Lab. Settings flips three
// of the editor's real controls in turn; the AI Template Builder sends two prompts through the real template
// agent (lib/template-agent.ts), so the replies and the changes they make are the app's own.
import { DEFAULT_SETTINGS, type ThemeSettings } from '@/contexts/ThemeContext';
import { processMessage } from '@/lib/template-agent';

export type LabTab = 'settings' | 'ai';
export interface LabLine { role: 'user' | 'system'; text: string }
export interface LabFrame {
  settings: ThemeSettings;
  tab: LabTab;
  /** The ThemeControls label of the control that just changed, ringed in the sidebar. */
  focus: string | null;
  chat: LabLine[];
  /** A prompt sitting in the chat input, about to be sent. */
  draft: string;
}

/** SlTemplate.tsx's ThemeProvider defaults: the SL template opens light, with transparent thumbnails. */
export const SL_START: ThemeSettings = { ...DEFAULT_SETTINGS, mode: 'light', tileBgMode: 'transparent' };

/** Settings: each step flips one control at its point in the beat. */
const STEPS: { at: number; label: string; update: Partial<ThemeSettings> }[] = [
  { at: 0.15, label: 'CARD TRIGGER', update: { slExpandTriggerStyle: 'icon_text' } },
  { at: 0.45, label: 'BACKGROUND MODE', update: { mode: 'dark' } },
  { at: 0.75, label: 'THUMBNAIL BACKGROUND', update: { tileBgMode: 'default' } },
];

/** The AI tab's starting suggestions (SlTemplate.tsx). */
export const LAB_SUGGESTIONS = [
  'Switch to light mode with a serif heading font',
  'Make the hover glow gold for a luxury feel',
  'Use monospaced numerals for cleaner prices',
  'Make everything bigger and more readable',
];

/** Two of those suggestions, each sent at `send` and answered at `reply`. */
const PROMPTS = [
  { q: LAB_SUGGESTIONS[0], send: 0.12, reply: 0.3 },
  { q: LAB_SUGGESTIONS[3], send: 0.58, reply: 0.76 },
];
/** How long a prompt sits in the input before it's sent. */
const DRAFT = 0.1;

/** The settings after each Settings step (0 = none yet). Kept, so a frame's settings only change when a control does. */
const STATES = STEPS.reduce<ThemeSettings[]>((all, st) => [...all, { ...all[all.length - 1], ...st.update }], [SL_START]);
const AFTER_SETTINGS = STATES[STATES.length - 1];

/** The agent's real answers, each one given the settings the one before it left. */
const ANSWERS = (() => {
  let s = AFTER_SETTINGS;
  return PROMPTS.map(p => {
    const r = processMessage(p.q, s);
    s = { ...s, ...r.themeUpdate };
    return { ...p, a: r.message, settings: s };
  });
})();

/** Fonts the script switches to, which the page loads from Google once the chapter is near. */
export const LAB_FONTS = [...new Set(ANSWERS.map(a => a.settings.displayFont))].filter(f => f !== SL_START.displayFont);

const BEAT = { yz: 0, sl: 1, settings: 2, ai: 3, coming: 4 } as const;

/** The editor at a beat of the chapter and a point `t` (0 to 1) through it. */
export function labFrame(beat: number, t: number): LabFrame {
  if (beat < BEAT.settings) return { settings: SL_START, tab: 'settings', focus: null, chat: [], draft: '' };
  if (beat === BEAT.settings) {
    const done = STEPS.filter(s => t >= s.at).length;
    return { settings: STATES[done], tab: 'settings', focus: done ? STEPS[done - 1].label : null, chat: [], draft: '' };
  }
  const at = beat === BEAT.ai ? t : 1;
  const chat: LabLine[] = [];
  let settings = AFTER_SETTINGS;
  let draft = '';
  for (const a of ANSWERS) {
    if (at >= a.send) chat.push({ role: 'user', text: a.q });
    else if (at >= a.send - DRAFT && !draft) draft = a.q;
    if (at >= a.reply) { chat.push({ role: 'system', text: a.a }); settings = a.settings; }
  }
  return { settings, tab: 'ai', focus: null, chat, draft };
}
