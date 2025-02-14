import { CSSProperties } from 'react'

type StyleObject = {
  [key: string]: CSSProperties
}

export const styles: StyleObject = {
  container: {
    maxWidth: '800px',
    width: '100%',
    margin: '0 auto',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#1f2937',
    boxSizing: 'border-box' as const,
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  questionCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '2rem',
    marginBottom: '1rem',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    transition: 'all 0.3s ease',
    width: '100%',     // Take full width
    boxSizing: 'border-box' as const,
  },
  question: {
    fontSize: '1.5rem',
    fontWeight: 700, // Slightly bolder
    marginBottom: '2rem',
    lineHeight: 1.4,
    color: '#111827', // Almost black for maximum contrast
  },
  answerContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  answerButton: {
    padding: '1rem',
    border: '2px solid #fecdd3', // Soft pink border
    borderRadius: '8px',
    background: 'white',
    fontSize: '1rem',
    textAlign: 'left',
    cursor: 'pointer',
    width: '100%', // Add this to ensure full width
    transition: 'all 0.2s ease',
    color: '#374151', // Medium-dark gray for good readability
    outline: 'none', // Add this to prevent focus outline issues
  },
  selectedAnswer: {
    borderColor: '#fb7185', // Darker pink for selected state
    background: '#fff1f2', // Very light pink background
    color: '#be123c', // Deep pink text
  },
  input: {
    width: '100%',
    padding: '1rem',
    fontSize: '1rem',
    border: '2px solid #fecdd3',
    borderRadius: '8px',
    marginBottom: '1rem',
    color: '#111827', // Darker text
    background: 'white', // Explicit white background
    outlineColor: '#fb7185', // Pink outline when focused
  },
  submitButton: {
    background: '#fb7185', // Pink primary button
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
  },
  navigationContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '2rem',
    gap: '1rem',
  },
  navButton: {
    padding: '0.8rem 1.5rem',
    borderRadius: '8px',
    border: '2px solid #fb7185',
    background: 'white',
    color: '#fb7185',
    fontSize: '1rem',
    cursor: 'pointer',
    flex: 1,
  },
  progressBar: {
    width: '100%',
    height: '4px',
    background: '#e0e0e0',
    borderRadius: '2px',
    marginBottom: '2rem',
  },
  progressFill: {
    height: '100%',
    background: '#fb7185',
    borderRadius: '2px',
    transition: 'width 0.3s ease',
  },
  imageContainer: {
    width: '100%',
    minHeight: '200px',  // Change from fixed height to minHeight
    maxHeight: '400px',  // Add maxHeight to prevent too large images
    marginTop: '1rem',
    marginBottom: '2rem',
    borderRadius: '8px',
    background: '#fdf2f8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',  // Add this to contain the image
  }
}
