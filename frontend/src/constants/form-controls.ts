/**
 * Shared compact sizing for inputs, selects, and textareas — keep form density consistent app-wide.
 */
const FORM_FOCUS =
    'outline-none transition-all focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10';

/** Standard text input / textarea (no leading icon) */
export const FORM_CONTROL_CLASS =
    `w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-3.5 py-[11px] text-sm font-medium text-slate-900 ${FORM_FOCUS} disabled:cursor-not-allowed disabled:opacity-60`;

/** Native select — room for chevron overlay */
export const FORM_SELECT_CLASS =
    `w-full appearance-none rounded-xl border-2 border-slate-200 bg-slate-50 py-[11px] pl-3.5 pr-10 text-sm font-medium text-slate-900 ${FORM_FOCUS} disabled:cursor-not-allowed disabled:opacity-60`;

/** Leading icon — pair with icon at left-3.5, size w-4 h-4 */
export const FORM_CONTROL_LEADING_ICON =
    `w-full rounded-xl border-2 border-slate-200 bg-slate-50 py-[11px] pl-10 pr-3.5 text-sm font-medium text-slate-900 ${FORM_FOCUS} disabled:cursor-not-allowed disabled:opacity-60`;

/** Search bars on tinted strips (transparent border until focus) */
export const FORM_CONTROL_SEARCH =
    `w-full rounded-xl border-2 border-transparent bg-slate-50 py-[11px] pl-10 pr-3.5 text-sm font-medium text-slate-900 ${FORM_FOCUS} disabled:cursor-not-allowed disabled:opacity-60`;

/** Full-width fields with ghost border (textareas, optional description) */
export const FORM_CONTROL_GHOST =
    `w-full rounded-xl border-2 border-transparent bg-slate-50 px-3.5 py-[11px] text-sm font-medium text-slate-900 ${FORM_FOCUS} disabled:cursor-not-allowed disabled:opacity-60`;

/** Search on white surfaces (records, patient list) */
export const FORM_CONTROL_SEARCH_ON_WHITE =
    'w-full rounded-xl border border-slate-200 bg-white py-[11px] pl-10 pr-3.5 text-sm font-medium text-slate-900 shadow-sm outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10';

/** Password fields with trailing control (e.g. visibility toggle at right-3) */
export const FORM_CONTROL_TRAILING_SLOT =
    `w-full rounded-xl border-2 border-slate-200 bg-slate-50 py-[11px] pl-3.5 pr-11 text-sm font-medium text-slate-900 ${FORM_FOCUS} disabled:cursor-not-allowed disabled:opacity-70`;

/** Chat message composer — muted bg until focus; pair send button with pr-14 */
export const FORM_CONTROL_CHAT_COMPOSER =
    'w-full rounded-xl border-2 border-transparent bg-slate-100 py-[11px] pl-4 pr-14 text-sm font-medium text-slate-900 outline-none transition-all focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10';

/** Dense inline fields (e.g. prescription medicine name row) */
export const FORM_CONTROL_COMPACT_ROW =
    'flex-1 min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 py-[9px] text-sm font-medium text-slate-900 outline-none transition-all focus:border-brand-500';

/** Dense grid cells (dosage / frequency / duration) */
export const FORM_CONTROL_COMPACT_CELL =
    'rounded-lg border border-slate-200 bg-white px-2 py-[9px] text-xs outline-none transition-all focus:border-brand-500';

/**
 * Auth screens — primary submit / Link-as-button. Matches FORM_CONTROL_* height (border-2 + py-[11px] + text-sm).
 * Add `flex` or `inline-flex`, optional `group`.
 */
export const FORM_AUTH_PRIMARY_BUTTON =
    'w-full rounded-xl border-2 border-transparent bg-brand-500 py-[11px] text-sm font-bold text-white shadow-md shadow-brand-500/20 hover:bg-brand-600 hover:shadow-brand-500/30 transition-all active:scale-[0.98] items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 focus-visible:ring-offset-2';

/**
 * Turn off browser autocomplete, spell-check underlines/suggestions, and mobile autocorrect/caps.
 * Spread onto `<input>` (non-file) and `<textarea>`; pair with `<form autoComplete="off">` when applicable.
 */
export const NO_BROWSER_INPUT_HELPERS = {
    autoComplete: 'off',
    spellCheck: false,
    autoCapitalize: 'off' as const,
    autoCorrect: 'off' as const,
} as const;