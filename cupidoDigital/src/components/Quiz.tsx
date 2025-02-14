import React, { CSSProperties, useState } from 'react'
import { styles } from '../styles'
import { Category, QuizQuestion } from '../types'

interface QuizProps {
  quizData: QuizQuestion[]
  answers: (Category | null)[]
  userName: string
  phone: string
  onUserNameChange: (name: string) => void
  onPhoneChange: (phone: string) => void
  onAnswerChange: (questionIndex: number, category: Category) => void
  onSubmit: (e: React.FormEvent) => void
}

export const Quiz: React.FC<QuizProps> = ({
  quizData,
  answers,
  userName,
  phone,
  onUserNameChange,
  onPhoneChange,
  onAnswerChange,
  onSubmit
}) => {
  const [currentQuestion, setCurrentQuestion] = useState(0)

  const handleNext = () => {
    if (currentQuestion < quizData.length) {
      setCurrentQuestion(curr => curr + 1)
    }
  }

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(curr => curr - 1)
    }
  }

  const progress = ((answers.filter(a => a !== null).length) / quizData.length) * 100

  if (currentQuestion === 0) {
    return (
      <form onSubmit={(e) => {
        e.preventDefault()
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
            placeholder="O teu Instagram (opcional)"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
          />
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
          [Imagem da pergunta {currentQuestion}]
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
                    handleNext()
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
