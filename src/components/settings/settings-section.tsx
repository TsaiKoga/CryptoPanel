import type { ComponentType, CSSProperties, ReactNode } from 'react';
import { Label } from '@/components/ui/label';

const PANEL_HEADER_PADDING = '2rem 2rem 1.5rem 2rem';
const PANEL_BODY_PADDING = '2rem';
const SECTION_PADDING = '1.5rem';
const SECTION_GAP = '1.75rem';

const sectionStyle: CSSProperties = {
  padding: SECTION_PADDING,
  backgroundColor: 'color-mix(in oklch, var(--muted) 30%, var(--card))',
  color: 'var(--foreground)',
  borderColor: 'color-mix(in oklch, var(--border) 50%, transparent)',
};

export function SettingsSection({
  children,
  className = '',
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      data-settings-section
      className={`rounded-xl border flex flex-col gap-5 ${className}`}
      style={{ ...sectionStyle, ...style }}
    >
      {children}
    </div>
  );
}

export function FieldLabel({
  icon: Icon,
  label,
  description,
}: {
  icon?: ComponentType<{ className?: string }>;
  label: string;
  description?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-primary shrink-0" />}
        <Label
          className="text-base font-semibold leading-snug"
          style={{ color: 'var(--foreground)' }}
        >
          {label}
        </Label>
      </div>
      {description && (
        <p
          className="text-sm leading-relaxed"
          style={{ color: 'var(--muted-foreground)' }}
        >
          {description}
        </p>
      )}
    </div>
  );
}

export function SettingsPanel({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <div
      data-settings-panel
      className="rounded-xl border-2 shadow-xl overflow-hidden"
      style={{
        backgroundColor: 'var(--card)',
        color: 'var(--card-foreground)',
        borderColor: 'color-mix(in oklch, var(--border) 50%, transparent)',
      }}
    >
      <div
        data-settings-panel-header
        className="border-b"
        style={{
          padding: PANEL_HEADER_PADDING,
          borderColor: 'color-mix(in oklch, var(--border) 40%, transparent)',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 space-y-1">
            <h2
              className="text-2xl font-bold leading-tight"
              style={{ color: 'var(--foreground)' }}
            >
              {title}
            </h2>
            <p
              className="text-sm leading-relaxed"
              style={{ color: 'var(--muted-foreground)' }}
            >
              {subtitle}
            </p>
          </div>
        </div>
      </div>
      <div
        data-settings-panel-body
        style={{
          padding: PANEL_BODY_PADDING,
          display: 'flex',
          flexDirection: 'column',
          gap: SECTION_GAP,
        }}
      >
        {children}
      </div>
    </div>
  );
}
