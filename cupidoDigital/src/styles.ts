import { CSSProperties } from 'react'

type StyleObject = {
  [key: string]: CSSProperties
}

// =============================================================================
// LIQUID GLASS DESIGN TOKENS
// =============================================================================

const colors = {
  // Base atmosphere - deep oceanic blues and teals
  deepBase: '#0a1628',
  deepSecondary: '#0d1f35',
  accentCyan: '#22d3ee',
  accentTeal: '#14b8a6',
  accentSky: '#38bdf8',
  
  // Glass layers - white with varying opacity
  glassLight: 'rgba(255, 255, 255, 0.08)',
  glassMedium: 'rgba(255, 255, 255, 0.12)',
  glassStrong: 'rgba(255, 255, 255, 0.18)',
  glassBorder: 'rgba(255, 255, 255, 0.15)',
  glassBorderHover: 'rgba(255, 255, 255, 0.25)',
  
  // Text colors
  textPrimary: '#f8fafc',
  textSecondary: 'rgba(248, 250, 252, 0.75)',
  textMuted: 'rgba(248, 250, 252, 0.55)',
  
  // Interactive states
  primaryGradient: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 50%, #14b8a6 100%)',
  primaryHover: 'linear-gradient(135deg, #0284c7 0%, #0891b2 50%, #0d9488 100%)',
  glowCyan: 'rgba(34, 211, 238, 0.4)',
  glowTeal: 'rgba(20, 184, 166, 0.3)',
  
  // Semantic
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
}

// =============================================================================
// ANIMATION KEYFRAMES (injected via style tag)
// =============================================================================

export const injectGlassStyles = () => {
  if (typeof document === 'undefined') return
  if (document.getElementById('liquid-glass-styles')) return
  
  const style = document.createElement('style')
  style.id = 'liquid-glass-styles'
  style.textContent = `
    @keyframes glassFadeIn {
      from {
        opacity: 0;
        transform: translateY(20px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    
    @keyframes glassSlideUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes glassPulse {
      0%, 100% {
        box-shadow: 0 0 20px rgba(34, 211, 238, 0.2), 0 0 40px rgba(20, 184, 166, 0.1);
      }
      50% {
        box-shadow: 0 0 30px rgba(34, 211, 238, 0.35), 0 0 60px rgba(20, 184, 166, 0.2);
      }
    }
    
    @keyframes shimmer {
      0% {
        background-position: -200% 0;
      }
      100% {
        background-position: 200% 0;
      }
    }
    
    @keyframes float {
      0%, 100% {
        transform: translateY(0px);
      }
      50% {
        transform: translateY(-10px);
      }
    }
    
    @keyframes progressShine {
      0% {
        background-position: -100% 0;
      }
      100% {
        background-position: 200% 0;
      }
    }
    
    .glass-card {
      animation: glassFadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
    
    .glass-card-delay-1 {
      animation: glassFadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.1s forwards;
      opacity: 0;
    }
    
    .glass-card-delay-2 {
      animation: glassFadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.2s forwards;
      opacity: 0;
    }
    
    .glass-card-delay-3 {
      animation: glassFadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.3s forwards;
      opacity: 0;
    }
    
    .glass-hover {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .glass-hover:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25), 0 0 0 1px ${colors.glassBorderHover};
    }
    
    .glass-button {
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }
    
    .glass-button::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.2),
        transparent
      );
      transition: left 0.5s ease;
    }
    
    .glass-button:hover::before {
      left: 100%;
    }
    
    .glass-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(14, 165, 233, 0.4);
    }
    
    .glass-button:active {
      transform: translateY(0);
    }
    
    .glass-input:focus {
      outline: none;
      border-color: ${colors.accentCyan};
      box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.15);
    }
    
    .progress-fill-animated {
      background: linear-gradient(
        90deg,
        #0ea5e9 0%,
        #06b6d4 25%,
        #22d3ee 50%,
        #06b6d4 75%,
        #0ea5e9 100%
      );
      background-size: 200% 100%;
      animation: progressShine 2s linear infinite;
    }
  `
  document.head.appendChild(style)
}

// =============================================================================
// STYLE OBJECTS
// =============================================================================

export const styles: StyleObject = {
  // Layout
  container: {
    maxWidth: '800px',
    width: '100%',
    margin: '0 auto',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
    color: colors.textPrimary,
    boxSizing: 'border-box' as const,
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
  },
  
  // Main glass card - primary container
  glassCard: {
    background: colors.glassMedium,
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    borderRadius: '20px',
    padding: '2rem',
    marginBottom: '1.5rem',
    border: `1px solid ${colors.glassBorder}`,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  
  // Secondary glass card - for nested elements
  glassCardSubtle: {
    background: colors.glassLight,
    backdropFilter: 'blur(12px) saturate(150%)',
    WebkitBackdropFilter: 'blur(12px) saturate(150%)',
    borderRadius: '16px',
    padding: '1.25rem',
    marginBottom: '1rem',
    border: `1px solid ${colors.glassBorder}`,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  
  // Question text
  question: {
    fontSize: '1.5rem',
    fontWeight: 700,
    marginBottom: '1.5rem',
    lineHeight: 1.4,
    color: colors.textPrimary,
    textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
  },
  
  // Answer container
  answerContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  
  // Standard glass button (answer options)
  answerButton: {
    padding: '1rem 1.25rem',
    border: `1px solid ${colors.glassBorder}`,
    borderRadius: '12px',
    background: colors.glassLight,
    fontSize: '1rem',
    textAlign: 'left',
    cursor: 'pointer',
    width: '100%',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    color: colors.textPrimary,
    outline: 'none',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
  },
  
  // Selected answer state
  selectedAnswer: {
    borderColor: colors.accentCyan,
    background: `linear-gradient(135deg, ${colors.glassStrong} 0%, rgba(34, 211, 238, 0.15) 100%)`,
    color: colors.textPrimary,
    boxShadow: `0 0 20px ${colors.glowCyan}, inset 0 1px 0 rgba(255, 255, 255, 0.2)`,
  },
  
  // Input fields
  input: {
    width: '100%',
    padding: '1rem 1.25rem',
    fontSize: '1rem',
    border: `1px solid ${colors.glassBorder}`,
    borderRadius: '12px',
    marginBottom: '1rem',
    color: colors.textPrimary,
    background: 'rgba(0, 0, 0, 0.2)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    outline: 'none',
    boxSizing: 'border-box' as const,
    transition: 'all 0.25s ease',
    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.2)',
  },
  
  // Primary action button
  submitButton: {
    background: colors.primaryGradient,
    color: 'white',
    padding: '1rem 2rem',
    borderRadius: '12px',
    border: 'none',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 4px 15px rgba(14, 165, 233, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
    position: 'relative',
    overflow: 'hidden',
  },
  
  // Match card - for results
  matchCard: {
    background: colors.glassLight,
    backdropFilter: 'blur(12px) saturate(150%)',
    borderRadius: '16px',
    padding: '1.25rem',
    marginBottom: '1rem',
    border: `1px solid ${colors.glassBorder}`,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  
  // Navigation container
  navigationContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '2rem',
    gap: '1rem',
  },
  
  // Navigation button (secondary)
  navButton: {
    padding: '0.875rem 1.5rem',
    borderRadius: '12px',
    border: `1px solid ${colors.glassBorder}`,
    background: colors.glassLight,
    color: colors.textPrimary,
    fontSize: '1rem',
    fontWeight: 500,
    cursor: 'pointer',
    flex: 1,
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  
  // Progress bar container
  progressBar: {
    width: '100%',
    height: '6px',
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '3px',
    marginBottom: '2rem',
    overflow: 'hidden',
    boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.3)',
  },
  
  // Progress fill
  progressFill: {
    height: '100%',
    background: colors.primaryGradient,
    borderRadius: '3px',
    transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 0 10px rgba(34, 211, 238, 0.5)',
  },
  
  // Image container
  imageContainer: {
    width: '100%',
    minHeight: '200px',
    maxHeight: '400px',
    marginTop: '1rem',
    marginBottom: '2rem',
    borderRadius: '16px',
    background: 'rgba(0, 0, 0, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    border: `1px solid ${colors.glassBorder}`,
    boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.2)',
  },
}

// =============================================================================
// DYNAMIC STYLE HELPERS
// =============================================================================

export const getSelectedAnswerStyle = (isSelected: boolean): CSSProperties =>
  isSelected
    ? {
        ...styles.selectedAnswer,
        transform: 'translateY(-1px)',
      }
    : {}

export const getPrimaryButtonStyle = (disabled = false): CSSProperties => ({
  ...styles.submitButton,
  opacity: disabled ? 0.6 : 1,
  cursor: disabled ? 'not-allowed' : 'pointer',
  transform: disabled ? 'none' : undefined,
})

// =============================================================================
// GLOBAL BACKGROUND STYLES
// =============================================================================

export const globalBackgroundStyle: CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: `
    radial-gradient(ellipse at 20% 20%, rgba(14, 165, 233, 0.15) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 80%, rgba(20, 184, 166, 0.15) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 50%, rgba(56, 189, 248, 0.08) 0%, transparent 70%),
    linear-gradient(180deg, ${colors.deepBase} 0%, ${colors.deepSecondary} 100%)
  `,
  zIndex: -1,
}

export const floatingOrbStyle = (position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'): CSSProperties => {
  const positions = {
    'top-left': { top: '10%', left: '5%' },
    'top-right': { top: '15%', right: '10%' },
    'bottom-left': { bottom: '20%', left: '8%' },
    'bottom-right': { bottom: '15%', right: '5%' },
  }
  
  return {
    position: 'fixed',
    width: '300px',
    height: '300px',
    borderRadius: '50%',
    background: position.includes('left')
      ? 'radial-gradient(circle, rgba(14, 165, 233, 0.2) 0%, transparent 70%)'
      : 'radial-gradient(circle, rgba(20, 184, 166, 0.2) 0%, transparent 70%)',
    filter: 'blur(60px)',
    pointerEvents: 'none',
    zIndex: -1,
    animation: 'float 8s ease-in-out infinite',
    ...positions[position],
  }
}

// =============================================================================
// TYPOGRAPHY HELPERS
// =============================================================================

export const typography = {
  title: {
    fontSize: 'clamp(1.75rem, 5vw, 2.5rem)',
    fontWeight: 800,
    background: 'linear-gradient(135deg, #f8fafc 0%, #38bdf8 50%, #22d3ee 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    marginBottom: '0.5rem',
    textAlign: 'center' as const,
    textShadow: 'none',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: '1rem',
    color: colors.textSecondary,
    textAlign: 'center' as const,
    marginBottom: '2rem',
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: colors.textPrimary,
    marginBottom: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
}

// =============================================================================
// CHAT PANEL STYLES
// =============================================================================

// High contrast dark text colors (for use on light glass backgrounds)
const chatDarkText = '#0f172a'
const chatDarkMuted = '#475569'
const chatDarkSubtle = '#64748b'

export const chatStyles = {
  // Compact chat container with light background for high contrast
  chatContainer: {
    border: '1px solid rgba(0, 0, 0, 0.08)',
    borderRadius: '12px',
    background: 'rgba(255, 255, 255, 0.6)',
    padding: '0.75rem',
    height: '220px',
    overflowY: 'auto' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.05)',
  },
  
  // Message bubble colors (dark text on light backgrounds)
  messageBubbleBase: {
    borderRadius: '12px',
    padding: '0.625rem 0.875rem',
    marginBottom: '0.375rem',
    maxWidth: '85%',
  },
  
  // Mine: gradient, white text
  messageBubbleMine: {
    background: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)',
    color: 'white',
    boxShadow: '0 2px 8px rgba(14, 165, 233, 0.25)',
  },
  
  // Theirs: light background, dark text for high contrast
  messageBubbleTheirs: {
    background: 'rgba(255, 255, 255, 0.9)',
    color: chatDarkText,
    border: '1px solid rgba(0, 0, 0, 0.08)',
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.05)',
  },
  
  // Thread list button (light background, dark text)
  threadListButtonBase: {
    width: '100%',
    textAlign: 'left' as const,
    borderRadius: '10px',
    padding: '0.625rem 0.75rem',
    marginBottom: '0.375rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  
  threadListButtonSelected: {
    background: 'rgba(255, 255, 255, 0.85)',
    border: '1px solid #0891b2',
  },
  
  threadListButtonUnselected: {
    background: 'rgba(255, 255, 255, 0.5)',
    border: '1px solid rgba(0, 0, 0, 0.06)',
  },
  
  // Text colors for chat UI
  text: {
    primary: chatDarkText,
    muted: chatDarkMuted,
    subtle: chatDarkSubtle,
  },
}

// =============================================================================
// RESPONSIVE ADJUSTMENTS
// =============================================================================

export const responsiveStyles = {
  mobile: {
    glassCard: {
      padding: '1.25rem',
      borderRadius: '16px',
    },
    question: {
      fontSize: '1.25rem',
    },
    answerButton: {
      padding: '0.875rem 1rem',
    },
  },
}
