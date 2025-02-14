import React, { CSSProperties } from 'react'
import { styles } from '../styles'
import { QuizResponse } from '../types'

interface ResultsProps {
  userName: string
  topMatches: QuizResponse[]
  onRefreshMatches: () => void
}

export const Results: React.FC<ResultsProps> = ({
  userName,
  topMatches,
  onRefreshMatches
}) => {
  const codeStyle: CSSProperties = {
    background: '#f5f5f5',
    padding: '0.5rem',
    borderRadius: '4px',
    display: 'block',
    wordBreak: 'break-all'
  }

  return (
    
      <div style={styles.questionCard}>
        <h2 style={styles.question}>Olá, {userName}! ✨</h2>
        <button 
          onClick={onRefreshMatches}
          style={styles.submitButton}
        >
          Atualizar Matches
        </button>
      {topMatches.length > 0 ? (
        <div>
          <h2 style={{...styles.question, padding: '0 1rem'} as CSSProperties}>
        Os teus Top 3 Matches
          </h2>
          {topMatches.map(match => (
        <div key={match.id} style={styles.matchCard}>
          <p style={{fontSize: '1.2rem', fontWeight: 600} as CSSProperties}>
            {match.user_name || 'Unknown'}
          </p>
          {match.phone && (
            <p style={{color: '#666'} as CSSProperties}>
          Instagram: @{match.phone}
            </p>
          )}
        </div>
          ))}
          <p style={{marginTop: '1rem', fontStyle: 'italic'} as CSSProperties}>
        Volta daqui a pouco e vê se entretanto aparece alguém mais interessante
          </p>
        </div>
      ) : (
        <div style={styles.matchCard}>
          <p></p>
        </div>
      )}
      <div style={styles.matchCard}>
        <p style={{marginBottom: '0.5rem'} as CSSProperties}>O teu link partilhável:</p>
        <code style={codeStyle}>
          {window.location.origin}?u={localStorage.getItem('user_id')}
        </code>
      </div>
    </div>
  )
}
