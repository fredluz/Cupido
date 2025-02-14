import { CSSProperties } from 'react'

type StyleObject = {
  [key: string]: CSSProperties
}

export const styles: StyleObject = {
  container: {
    maxWidth: '100vw',
    minHeight: '100vh',
    margin: 0,
    padding: '20px',
    background: '#f5f5f7',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  questionCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '2rem',
    marginBottom: '1rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    transition: 'all 0.3s ease',
  },
  question: {
    fontSize: '1.5rem',
    fontWeight: 600,
    marginBottom: '2rem',
    lineHeight: 1.4,
  },
  answerContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  answerButton: {
    padding: '1rem',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    background: 'white',
    fontSize: '1rem',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  selectedAnswer: {
    borderColor: '#007AFF',
    background: '#f0f7ff',
  },
  input: {
    width: '100%',
    padding: '1rem',
    fontSize: '1rem',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    marginBottom: '1rem',
  },
  submitButton: {
    background: '#007AFF',
    color: 'white',
    padding: '1rem 2rem',
    borderRadius: '8px',
    border: 'none',
    fontSize: '1rem',
    cursor: 'pointer',
    transition: 'background 0.2s ease',
  },
  matchCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '1rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  }
}
