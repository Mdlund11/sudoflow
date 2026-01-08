export const COLORS = {
  background: '#F8F9FA',
  surface: '#FFFFFF',
  primary: '#0284C7', // Sky 600
  primaryLight: '#F0F9FF', // Sky 50
  text: '#1F2937', // Gray 800
  textSecondary: '#6B7280', // Gray 500
  border: '#E5E7EB', // Gray 200
  borderDark: '#374151', // Gray 700
  success: '#10B981', // Emerald 500
  error: '#EF4444', // Red 500
  warning: '#F59E0B', // Amber 500
  highlight: '#E0F2FE', // Sky 100
  highlightStrong: '#BAE6FD', // Sky 200
  selection: '#7DD3FC', // Sky 300
  hintTarget: '#F59E0B', // Amber 500
  hintContributing: '#FEF3C7', // Amber 50
};

export const SPACING = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
};

export const RADIUS = {
  s: 8,
  m: 12,
  l: 16,
  full: 9999,
};

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
};

export const Colors = {
  light: {
    text: COLORS.text,
    textSecondary: COLORS.textSecondary,
    background: COLORS.background,
    surface: COLORS.surface,
    primary: COLORS.primary,
    primaryLight: COLORS.primaryLight,
    border: COLORS.border,
    borderDark: COLORS.borderDark,
    highlight: COLORS.highlight,
    highlightStrong: COLORS.highlightStrong,
    selection: COLORS.selection,
    error: COLORS.error,
    tint: COLORS.primary,
    icon: COLORS.textSecondary,
    tabIconDefault: COLORS.textSecondary,
    tabIconSelected: COLORS.primary,
    hintTarget: '#F59E0B',
    hintContributing: '#FEF3C7',
  },
  dark: {
    text: '#F9FAFB', // Gray 50
    textSecondary: '#9CA3AF', // Gray 400
    background: '#111827', // Gray 900
    surface: '#1F2937', // Gray 800
    primary: '#38BDF8', // Sky 400 (brighter for dark mode)
    primaryLight: '#075985', // Sky 800
    border: '#374151', // Gray 700
    borderDark: '#4B5563', // Gray 600
    highlight: '#0C4A6E', // Sky 900
    highlightStrong: '#075985', // Sky 800
    selection: '#0369A1', // Sky 700
    error: '#F87171', // Red 400
    tint: '#38BDF8',
    icon: '#9CA3AF',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: '#38BDF8',
    hintTarget: '#FBBF24',
    hintContributing: '#451A03', // Amber 950
  },
};

export const ANIMATION_TIMINGS = {
  /** Duration of the expansion (flash in) phase of the cell animation (ms). */
  CELL_EXPAND_DURATION: 150,
  /** Duration of the contraction (fade out) phase of the cell animation (ms). */
  CELL_CONTRACT_DURATION: 150,
  /** Total duration of one cell's animation loop (ms). Used for cleanup if needed. */
  TOTAL_CELL_DURATION: 350,
};
