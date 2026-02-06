import React, { CSSProperties } from 'react'
import { styles, typography } from '../styles'
import { QuizResponse, Gender, LookingFor } from '../types'
import { ChatPanel } from './chat/ChatPanel'
import { GroupSummary } from '../services/groupChat'

interface ResultsProps {
  userName: string
  topMatches: QuizResponse[]
  onRefreshMatches: () => void
  userGender: Gender
  lookingFor: LookingFor
  phone: string
  onUpdatePhone: (newPhone: string) => void
  isRefreshing?: boolean
  myGroup?: GroupSummary | null
}

// High contrast dark text on light glass background
const DARK_TEXT = '#0f172a'
const DARK_TEXT_MUTED = '#475569'
const DARK_TEXT_SUBTLE = '#64748b'
const ACCENT_CYAN = '#0891b2'

// Fallback descriptions by group_key for stylish copy
const GROUP_DESCRIPTIONS: Record<string, string> = {
  romantic: 'Conexao emocional first. Gostas de profundidade, carinho e momentos que realmente ficam na memoria.',
  adventurous: 'Energia alta e vontade de viver experiencias. Procuras pessoas que topam sair da rotina contigo.',
  intellectual: 'Mentes curiosas e conversas com conteudo. Aqui, a quimica comeca no pensamento.',
  creative: 'Expressao, originalidade e visao propria. A tua tribo transforma ideias em algo unico.',
  chill: 'Calma, vibe boa e autenticidade. Preferes ligacoes leves, honestas e sem drama.',
  social: 'Carisma, presenca e boa energia em grupo. A tua tribo brilha quando ha pessoas por perto.',
  ambitious: 'Foco, iniciativa e vontade de crescer. Procuras gente com drive e planos grandes.',
  dreamers: 'Vivem no mundo das ideias, dos sonhos e das possibilidades infinitas. Aqui, a imaginacao nao tem limites.',
  rebels: 'Desafiam o status quo e fazem as suas proprias regras. Independentes, ousados e autenticos.',
  lovers: 'Movem-se pela conexao, pela emocao e pela busca de relacionamentos genuinos. O coracao fala mais alto.',
  creators: 'Transformam visoes em realidade. Artistas, makers e visionarios que constroem o futuro.',
  explorers: 'Sempre em busca da proxima aventura. Curiosos, destemidos e prontos para descobrir o desconhecido.',
  thinkers: 'Analisam, questionam e compreendem. A mente afiada e a ferramenta mais poderosa.',
  guardians: 'Protegem o que e importante. Leais, confiaveis e sempre la quando mais se precisa.',
  jesters: 'Trazem luz e riso ao mundo. A vida e melhor quando vivida com humor e leveza.',
}

// Tribe images as inline SVG data-URIs
const TRIBE_IMAGES: Record<string, string> = {
  // Heart with sparkles for romantic connections
  romantic: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#f472b6"/><stop offset="100%" stop-color="#ec4899"/></linearGradient></defs><rect width="120" height="120" fill="url(#g)" rx="20"/><path d="M60 95s-30-18-30-40c0-11 9-20 20-20 6 0 10 3 10 8 0-5 4-8 10-8 11 0 20 9 20 20 0 22-30 40-30 40z" fill="#fff" opacity="0.9"/><circle cx="30" cy="35" r="4" fill="#fff" opacity="0.7"/><circle cx="90" cy="25" r="3" fill="#fff" opacity="0.6"/><circle cx="95" cy="55" r="2" fill="#fff" opacity="0.5"/></svg>`)}`,
  
  // Mountain/adventure for adventurous spirits
  adventurous: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#ea580c"/></linearGradient></defs><rect width="120" height="120" fill="url(#g)" rx="20"/><path d="M20 90l30-50 15 25 15-25 20 35v15H20z" fill="#fff" opacity="0.9"/><circle cx="85" cy="30" r="8" fill="#fff" opacity="0.8"/></svg>`)}`,
  
  // Brain/atom for intellectual minds
  intellectual: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#8b5cf6"/><stop offset="100%" stop-color="#7c3aed"/></linearGradient></defs><rect width="120" height="120" fill="url(#g)" rx="20"/><circle cx="60" cy="60" r="25" fill="none" stroke="#fff" stroke-width="3" opacity="0.9"/><ellipse cx="60" cy="60" rx="25" ry="10" fill="none" stroke="#fff" stroke-width="2" opacity="0.7" transform="rotate(60 60 60)"/><ellipse cx="60" cy="60" rx="25" ry="10" fill="none" stroke="#fff" stroke-width="2" opacity="0.7" transform="rotate(-60 60 60)"/><circle cx="60" cy="60" r="5" fill="#fff"/></svg>`)}`,
  
  // Paint palette for creative souls
  creative: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ec4899"/><stop offset="50%" stop-color="#8b5cf6"/><stop offset="100%" stop-color="#06b6d4"/></linearGradient></defs><rect width="120" height="120" fill="url(#g)" rx="20"/><ellipse cx="60" cy="65" rx="30" ry="22" fill="#fff" opacity="0.9"/><circle cx="45" cy="55" r="6" fill="#ec4899"/><circle cx="60" cy="50" r="6" fill="#8b5cf6"/><circle cx="75" cy="55" r="6" fill="#06b6d4"/><circle cx="52" cy="70" r="6" fill="#f59e0b"/><circle cx="68" cy="70" r="6" fill="#10b981"/></svg>`)}`,
  
  // Waves for chill vibes
  chill: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#06b6d4"/><stop offset="100%" stop-color="#0ea5e9"/></linearGradient></defs><rect width="120" height="120" fill="url(#g)" rx="20"/><path d="M10 70c10-5 20-5 30 0s20 5 30 0 20-5 30 0 20 5 20 5v30H10v-35z" fill="#fff" opacity="0.9"/><circle cx="85" cy="35" r="12" fill="#fff" opacity="0.8"/></svg>`)}`,
  
  // People/network for social butterflies
  social: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#f97316"/><stop offset="100%" stop-color="#ef4444"/></linearGradient></defs><rect width="120" height="120" fill="url(#g)" rx="20"/><circle cx="60" cy="40" r="12" fill="#fff" opacity="0.9"/><circle cx="35" cy="70" r="10" fill="#fff" opacity="0.9"/><circle cx="85" cy="70" r="10" fill="#fff" opacity="0.9"/><path d="M60 52v10M48 62L38 68M72 62l10 6" stroke="#fff" stroke-width="2" opacity="0.7" fill="none"/></svg>`)}`,
  
  // Rocket/target for ambitious achievers
  ambitious: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#eab308"/><stop offset="100%" stop-color="#f97316"/></linearGradient></defs><rect width="120" height="120" fill="url(#g)" rx="20"/><path d="M60 25l5 30h15l-25 40-5-30H35l25-40z" fill="#fff" opacity="0.95"/><circle cx="85" cy="35" r="4" fill="#fff" opacity="0.6"/><circle cx="95" cy="45" r="2" fill="#fff" opacity="0.4"/></svg>`)}`,
  
  // Cloud/moon for dreamers
  dreamers: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#a855f7"/><stop offset="100%" stop-color="#6366f1"/></linearGradient></defs><rect width="120" height="120" fill="url(#g)" rx="20"/><path d="M75 30c-8 0-15 5-17 12-2-1-4-2-6-2-8 0-14 6-14 14 0 8 6 14 14 14h38c7 0 13-6 13-13s-6-13-13-13c-1-7-7-12-15-12z" fill="#fff" opacity="0.9"/><circle cx="35" cy="35" r="2" fill="#fff" opacity="0.5"/><circle cx="95" cy="70" r="2" fill="#fff" opacity="0.5"/><circle cx="25" cy="55" r="1.5" fill="#fff" opacity="0.4"/></svg>`)}`,
  
  // Lightning/bolt for rebels
  rebels: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ef4444"/><stop offset="100%" stop-color="#dc2626"/></linearGradient></defs><rect width="120" height="120" fill="url(#g)" rx="20"/><path d="M70 25L45 60h15l-5 35 30-40H65l10-30z" fill="#fff" opacity="0.95" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>`)}`,
  
  // Two hearts intertwined for lovers
  lovers: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fb7185"/><stop offset="100%" stop-color="#e11d48"/></linearGradient></defs><rect width="120" height="120" fill="url(#g)" rx="20"/><path d="M40 55c-5-5-5-13 0-18s13-5 18 0l2 2 2-2c5-5 13-5 18 0s5 13 0 18l-20 20-20-20z" fill="#fff" opacity="0.95"/><circle cx="30" cy="30" r="3" fill="#fff" opacity="0.5"/><circle cx="90" cy="35" r="2" fill="#fff" opacity="0.4"/></svg>`)}`,
  
  // Tools/hammer-wrench for creators
  creators: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#14b8a6"/><stop offset="100%" stop-color="#0d9488"/></linearGradient></defs><rect width="120" height="120" fill="url(#g)" rx="20"/><path d="M45 35l-5 10 15 15-8 8-15-15-10 5 5 15 20 5 25 25 10-10-25-25 5-20-15-5z" fill="#fff" opacity="0.95"/><circle cx="85" cy="40" r="3" fill="#fff" opacity="0.6"/></svg>`)}`,
  
  // Compass/map for explorers
  explorers: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#22c55e"/><stop offset="100%" stop-color="#16a34a"/></linearGradient></defs><rect width="120" height="120" fill="url(#g)" rx="20"/><circle cx="60" cy="60" r="30" fill="none" stroke="#fff" stroke-width="4" opacity="0.9"/><path d="M60 35v50M35 60h50" stroke="#fff" stroke-width="2" opacity="0.4"/><path d="M60 45l8 15-8 15-8-15z" fill="#fff" opacity="0.95"/></svg>`)}`,
  
  // Lightbulb for thinkers
  thinkers: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#6366f1"/><stop offset="100%" stop-color="#4f46e5"/></linearGradient></defs><rect width="120" height="120" fill="url(#g)" rx="20"/><path d="M60 25c-13 0-24 11-24 24 0 9 5 17 12 21v8h24v-8c7-4 12-12 12-21 0-13-11-24-24-24z" fill="#fff" opacity="0.95"/><rect x="52" y="78" width="16" height="8" rx="2" fill="#fff" opacity="0.8"/><line x1="35" y1="35" x2="25" y2="25" stroke="#fff" stroke-width="2" opacity="0.6"/><line x1="85" y1="35" x2="95" y2="25" stroke="#fff" stroke-width="2" opacity="0.6"/></svg>`)}`,
  
  // Shield for guardians
  guardians: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#3b82f6"/><stop offset="100%" stop-color="#2563eb"/></linearGradient></defs><rect width="120" height="120" fill="url(#g)" rx="20"/><path d="M60 25l25 10v20c0 18-10 30-25 40-15-10-25-22-25-40V35l25-10z" fill="#fff" opacity="0.95"/><path d="M52 55l6 6 12-12" fill="none" stroke="#3b82f6" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`)}`,
  
  // Smiley/joy for jesters
  jesters: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fbbf24"/><stop offset="100%" stop-color="#f59e0b"/></linearGradient></defs><rect width="120" height="120" fill="url(#g)" rx="20"/><circle cx="60" cy="60" r="28" fill="#fff" opacity="0.95"/><circle cx="50" cy="55" r="4" fill="#f59e0b"/><circle cx="70" cy="55" r="4" fill="#f59e0b"/><path d="M45 68q15 12 30 0" fill="none" stroke="#f59e0b" stroke-width="3" stroke-linecap="round"/><circle cx="30" cy="35" r="3" fill="#fff" opacity="0.6"/><circle cx="90" cy="30" r="2" fill="#fff" opacity="0.4"/></svg>`)}`,
}

// Default fallback image (abstract pattern)
const DEFAULT_TRIBE_IMAGE = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#64748b"/><stop offset="100%" stop-color="#475569"/></linearGradient></defs><rect width="120" height="120" fill="url(#g)" rx="20"/><circle cx="60" cy="60" r="20" fill="#fff" opacity="0.9"/><circle cx="30" cy="30" r="8" fill="#fff" opacity="0.5"/><circle cx="90" cy="90" r="8" fill="#fff" opacity="0.5"/></svg>`)}`

// Get tribe image by group key
const getTribeImage = (groupKey: string): string => {
  return TRIBE_IMAGES[groupKey] || DEFAULT_TRIBE_IMAGE
}

// Glass-optimized local styles
const localStyles: Record<string, CSSProperties> = {
  welcomeHeader: {
    ...styles.question,
    textAlign: 'center' as const,
    marginBottom: '1rem',
    color: DARK_TEXT,
    textShadow: 'none',
    fontSize: '1.5rem',
    fontWeight: 700,
  },
  // Compact top actions row
  topActionsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
    paddingBottom: '0.75rem',
    borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
  },
  refreshButtonSmall: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    padding: '0.375rem 0.75rem',
    fontSize: '0.85rem',
    fontWeight: 500,
    borderRadius: '8px',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    background: 'rgba(255, 255, 255, 0.7)',
    color: DARK_TEXT_MUTED,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  refreshSpinning: {
    animation: 'spin 1s linear infinite',
  },
  autoRefreshIndicator: {
    fontSize: '0.8rem',
    color: DARK_TEXT_SUBTLE,
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
  },
  matchesTitle: {
    ...typography.sectionTitle,
    marginBottom: '1rem',
    padding: '0',
    color: DARK_TEXT,
  },
  matchHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
  },
  matchName: {
    fontSize: '1.15rem',
    fontWeight: 700,
    color: DARK_TEXT,
  },
  compatibility: {
    color: ACCENT_CYAN,
    fontSize: '1rem',
    fontWeight: 700,
  },
  instagram: {
    color: DARK_TEXT_MUTED,
    fontSize: '0.9rem',
  },
  partyBanner: {
    marginTop: '1.5rem',
    fontWeight: 600,
    fontSize: '1rem',
    color: '#0a1628',
    background: 'linear-gradient(135deg, #22d3ee 0%, #0ea5e9 50%, #14b8a6 100%)',
    padding: '1rem',
    borderRadius: '12px',
    textAlign: 'center' as const,
    boxShadow: '0 4px 20px rgba(14, 165, 233, 0.25)',
    lineHeight: 1.5,
  },
  hintText: {
    marginTop: '1.5rem',
    color: DARK_TEXT_SUBTLE,
    textAlign: 'center' as const,
    fontSize: '0.9rem',
  },
  codeBlock: {
    background: 'rgba(0, 0, 0, 0.05)',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    display: 'block',
    wordBreak: 'break-all' as const,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    fontSize: '0.85rem',
    color: ACCENT_CYAN,
    border: '1px solid rgba(0, 0, 0, 0.08)',
  },
  noMatchesText: {
    color: DARK_TEXT_MUTED,
    lineHeight: 1.6,
  },
  sectionLabel: {
    marginBottom: '0.5rem',
    fontWeight: 600,
    color: DARK_TEXT,
    fontSize: '0.9rem',
  },
  // Compact inline Instagram edit
  instagramRow: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
  },
  instagramInput: {
    ...styles.input,
    flex: 1,
    minWidth: '140px',
    marginBottom: 0,
    padding: '0.625rem 0.875rem',
    fontSize: '0.9rem',
    borderRadius: '8px',
    background: 'rgba(255, 255, 255, 0.7)',
    color: DARK_TEXT,
    border: '1px solid rgba(0, 0, 0, 0.1)',
  },
  saveButton: {
    padding: '0.625rem 1rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)',
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap' as const,
  },
  // Hero tribe section styles
  tribeHero: {
    textAlign: 'center' as const,
    padding: '1.5rem',
    marginBottom: '1.25rem',
    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.92) 0%, rgba(255, 255, 255, 0.78) 100%)',
    borderRadius: '20px',
    border: '1px solid rgba(255, 255, 255, 0.6)',
    boxShadow: '0 8px 32px rgba(14, 165, 233, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
  },
  tribeHeroLoading: {
    textAlign: 'center' as const,
    padding: '1.5rem',
    marginBottom: '1.25rem',
    background: 'rgba(255, 255, 255, 0.5)',
    borderRadius: '20px',
    border: '1px solid rgba(255, 255, 255, 0.4)',
  },
  tribeLabel: {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: DARK_TEXT_SUBTLE,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.12em',
    marginBottom: '0.75rem',
  },
  tribeImageWrapper: {
    width: '80px',
    height: '80px',
    margin: '0 auto 0.75rem',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.12)',
    border: '3px solid rgba(255, 255, 255, 0.8)',
  },
  tribeImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  tribeTitle: {
    fontSize: '1.75rem',
    fontWeight: 800,
    color: DARK_TEXT,
    marginBottom: '0.75rem',
    lineHeight: 1.2,
  },
  tribeDescription: {
    fontSize: '0.95rem',
    color: DARK_TEXT_MUTED,
    lineHeight: 1.6,
    maxWidth: '420px',
    margin: '0 auto',
  },
}

export const Results: React.FC<ResultsProps> = ({
  userName,
  topMatches,
  onRefreshMatches,
  lookingFor,
  phone,
  onUpdatePhone,
  isRefreshing = false,
  myGroup,
}) => {
  const [editPhone, setEditPhone] = React.useState(phone)
  const [isSaved, setIsSaved] = React.useState(false)

  const getMatchLabel = () => {
    if (lookingFor === 'm') return 'Matches '
    if (lookingFor === 'f') return 'Matches '
    return 'Matches'
  }

  const handleSave = () => {
    onUpdatePhone(editPhone)
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 2000)
  }

  const getGroupDescription = (group: GroupSummary): string => {
    if (group.group_description) {
      return group.group_description
    }
    return GROUP_DESCRIPTIONS[group.group_key] || 'Bem-vindo à tua tribo. Conecta com pessoas que partilham a tua essência.'
  }

  return (
    <div className="glass-card" style={{
      ...styles.glassCard,
      background: 'rgba(255, 255, 255, 0.75)',
      border: '1px solid rgba(255, 255, 255, 0.5)',
    }}>
      {/* Top actions row with welcome and refresh */}
      <div style={localStyles.topActionsRow}>
        <h2 style={{
          ...localStyles.welcomeHeader,
          marginBottom: 0,
          textAlign: 'left' as const,
          fontSize: '1.25rem',
        }}>
          Olá, {userName}! ✨
        </h2>
        <button 
          onClick={onRefreshMatches}
          disabled={isRefreshing}
          style={localStyles.refreshButtonSmall}
          title="Atualizar matches"
        >
          <span style={isRefreshing ? localStyles.refreshSpinning : undefined}>🔄</span>
          <span>Atualizar</span>
        </button>
      </div>

      {/* TRIBE HERO SECTION - Primary focus with image */}
      {myGroup ? (
        <div style={localStyles.tribeHero}>
          <div style={localStyles.tribeLabel}>A tua tribo</div>
          
          {/* Tribe image */}
          <div style={localStyles.tribeImageWrapper}>
            <img 
              src={getTribeImage(myGroup.group_key)} 
              alt={myGroup.group_label || myGroup.group_key}
              style={localStyles.tribeImage}
            />
          </div>
          
          <h2 style={localStyles.tribeTitle}>
            {myGroup.group_label || myGroup.group_key}
          </h2>
          <p style={localStyles.tribeDescription}>
            {getGroupDescription(myGroup)}
          </p>
        </div>
      ) : (
        <div style={localStyles.tribeHeroLoading}>
          <div style={localStyles.tribeLabel}>A tua tribo</div>
          
          {/* Loading placeholder image */}
          <div style={{
            ...localStyles.tribeImageWrapper,
            background: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <span style={{ fontSize: '2rem' }}>🎯</span>
          </div>
          
          <h2 style={{ ...localStyles.tribeTitle, fontSize: '1.5rem', color: DARK_TEXT_MUTED }}>
            Ainda não atribuída
          </h2>
          <p style={{ ...localStyles.tribeDescription, fontSize: '0.9rem' }}>
            Completa o quiz e descobre a que tribo pertences. Cada grupo tem a sua própria personalidade!
          </p>
        </div>
      )}
      
      {topMatches.length > 0 ? (
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.75rem',
          }}>
            <h2 style={{
              ...localStyles.matchesTitle,
              marginBottom: 0,
              fontSize: '1.1rem',
            }}>
              <span>🏆</span>
              <span>Os teus Top {Math.min(3, topMatches.length)} {getMatchLabel()}</span>
            </h2>
            <span style={localStyles.autoRefreshIndicator}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#22c55e',
                display: 'inline-block',
              }} />
              <span>Auto</span>
            </span>
          </div>
          
          {topMatches.map((match, index) => (
            <div 
              key={match.user_id || match.id || index} 
              className="glass-card-subtle glass-hover"
              style={{
                ...styles.glassCardSubtle,
                background: 'rgba(255, 255, 255, 0.5)',
                border: '1px solid rgba(0, 0, 0, 0.06)',
                animationDelay: `${index * 0.1}s`,
              }}
            >
              <div style={localStyles.matchHeader}>
                <span style={localStyles.matchName}>
                  {match.user_name || 'Unknown'}
                </span>
                <span style={localStyles.compatibility}>
                  {match.compatibility}% compatível
                </span>
              </div>
              {match.phone && (
                <div style={localStyles.instagram}>
                  📸 Instagram: @{match.phone}
                </div>
              )}
            </div>
          ))}
          
          <div style={localStyles.partyBanner}>
            🎉 Gostas dos teus matches? Encontra-os na festa da ISCTE-Sintra no contentor marítimo e habilita-te a ganhar prémios, ao som de DJ Wappy e DJ Piki! 🎵
          </div>

          <p style={localStyles.hintText}>
            Volta daqui a pouco e vê se entretanto aparece alguém mais interessante
          </p>
        </div>
      ) : (
        <div className="glass-card-subtle" style={{
          ...styles.glassCardSubtle,
          background: 'rgba(255, 255, 255, 0.5)',
        }}>
          <p style={localStyles.noMatchesText}>
            Ainda não há {getMatchLabel().toLowerCase()}. 
            {lookingFor === 'mf' 
              ? ' Partilha o link com toda a gente!'
              : ` Partilha o link com ${lookingFor === 'm' ? 'os rapazes' : 'as raparigas'}!`
            }
          </p>
        </div>
      )}
      
      {/* Shareable link section */}
      <div className="glass-card-subtle glass-card-delay-1" style={{
        ...styles.glassCardSubtle,
        background: 'rgba(255, 255, 255, 0.5)',
        marginTop: '1.25rem',
      }}>
        <p style={localStyles.sectionLabel}>🔗 Link do quiz (partilha com toda a gente):</p>
        <code style={localStyles.codeBlock}>
          {window.location.origin + window.location.pathname}
        </code>
      </div>
      
      {/* Compact Instagram edit section */}
      <div className="glass-card-subtle glass-card-delay-2" style={{
        ...styles.glassCardSubtle,
        background: 'rgba(255, 255, 255, 0.5)',
        marginTop: '0.75rem',
      }}>
        <p style={localStyles.sectionLabel}>📱 Atualiza o teu Instagram:</p>
        <div style={localStyles.instagramRow}>
          <input
            style={localStyles.instagramInput}
            type="text"
            value={editPhone}
            onChange={e => setEditPhone(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="@username"
          />
          <button
            style={{
              ...localStyles.saveButton,
              opacity: isSaved ? 0.8 : 1,
            }}
            onClick={handleSave}
          >
            {isSaved ? '✓ Guardado' : 'Guardar'}
          </button>
        </div>
      </div>

      {/* Direct 1:1 matches chat panel - kept intact */}
      <div className="glass-card-subtle glass-card-delay-3" style={{
        ...styles.glassCardSubtle,
        background: 'rgba(255, 255, 255, 0.5)',
        marginTop: '0.75rem',
      }}>
        <ChatPanel topMatches={topMatches} />
      </div>
    </div>
  )
}
