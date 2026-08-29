import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import {
  ColorThemeDefinition,
  GRADIENT_THEMES,
  MONO_THEMES,
} from '../../themes/colorThemes';
import { cn } from '../../utils/cn';

interface ColorThemePickerProps {
  collapsed?: boolean;
}

function ThemeSwatchButton({
  theme,
  selected,
  disabled,
  onSelect,
}: {
  theme: ColorThemeDefinition;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  const isGradient = theme.swatch.length > 1;
  const background = isGradient
    ? `linear-gradient(135deg, ${theme.swatch.join(', ')})`
    : theme.swatch[0];

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      title={`${theme.label} — ${theme.description}`}
      aria-label={`${theme.label} color theme`}
      aria-pressed={selected}
      tabIndex={disabled ? -1 : 0}
      className={cn(
        'relative w-7 h-7 rounded-full border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/40 focus-visible:ring-offset-1 focus-visible:ring-offset-surface',
        selected
          ? 'border-ink scale-110 shadow-card'
          : 'border-transparent hover:border-border-strong hover:scale-105'
      )}
      style={{ background }}
    >
      {selected && (
        <span className="absolute inset-0 rounded-full ring-2 ring-accent-blue/50 ring-offset-1 ring-offset-surface pointer-events-none" />
      )}
      <span className="sr-only">{theme.label}</span>
    </button>
  );
}

export const ColorThemePicker: React.FC<ColorThemePickerProps> = ({ collapsed = false }) => {
  const { colorTheme, setColorTheme } = useTheme();

  return (
    <div
      className={cn('space-y-3', collapsed && 'pointer-events-none')}
      aria-hidden={collapsed}
    >
      <div>
        <p className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider mb-2">
          Mono
        </p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Mono color themes">
          {MONO_THEMES.map((theme) => (
            <ThemeSwatchButton
              key={theme.id}
              theme={theme}
              selected={colorTheme === theme.id}
              disabled={collapsed}
              onSelect={() => setColorTheme(theme.id)}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider mb-2">
          Gradient
        </p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Gradient color themes">
          {GRADIENT_THEMES.map((theme) => (
            <ThemeSwatchButton
              key={theme.id}
              theme={theme}
              selected={colorTheme === theme.id}
              disabled={collapsed}
              onSelect={() => setColorTheme(theme.id)}
            />
          ))}
        </div>
      </div>

      <p className="text-[10px] text-ink-subtle leading-snug">
        {MONO_THEMES.concat(GRADIENT_THEMES).find((t) => t.id === colorTheme)?.label ?? 'Icy'}{' '}
        theme
      </p>
    </div>
  );
};
