export const Colors = {
  // Brand Colors
  primary: '#9333ea',
  primaryLight: '#a855f7',
  primaryDark: '#7c3aed',
  secondary: '#8b5cf6',
  accent: '#60a5fa',
  
  // Purple Gradient Variants
  purple400: '#a855f7',
  purple500: '#9333ea',
  purple600: '#7c3aed',
  purple700: '#6d28d9',
  violet400: '#a78bfa',
  violet500: '#8b5cf6',
  violet600: '#7c3aed',
  
  // Supporting Colors
  blue100: '#dbeafe',
  blue400: '#60a5fa',
  blue500: '#3b82f6',
  blue800: '#1e40af',
  green100: '#dcfce7',
  green800: '#166534',
  indigo500: '#6366f1',
  fuchsia400: '#e879f9',
  red500: '#ef4444',
  red600: '#dc2626',
  
  // Gray Scale
  white: '#ffffff',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray600: '#4b5563',
  gray900: '#111827',
  
  // System Colors
  background: '#ffffff',
  backgroundSecondary: '#f8fafc',
  backgroundTertiary: '#f1f5f9',
  
  // Dark Mode
  backgroundDark: '#0f172a',
  backgroundSecondaryDark: '#1e293b',
  backgroundTertiaryDark: '#334155',
  
  // Text Colors
  text: '#1e293b',
  textSecondary: '#64748b',
  textTertiary: '#94a3b8',
  textLight: '#ffffff',
  
  // Glassmorphism
  glassBackground: 'rgba(255, 255, 255, 0.1)',
  glassBorder: 'rgba(255, 255, 255, 0.2)',
  glassBackgroundDark: 'rgba(15, 23, 42, 0.1)',
  glassBorderDark: 'rgba(148, 163, 184, 0.1)',
  
  // Status Colors
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  
  // Border Colors
  border: '#e2e8f0',
  borderSecondary: '#cbd5e1',
  borderDark: '#475569',
};

export const Gradients = {
  primary: ['#9333ea', '#a855f7'] as const,
  secondary: ['#8b5cf6', '#a78bfa'] as const,
  accent: ['#6366f1', '#8b5cf6'] as const,
  purple: ['#7c3aed', '#a855f7'] as const,
  blue: ['#3b82f6', '#8b5cf6'] as const,
  success: ['#059669', '#10b981'] as const,
  warning: ['#d97706', '#f59e0b'] as const,
  error: ['#dc2626', '#ef4444'] as const,
  lightCard: ['rgba(255, 255, 255, 0.95)', 'rgba(248, 250, 252, 0.95)'] as const,
  darkCard: ['rgba(15, 23, 42, 0.95)', 'rgba(30, 41, 59, 0.95)'] as const,
};