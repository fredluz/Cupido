import React, { CSSProperties } from 'react'
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
  return (
    <form onSubmit={onSubmit}>
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
      </div>

      {quizData.map((q, i) => (
        <div 
          key={i} 
          style={{
            ...styles.questionCard,
            opacity: answers.slice(0, i).every(a => a !== null) ? 1 : 0.5,
          } as CSSProperties}
        >
          <div style={styles.question}>{q.question}</div>
          <div style={styles.answerContainer}>
            {q.answers.map((ans, ansIndex) => {
              const buttonStyle: CSSProperties = {
                ...styles.answerButton,
                ...(answers[i] === ans.value ? styles.selectedAnswer : {})
              }
              return (
                <button
                  key={ansIndex}
                  type="button"
                  style={buttonStyle}
                  onClick={() => onAnswerChange(i, ans.value)}
                  disabled={!answers.slice(0, i).every(a => a !== null)}
                >
                  {ans.label}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      <button 
        type="submit" 
        style={styles.submitButton}
        disabled={!answers.every(a => a !== null)}
      >
        Encontrar Matches
      </button>
    </form>
  )
}
