import React, { CSSProperties } from 'react'
import { styles } from '../styles'
import { QuizResponse, Gender, LookingFor } from '../types'

interface ResultsProps {
  userName: string
  topMatches: QuizResponse[]
  onRefreshMatches: () => void
  userGender: Gender
  lookingFor: LookingFor
}

export const Results: React.FC<ResultsProps> = ({
  userName,
  topMatches,
  onRefreshMatches,
  userGender,
  lookingFor
}) => {
  const codeStyle: CSSProperties = {
    background: '#f5f5f5',
    padding: '0.5rem',
    borderRadius: '4px',
    display: 'block',
    wordBreak: 'break-all'
  }

  const getMatchLabel = () => {
    if (lookingFor === 'm') return 'Matches '
    if (lookingFor === 'f') return 'Matches '
    return 'Matches'
  }

  return (
    <div style={styles.questionCard}>
      <h2 style={styles.question}>Olá, {userName}! ✨</h2>
      <button 
        onClick={onRefreshMatches}
        style={styles.submitButton}
      >
        Atualizar {getMatchLabel()}
      </button>
      {topMatches.length > 0 ? (
        <div>
          <h2 style={{...styles.question, padding: '0 1rem'} as CSSProperties}>
            Os teus Top {Math.min(3, topMatches.length)} {getMatchLabel()}
          </h2>
          {topMatches.map(match => (
            <div key={match.id} style={styles.matchCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{fontSize: '1.2rem', fontWeight: 600} as CSSProperties}>
                  {match.user_name || 'Unknown'}
                </p>
                <p style={{
                  color: '#be123c',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                } as CSSProperties}>
                  {match.compatibility}% compatível
                </p>
              </div>
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
          <p>
            Ainda não há {getMatchLabel().toLowerCase()}. 
            {lookingFor === 'mf' 
              ? ' Partilha o link com toda a gente!'
              : ` Partilha o link com ${lookingFor === 'm' ? 'os rapazes' : 'as raparigas'}!`
            }
          </p>
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
