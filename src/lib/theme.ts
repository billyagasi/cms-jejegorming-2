export type BrandThemeId = 'teal' | 'navy' | 'forest' | 'wine' | 'slate' | 'indigo';

export interface BrandTheme {
  id: BrandThemeId;
  name: string;
  description: string;
  colors: Record<string, string>;
}

const scale = (s: [number, string][]) => Object.fromEntries(s.map(([k, v]) => [`--brand-${k}`, v]));

export const BRAND_THEMES: BrandTheme[] = [
  {
    id: 'teal',
    name: 'Deep Teal',
    description: 'Profesional & bersih — default',
    colors: scale([
      [50, '#f0fdfa'], [100, '#ccfbf1'], [200, '#99f6e4'], [300, '#5eead4'], [400, '#2dd4bf'],
      [500, '#14b8a6'], [600, '#0d9488'], [700, '#0f766e'], [800, '#115e59'], [900, '#134e4a'], [950, '#042f2e'],
    ]),
  },
  {
    id: 'navy',
    name: 'Corporate Navy',
    description: 'Formal & korporat',
    colors: scale([
      [50, '#f0f5fa'], [100, '#dbe7f3'], [200, '#bcd0e6'], [300, '#8fb2d4'], [400, '#5c8cbe'],
      [500, '#3a6da8'], [600, '#2b568c'], [700, '#244673'], [800, '#1e395c'], [900, '#1a2f4a'], [950, '#101f32'],
    ]),
  },
  {
    id: 'forest',
    name: 'Forest Green',
    description: 'Natural & hangat',
    colors: scale([
      [50, '#f2f7f2'], [100, '#e0ecdf'], [200, '#c3d9c2'], [300, '#9bbf9b'], [400, '#6da06e'],
      [500, '#4c8550'], [600, '#3a6b40'], [700, '#2f5635'], [800, '#28472d'], [900, '#1f3a25'], [950, '#0e2016'],
    ]),
  },
  {
    id: 'wine',
    name: 'Burgundy Wine',
    description: 'Elegan & premium',
    colors: scale([
      [50, '#faf2f4'], [100, '#f5e1e6'], [200, '#eac3cd'], [300, '#db99aa'], [400, '#c66a83'],
      [500, '#ad4866'], [600, '#943654'], [700, '#7d2c47'], [800, '#65253b'], [900, '#4e1d2f'], [950, '#33121e'],
    ]),
  },
  {
    id: 'slate',
    name: 'Graphite Slate',
    description: 'Netral & minimalis',
    colors: scale([
      [50, '#f8fafc'], [100, '#f1f5f9'], [200, '#e2e8f0'], [300, '#cbd5e1'], [400, '#94a3b8'],
      [500, '#64748b'], [600, '#475569'], [700, '#334155'], [800, '#1e293b'], [900, '#0f172a'], [950, '#020617'],
    ]),
  },
  {
    id: 'indigo',
    name: 'Classic Indigo',
    description: 'Biru-ungu klasik',
    colors: scale([
      [50, '#eef2ff'], [100, '#e0e7ff'], [200, '#c7d2fe'], [300, '#a5b4fc'], [400, '#818cf8'],
      [500, '#6366f1'], [600, '#4f46e5'], [700, '#4338ca'], [800, '#3730a3'], [900, '#312e81'], [950, '#1e1b4b'],
    ]),
  },
];

export const DEFAULT_THEME: BrandThemeId = 'teal';

export function getBrandTheme(id: string): BrandTheme {
  return BRAND_THEMES.find((t) => t.id === id) || BRAND_THEMES[0];
}

export function applyBrandTheme(id: string): void {
  const theme = getBrandTheme(id);
  Object.entries(theme.colors).forEach(([key, val]) => {
    document.documentElement.style.setProperty(key, val);
  });
}
