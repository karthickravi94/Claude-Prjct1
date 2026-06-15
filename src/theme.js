// Design tokens — exact match to Figma "Expense tracker app" theme.css
// Fonts: DM Sans (body) + JetBrains Mono (labels, numbers, mono text)

export const colors = {
  // Primary — teal
  violet:        '#00c9a7',
  violetLight:   '#33d4b7',
  violetFade:    '#66dfca',
  violetTint:    'rgba(0,201,167,0.15)',
  violetTint2:   'rgba(0,201,167,0.10)',
  violetGlow:    '#007a65',

  // Dark surfaces (from Figma theme.css :root)
  bg:            '#08090d',   // --background
  surface:       '#0f1117',   // --card
  surface2:      '#161920',   // --popover / --input-background

  // Text
  textPrimary:   '#e8eaf0',   // --foreground / --card-foreground
  textSecondary: '#a0a4b8',   // --secondary-foreground
  textMuted:     '#6b6f85',   // --muted-foreground
  textDisabled:  '#3d4155',

  // Borders
  border:        'rgba(255,255,255,0.07)',  // --border
  borderStrong:  'rgba(0,201,167,0.25)',

  // Accent (amber — from Figma --accent)
  accent:        '#f59e0b',
  accentLight:   'rgba(245,158,11,0.14)',

  // Status
  success:       '#10B981',
  successLight:  'rgba(16,185,129,0.15)',
  successBorder: 'rgba(16,185,129,0.30)',
  error:         '#EF4444',
  errorLight:    'rgba(239,68,68,0.15)',
  errorBorder:   'rgba(239,68,68,0.30)',
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  hero: {
    shadowColor: '#00c9a7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
};

export const radius = {
  sm:    8,
  md:   12,
  lg:   16,
  xl:   20,
  '2xl': 24,
  full: 9999,
};

export const spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, '2xl': 24, '3xl': 32,
};

// DM Sans — body / UI prose text (weights 400, 500, 700)
// JetBrains Mono — numbers, labels, amounts, uppercase eyebrows, button text
export const typography = {
  display:       { fontSize: 42, fontFamily: 'JetBrainsMono_600SemiBold', letterSpacing: -1.5 },
  h1:            { fontSize: 32, fontFamily: 'DMSans_700Bold',             letterSpacing: -1 },
  h2:            { fontSize: 26, fontFamily: 'DMSans_700Bold',             letterSpacing: -0.5 },
  h3:            { fontSize: 20, fontFamily: 'DMSans_700Bold' },
  h4:            { fontSize: 17, fontFamily: 'DMSans_500Medium' },
  subtitle:      { fontSize: 15, fontFamily: 'JetBrainsMono_600SemiBold' },
  body:          { fontSize: 15, fontFamily: 'DMSans_400Regular' },
  bodyMedium:    { fontSize: 15, fontFamily: 'DMSans_500Medium' },
  caption:       { fontSize: 13, fontFamily: 'DMSans_400Regular' },
  captionMedium: { fontSize: 13, fontFamily: 'DMSans_500Medium' },
  captionBold:   { fontSize: 13, fontFamily: 'JetBrainsMono_600SemiBold' },
  label:         { fontSize: 11, fontFamily: 'JetBrainsMono_600SemiBold', letterSpacing: 1.2 },
};
