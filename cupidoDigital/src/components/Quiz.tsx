import React, { CSSProperties, useState, useEffect } from 'react'
import { styles } from '../styles'
import { Category, Gender, LookingFor, QuizQuestion } from '../types'
import { quizImages } from '../assets/quizImages'

interface QuizProps {
  quizData: QuizQuestion[]
  answers: (Category | null)[]
  userName: string
  phone: string
  gender: Gender | null
  lookingFor: LookingFor | null
  onUserNameChange: (name: string) => void
  onPhoneChange: (phone: string) => void
  onGenderChange: (gender: Gender) => void
  onLookingForChange: (lookingFor: LookingFor) => void
  onAnswerChange: (questionIndex: number, category: Category) => void
  onSubmit: (e: React.FormEvent) => void
}

export const Quiz: React.FC<QuizProps> = ({
  quizData,
  answers,
  userName,
  phone,
  gender,
  lookingFor,
  onUserNameChange,
  onPhoneChange,
  onGenderChange,
  onLookingForChange,
  onAnswerChange,
  onSubmit
}) => {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [preloadedImages, setPreloadedImages] = useState<HTMLImageElement[]>([])

  // Add preloading effect
  useEffect(() => {
    // Preload all images
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
  }, []) // Only run once on mount

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

  if (currentQuestion === 0) {
    return (
      <form onSubmit={(e) => {
        e.preventDefault()
        if (!gender || !lookingFor) {
          alert('Por favor seleciona o teu género e preferência')
          return
        }
        handleNext()
      }}>
        <div style={styles.questionCard}>
          <div style={styles.question}>
            Bem-vindo ao Quiz do Cupido! 💘
          </div>
          <input
            style={styles.input}
            type="text"
            placeholder="O teu nome"
            value={userName}
            onChange={(e) => onUserNameChange(e.target.value)}
            required
          />
          <input
            style={styles.input}
            type="text"
            placeholder="O teu Instagram (é opcional, mas pode ajudar a facilitar o contacto)"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
          />
    
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ marginBottom: '0.5rem', fontWeight: 500 }}>Tu és:</div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="button"
                onClick={() => onGenderChange('m')}
                style={{
                  ...styles.answerButton,
                  ...(gender === 'm' ? styles.selectedAnswer : {})
                }}
              >
                Homem
              </button>
              <button
                type="button"
                onClick={() => onGenderChange('f')}
                style={{
                  ...styles.answerButton,
                  ...(gender === 'f' ? styles.selectedAnswer : {})
                }}
              >
                Mulher
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <div style={{ marginBottom: '0.5rem', fontWeight: 500 }}>Procuras:</div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="button"
                onClick={() => onLookingForChange('m')}
                style={{
                  ...styles.answerButton,
                  ...(lookingFor === 'm' ? styles.selectedAnswer : {})
                }}
              >
                Homens
              </button>
              <button
                type="button"
                onClick={() => onLookingForChange('f')}
                style={{
                  ...styles.answerButton,
                  ...(lookingFor === 'f' ? styles.selectedAnswer : {})
                }}
              >
                Mulheres
              </button>
              <button
                type="button"
                onClick={() => onLookingForChange('mf')}
                style={{
                  ...styles.answerButton,
                  ...(lookingFor === 'mf' ? styles.selectedAnswer : {})
                }}
              >
                Ambos
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            style={styles.submitButton}
          >
            Começar
          </button>
        </div>
      </form>
    )
  }

  const q = quizData[currentQuestion - 1]
  const isLastQuestion = currentQuestion === quizData.length

  return (
    <div style={{ width: '100%' }}>
      <div style={styles.progressBar}>
        <div style={{
          ...styles.progressFill,
          width: `${progress}%`
        }} />
      </div>

      <div style={styles.questionCard}>
        <div style={styles.question}>{q.question}</div>
        
        <div style={styles.imageContainer}>
          {preloadedImages[currentQuestion - 1] ? (
            <img 
              src={quizImages[currentQuestion - 1]} 
              alt={`Illustration for ${q.question}`}
              style={{
                maxWidth: '100%',
                maxHeight: '400px',
                objectFit: 'contain',
                borderRadius: '8px'
              }}
            />
          ) : (
            <div>Loading...</div>
          )}
        </div>

        <div style={styles.answerContainer}>
          {q.answers.map((ans, ansIndex) => {
            const isSelected = answers[currentQuestion - 1] === ans.value
            const buttonStyle: CSSProperties = {
              ...styles.answerButton,
              ...(isSelected ? styles.selectedAnswer : {
                borderColor: '#fecdd3',
                background: 'white',
                color: '#374151'
              })
            }
            return (
              <button
                key={`${currentQuestion}-${ansIndex}`}
                type="button"
                style={buttonStyle}
                onClick={() => {
                  onAnswerChange(currentQuestion - 1, ans.value)
                  if (!isLastQuestion) {
                    handleNext() // This will now trigger the scroll
                  } else {
                    scrollToTop() // Scroll even on last question
                  }
                }}
              >
                {ans.label}
              </button>
            )
          })}
        </div>

        <div style={styles.navigationContainer}>
          <button
            type="button"
            onClick={handlePrev}
            style={styles.navButton}
          >
            Anterior
          </button>
          {isLastQuestion ? (
            <button
              type="button"
              onClick={onSubmit}
              style={{
                ...styles.navButton,
                background: '#007AFF',
                color: 'white',
              }}
              disabled={!answers.every(a => a !== null)}
            >
              Ver Resultados
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              style={{
                ...styles.navButton,
                background: '#007AFF',
                color: 'white',
              }}
            >
              Próxima
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
