export type ColorThemeKind = 'mono' | 'gradient';

export type ColorThemeId =
  | 'icy'
  | 'slate'
  | 'emerald'
  | 'violet'
  | 'rose'
  | 'aurora'
  | 'sunset'
  | 'ocean'
  | 'forest'
  | 'midnight';

export interface ColorThemeDefinition {
  id: ColorThemeId;
  label: string;
  kind: ColorThemeKind;
  /** Swatch colors for the picker preview (1 = mono, 2–3 = gradient) */
  swatch: string[];
  description: string;
}

export const COLOR_THEMES: ColorThemeDefinition[] = [
  // Mono
  {
    id: 'icy',
    label: 'Icy',
    kind: 'mono',
    swatch: ['#007AFF'],
    description: 'Cool blue glass',
  },
  {
    id: 'slate',
    label: 'Slate',
    kind: 'mono',
    swatch: ['#64748B'],
    description: 'Neutral graphite',
  },
  {
    id: 'emerald',
    label: 'Emerald',
    kind: 'mono',
    swatch: ['#059669'],
    description: 'Fresh green',
  },
  {
    id: 'violet',
    label: 'Violet',
    kind: 'mono',
    swatch: ['#7C3AED'],
    description: 'Soft purple',
  },
  {
    id: 'rose',
    label: 'Rose',
    kind: 'mono',
    swatch: ['#E11D48'],
    description: 'Warm rose',
  },
  // Gradient
  {
    id: 'aurora',
    label: 'Aurora',
    kind: 'gradient',
    swatch: ['#38BDF8', '#818CF8', '#F472B6'],
    description: 'Sky to magenta',
  },
  {
    id: 'sunset',
    label: 'Sunset',
    kind: 'gradient',
    swatch: ['#FB923C', '#F43F5E', '#FBBF24'],
    description: 'Orange to rose',
  },
  {
    id: 'ocean',
    label: 'Ocean',
    kind: 'gradient',
    swatch: ['#22D3EE', '#3B82F6', '#14B8A6'],
    description: 'Cyan to teal',
  },
  {
    id: 'forest',
    label: 'Forest',
    kind: 'gradient',
    swatch: ['#4ADE80', '#84CC16', '#059669'],
    description: 'Lime to green',
  },
  {
    id: 'midnight',
    label: 'Midnight',
    kind: 'gradient',
    swatch: ['#6366F1', '#8B5CF6', '#3B82F6'],
    description: 'Indigo bloom',
  },
];

export const DEFAULT_COLOR_THEME: ColorThemeId = 'icy';

export const COLOR_THEME_IDS = COLOR_THEMES.map((t) => t.id);

export function isColorThemeId(value: string | null | undefined): value is ColorThemeId {
  return !!value && (COLOR_THEME_IDS as string[]).includes(value);
}

export function getColorTheme(id: ColorThemeId): ColorThemeDefinition {
  return COLOR_THEMES.find((t) => t.id === id) ?? COLOR_THEMES[0];
}

export const MONO_THEMES = COLOR_THEMES.filter((t) => t.kind === 'mono');
export const GRADIENT_THEMES = COLOR_THEMES.filter((t) => t.kind === 'gradient');
