export const COLORS = {
  // Primary palette - earthy, archival feel
  primary: '#2D4739',      // Deep forest green
  primaryLight: '#4A7C59', // Lighter green
  primaryDark: '#1A2E23',  // Darker green
  
  // Accent colors
  accent: '#D4A574',       // Warm terracotta
  accentLight: '#E8C9A0',  // Light sand
  accentDark: '#B8865C',   // Burnt sienna
  
  // Background colors
  background: '#FAF7F2',   // Warm off-white (parchment)
  backgroundDark: '#1C1C1E',
  card: '#FFFFFF',
  cardDark: '#2C2C2E',
  
  // Text colors
  text: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textLight: '#FFFFFF',
  textMuted: '#9B9B9B',
  
  // Semantic colors
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  info: '#007AFF',
  
  // Map overlay
  mapOverlay: 'rgba(45, 71, 57, 0.85)',
  
  // Gradients
  gradientStart: '#2D4739',
  gradientEnd: '#4A7C59',
};

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  // Will use system fonts, but could be extended with custom fonts
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const MAP_STYLE = [
  {
    featureType: 'all',
    elementType: 'geometry',
    stylers: [{ color: '#FAF7F2' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#B8D4E3' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#E8E4DE' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#C8D9C0' }],
  },
];

