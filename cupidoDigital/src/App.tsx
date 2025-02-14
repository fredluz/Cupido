import React, { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { Quiz } from './components/Quiz'
import { Results } from './components/Results'
import { Category, QuizResponse } from './types'
import { styles } from './styles'
import { quizData } from './quizData'

function App() {
  const [userName, setUserName] = useState('')
  const [phone, setPhone] = useState('')
  const [answers, setAnswers] = useState<(Category | null)[]>(Array(quizData.length).fill(null))
  const [topMatches, setTopMatches] = useState<QuizResponse[]>([])
  const [hasSubmitted, setHasSubmitted] = useState(false)

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search)
    const paramUserId = queryParams.get('u')
    if (paramUserId) {
      localStorage.setItem('user_id', paramUserId)
    }

    let storedId = localStorage.getItem('user_id')
    if (!storedId) {
      storedId = crypto.randomUUID()
      localStorage.setItem('user_id', storedId)
    }

    fetchMyRow(storedId).catch(console.error)
  }, [])

  const fetchMyRow = async (uId: string) => {
    const { data: myRow, error } = await supabase
      .from('quiz_responses')
      .select('*')
      .eq('user_id', uId)
      .single()

    if (error || !myRow) return

    setUserName(myRow.user_name || '')
    setPhone(myRow.phone || '')
    setHasSubmitted(true)

    await fetchMatches(myRow, uId)
  }

  const fetchMatches = async (myRow: QuizResponse, userId: string) => {
    const { data: allRows, error } = await supabase
      .from('quiz_responses')
      .select('*')

    if (error || !allRows) return

    const others = allRows.filter((r: QuizResponse) => r.user_id !== userId)
    if (others.length === 0) {
      setTopMatches([])
      return
    }

    const sorted = [...others].sort((a, b) => calcDistance(myRow, a) - calcDistance(myRow, b))
    setTopMatches(sorted.slice(0, 3))
  }

  const calcDistance = (a: QuizResponse, b: QuizResponse) => {
    return Math.sqrt(
      Math.pow(a.romantic - b.romantic, 2) +
      Math.pow(a.adventurous - b.adventurous, 2) +
      Math.pow(a.intellectual - b.intellectual, 2) +
      Math.pow(a.creative - b.creative, 2) +
      Math.pow(a.chill - b.chill, 2) +
      Math.pow(a.social - b.social, 2) +
      Math.pow(a.ambitious - b.ambitious, 2)
    )
  }

  const handleAnswerChange = (qIndex: number, category: Category) => {
    const newAnswers = [...answers]
    newAnswers[qIndex] = category
    setAnswers(newAnswers)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const scores: Record<Category, number> = {
      Romantic: 0,
      Adventurous: 0,
      Intellectual: 0,
      Creative: 0,
      Chill: 0,
      Social: 0,
      Ambitious: 0
    }
    answers.forEach(ans => {
      if (ans) scores[ans] += 2
    })

    const userId = localStorage.getItem('user_id') || ''
    const { data: upsertData, error } = await supabase
      .from('quiz_responses')
      .upsert({
        user_id: userId,
        user_name: userName,
        phone,
        romantic: scores.Romantic,
        adventurous: scores.Adventurous,
        intellectual: scores.Intellectual,
        creative: scores.Creative,
        chill: scores.Chill,
        social: scores.Social,
        ambitious: scores.Ambitious
      } as QuizResponse, { onConflict: 'user_id' })
      .select()

    if (error) {
      console.error(error)
      alert('Error saving quiz.')
      return
    }

    setHasSubmitted(true)
    const myRow = upsertData?.[0] as QuizResponse
    if (myRow) {
      await fetchMatches(myRow, userId)
    }
  }

  const handleRefreshMatches = async () => {
    const userId = localStorage.getItem('user_id') || ''
    if (!userId) return

    const { data: myRow, error } = await supabase
      .from('quiz_responses')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (myRow && !error) {
      fetchMatches(myRow, userId)
    }
  }

  return (
    <div style={styles.container}>
      <h1>Matchmaker da AlternAtiva</h1>

      {!hasSubmitted ? (
        <Quiz
          quizData={quizData}
          answers={answers}
          userName={userName}
          phone={phone}
          onUserNameChange={setUserName}
          onPhoneChange={setPhone}
          onAnswerChange={handleAnswerChange}
          onSubmit={handleSubmit}
        />
      ) : (
        <Results
          userName={userName}
          topMatches={topMatches}
          onRefreshMatches={handleRefreshMatches}
        />
      )}
    </div>
  )
}

export default App
