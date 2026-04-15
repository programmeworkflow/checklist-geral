// Centralized risk category color mapping
// Used across Settings, Checklist, and any risk-related UI

export const RISK_TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  chemical:   { bg: 'bg-red-600/85',      text: 'text-white', label: 'Químico' },
  physical:   { bg: 'bg-green-600/85',    text: 'text-white', label: 'Físico' },
  biological: { bg: 'bg-amber-700/85',    text: 'text-white', label: 'Biológico' },
  ergonomic:  { bg: 'bg-yellow-500/85',   text: 'text-white', label: 'Ergonômico' },
  accident:   { bg: 'bg-blue-600/85',     text: 'text-white', label: 'Acidente' },
  other:      { bg: 'bg-gray-500/85',     text: 'text-white', label: 'Outros' },
};

export function getRiskColor(type: string) {
  return RISK_TYPE_COLORS[type] || { bg: 'bg-muted', text: 'text-foreground', label: type };
}

export function RiskBadge({ type, label }: { type?: string; label?: string }) {
  const colors = type ? getRiskColor(type) : { bg: 'bg-muted', text: 'text-foreground', label: label || '' };
  const displayLabel = label || colors.label;
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors.bg} ${colors.text}`}>
      {displayLabel}
    </span>
  );
}
