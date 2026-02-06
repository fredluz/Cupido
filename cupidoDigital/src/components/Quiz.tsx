import React, { CSSProperties, useState, useEffect } from 'react'
import { styles, typography, getSelectedAnswerStyle } from '../styles'
import { Category, Gender, LookingFor, QuizQuestion, StudyYear } from '../types'
import { quizImages } from '../assets/quizImages'

interface QuizProps {
  quizData: QuizQuestion[]
  answers: (Category | null)[]
  userName: string
  phone: string
  gender: Gender | null
  lookingFor: LookingFor | null
  degreeCode: string
  studyYear: StudyYear | ''
  onUserNameChange: (name: string) => void
  onPhoneChange: (phone: string) => void
  onGenderChange: (gender: Gender) => void
  onLookingForChange: (lookingFor: LookingFor) => void
  onDegreeCodeChange: (degreeCode: string) => void
  onStudyYearChange: (studyYear: StudyYear | '') => void
  onAnswerChange: (questionIndex: number, category: Category) => void
  onSubmit: (e: React.FormEvent) => void
}

const DEGREE_OPTIONS = [
  { value: 'L278', label: 'Desenvolvimento de Software e Aplicações' },
  { value: 'L321', label: 'Matemática Aplicada e Tecnologias Digitais' },
  { value: 'L274', label: 'Política, Economia e Sociedade' },
  { value: 'L273', label: 'Tecnologias Digitais e Automação' },
  { value: 'L311', label: 'Tecnologias Digitais, Edifícios e Construção Sustentável' },
  { value: 'L281', label: 'Tecnologias Digitais Educativas' },
  { value: 'L280', label: 'Tecnologias Digitais e Gestão' },
  { value: 'L277', label: 'Tecnologias Digitais e Inteligência Artificial' },
  { value: 'L282', label: 'Tecnologias Digitais e Saúde' },
  { value: 'L329', label: 'Tecnologias Digitais e Segurança de Informação' },
]

const STUDY_YEAR_OPTIONS: { value: StudyYear; label: string }[] = [
  { value: 'year_1', label: 'Primeiro ano' },
  { value: 'year_2', label: 'Segundo ano' },
  { value: 'year_3', label: 'Terceiro ano' },
]

// Dark text for light/glass backgrounds - high contrast
const DARK_TEXT = '#1e293b'
const DARK_TEXT_MUTED = '#475569'

// Glass-optimized local styles
const localStyles: Record<string, CSSProperties> = {
  welcomeTitle: {
    ...typography.sectionTitle,
    fontSize: '1.35rem',
    justifyContent: 'center',
    marginBottom: '1rem',
    color: DARK_TEXT,
  },
  sectionLabel: {
    marginBottom: '0.5rem',
    fontWeight: 600,
    color: DARK_TEXT,
    fontSize: '0.9rem',
    letterSpacing: '0.01em',
  },
  buttonGroup: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap' as const,
  },
  sectionContainer: {
    marginBottom: '1rem',
  },
  // Name + Instagram row layout
  nameRow: {
    display: 'flex',
    gap: '0.75rem',
    marginBottom: '0.75rem',
    flexWrap: 'wrap' as const,
  },
  nameRowItem: {
    flex: '1 1 200px',
    minWidth: '140px',
  },
  // Degree + Year row layout
  academicRow: {
    display: 'flex',
    gap: '0.75rem',
    marginBottom: '1rem',
    flexWrap: 'wrap' as const,
  },
  academicItem: {
    flex: '2 1 200px',
    minWidth: '160px',
  },
  academicItemYear: {
    flex: '1 1 120px',
    minWidth: '100px',
  },
  selectField: {
    ...styles.input,
    marginBottom: 0,
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    cursor: 'pointer',
    backgroundImage:
      'linear-gradient(45deg, transparent 50%, rgba(30, 41, 59, 0.7) 50%), linear-gradient(135deg, rgba(30, 41, 59, 0.7) 50%, transparent 50%)',
    backgroundPosition: 'calc(100% - 16px) calc(50% - 2px), calc(100% - 11px) calc(50% - 2px)',
    backgroundSize: '5px 5px, 5px 5px',
    backgroundRepeat: 'no-repeat',
    paddingRight: '2rem',
    color: DARK_TEXT,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  startButton: {
    ...styles.submitButton,
    width: '100%',
    marginTop: '0.25rem',
    padding: '0.875rem',
    fontSize: '1rem',
  },
  progressText: {
    textAlign: 'center' as const,
    marginBottom: '0.5rem',
    color: DARK_TEXT_MUTED,
    fontSize: '0.875rem',
    fontWeight: 500,
  },
  navButtonPrimary: {
    ...styles.submitButton,
    flex: 1,
  },
  loadingPlaceholder: {
    color: DARK_TEXT_MUTED,
    fontSize: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  // Compact input style
  compactInput: {
    ...styles.input,
    marginBottom: 0,
    color: DARK_TEXT,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  // Gender + LookingFor row layout
  genderRow: {
    display: 'flex',
    gap: '0.75rem',
    marginBottom: '1rem',
    flexWrap: 'wrap' as const,
  },
  genderRowItem: {
    flex: '1 1 140px',
    minWidth: '120px',
  },
}

export const Quiz: React.FC<QuizProps> = ({
  quizData,
  answers,
  userName,
  phone,
  gender,
  lookingFor,
  degreeCode,
  studyYear,
  onUserNameChange,
  onPhoneChange,
  onGenderChange,
  onLookingForChange,
  onDegreeCodeChange,
  onStudyYearChange,
  onAnswerChange,
  onSubmit
}) => {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [preloadedImages, setPreloadedImages] = useState<HTMLImageElement[]>([])

  // Preload all images
  useEffect(() => {
    const loadImages = async () => {
      const imagePromises = quizImages.map(src => {
        return new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image()
          img.src = src
          img.onload = () => resolve(img)
          img.onerror = reject
        })
      })

      try {
        const loadedImages = await Promise.all(imagePromises)
        setPreloadedImages(loadedImages)
      } catch (error) {
        console.error('Error preloading images:', error)
      }
    }

    loadImages()
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleNext = () => {
    if (currentQuestion < quizData.length) {
      setCurrentQuestion(curr => curr + 1)
      scrollToTop()
    }
  }

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(curr => curr - 1)
      scrollToTop()
    }
  }

  const progress = ((answers.filter(a => a !== null).length) / quizData.length) * 100

  // Welcome screen
  if (currentQuestion === 0) {
    return (
      <form onSubmit={(e) => {
        e.preventDefault()
        if (!userName.trim()) {
          alert('Por favor escreve o teu nome')
          return
        }
        if (!degreeCode || !studyYear) {
          alert('Por favor seleciona licenciatura e ano')
          return
        }
        if (!gender || !lookingFor) {
          alert('Por favor seleciona o teu género e preferência')
          return
        }
        handleNext()
      }}>
        <div className="glass-card glass-card-delay-1" style={{
          ...styles.glassCard,
          padding: '1.25rem',
        }}>
          <div style={localStyles.welcomeTitle}>
            <span>💘</span>
            <span>Bem-vindo ao Quiz do Cupido</span>
            <span>💘</span>
          </div>
          
          {/* Name + Instagram on same row */}
          <div style={localStyles.nameRow}>
            <div style={localStyles.nameRowItem}>
              <input
                className="glass-input"
                style={localStyles.compactInput}
                type="text"
                placeholder="O teu nome"
                value={userName}
                onChange={(e) => onUserNameChange(e.target.value)}
                required
              />
            </div>
            <div style={localStyles.nameRowItem}>
              <input
                className="glass-input"
                style={localStyles.compactInput}
                type="text"
                placeholder="Instagram (opcional)"
                value={phone}
                onChange={(e) => onPhoneChange(e.target.value)}
              />
            </div>
          </div>

          {/* Degree + Year on same row */}
          <div style={localStyles.academicRow}>
            <div style={localStyles.academicItem}>
              <select
                className="glass-input"
                style={localStyles.selectField}
                value={degreeCode}
                onChange={(e) => onDegreeCodeChange(e.target.value)}
                required
              >
                <option value="">Seleciona a licenciatura</option>
                {DEGREE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div style={localStyles.academicItemYear}>
              <select
                className="glass-input"
                style={localStyles.selectField}
                value={studyYear}
                onChange={(e) => onStudyYearChange(e.target.value as StudyYear | '')}
                required
              >
                <option value="">Ano</option>
                {STUDY_YEAR_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
    
          {/* Gender + LookingFor on same row */}
          <div style={localStyles.genderRow}>
            <div style={localStyles.genderRowItem}>
              <div style={localStyles.sectionLabel}>Tu és</div>
              <select
                className="glass-input"
                style={localStyles.selectField}
                value={gender || ''}
                onChange={(e) => onGenderChange(e.target.value as Gender)}
                required
              >
                <option value="">Seleciona</option>
                <option value="m">Homem</option>
                <option value="f">Mulher</option>
              </select>
            </div>
            <div style={localStyles.genderRowItem}>
              <div style={localStyles.sectionLabel}>Queres conhecer</div>
              <select
                className="glass-input"
                style={localStyles.selectField}
                value={lookingFor || ''}
                onChange={(e) => onLookingForChange(e.target.value as LookingFor)}
                required
              >
                <option value="">Seleciona</option>
                <option value="m">Homens</option>
                <option value="f">Mulheres</option>
                <option value="mf">Ambos</option>
              </select>
            </div>
          </div>

          <button 
            type="submit" 
            className="glass-button"
            style={localStyles.startButton}
          >
            Começar →
          </button>
        </div>
      </form>
    )
  }

  const q = quizData[currentQuestion - 1]
  const isLastQuestion = currentQuestion === quizData.length

  return (
    <div style={{ width: '100%' }}>
      {/* Progress bar with glass styling */}
      <div className="glass-card-delay-1" style={{ marginBottom: '1rem' }}>
        <div style={localStyles.progressText}>
          Pergunta {currentQuestion} de {quizData.length}
        </div>
        <div style={styles.progressBar}>
          <div 
            className="progress-fill-animated"
            style={{
              ...styles.progressFill,
              width: `${progress}%`,
            }} 
          />
        </div>
      </div>

      {/* Question card */}
      <div className="glass-card glass-card-delay-2 glass-hover" style={{
        ...styles.glassCard,
        padding: '1.25rem',
      }}>
        <div style={{
          ...styles.question,
          fontSize: '1.25rem',
          marginBottom: '1rem',
        }}>{q.question}</div>
        
        <div style={{
          ...styles.imageContainer,
          minHeight: '150px',
          maxHeight: '300px',
          marginBottom: '1.25rem',
        }}>
          {preloadedImages[currentQuestion - 1] ? (
            <img 
              src={quizImages[currentQuestion - 1]} 
              alt={`Illustration for ${q.question}`}
              style={{
                maxWidth: '100%',
                maxHeight: '280px',
                objectFit: 'contain',
                borderRadius: '12px',
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)',
              }}
            />
          ) : (
            <div style={localStyles.loadingPlaceholder}>
              <span>✨</span>
              <span>A carregar...</span>
            </div>
          )}
        </div>

        <div style={{
          ...styles.answerContainer,
          gap: '0.5rem',
        }}>
          {q.answers.map((ans, ansIndex) => {
            const isSelected = answers[currentQuestion - 1] === ans.value
            return (
              <button
                key={`${currentQuestion}-${ansIndex}`}
                type="button"
                className="glass-button"
                style={{
                  ...styles.answerButton,
                  padding: '0.875rem 1rem',
                  color: DARK_TEXT,
                  ...getSelectedAnswerStyle(isSelected),
                }}
                onClick={() => {
                  onAnswerChange(currentQuestion - 1, ans.value)
                  if (!isLastQuestion) {
                    setTimeout(handleNext, 200)
                  } else {
                    scrollToTop()
                  }
                }}
              >
                {ans.label}
              </button>
            )
          })}
        </div>

        <div style={{
          ...styles.navigationContainer,
          marginTop: '1.25rem',
        }}>
          <button
            type="button"
            onClick={handlePrev}
            className="glass-button"
            style={{
              ...styles.navButton,
              color: DARK_TEXT,
            }}
          >
            ← Anterior
          </button>
          {isLastQuestion ? (
            <button
              type="button"
              onClick={onSubmit}
              className="glass-button"
              style={{
                ...localStyles.navButtonPrimary,
                opacity: !answers.every(a => a !== null) ? 0.6 : 1,
                cursor: !answers.every(a => a !== null) ? 'not-allowed' : 'pointer',
              }}
              disabled={!answers.every(a => a !== null)}
            >
              Ver Resultados ✨
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="glass-button"
              style={localStyles.navButtonPrimary}
            >
              Próxima →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
