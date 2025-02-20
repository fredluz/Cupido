import React, { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { Quiz } from './components/Quiz'
import { Results } from './components/Results'
import { Category, QuizResponse, Gender, LookingFor } from './types'
import { styles } from './styles'
import { quizData } from './quizData'

function App() {
  const [userName, setUserName] = useState('')
  const [phone, setPhone] = useState('')
  const [answers, setAnswers] = useState<(Category | null)[]>(Array(quizData.length).fill(null))
  const [topMatches, setTopMatches] = useState<QuizResponse[]>([])
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [gender, setGender] = useState<Gender | null>(null)
  const [lookingFor, setLookingFor] = useState<LookingFor | null>(null)

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

  const calcCompatibility = (a: QuizResponse, b: QuizResponse) => {
    const distance = calcDistance(a, b)
    const maxDistance = Math.sqrt(7 * Math.pow(14, 2))
    const compatibility = 100 * (1 - Math.pow(distance / maxDistance, 0.6))
    return Math.round(compatibility)
  }

  const fetchMatches = async (myRow: QuizResponse, userId: string) => {
    const { data: allRows, error } = await supabase
      .from('quiz_responses')
      .select('*')

    if (error || !allRows) return

    const others = allRows.filter((r: QuizResponse) => {
      // Filter by user ID
      if (r.user_id === userId) return false
      
      // Filter by gender preferences
      if (myRow.looking_for === 'mf') {
        // User looking for both, check if the other person is interested in user's gender
        return r.looking_for === 'mf' || r.looking_for === myRow.gender
      } else {
        // User looking for specific gender, check if match
        return r.gender === myRow.looking_for && 
          (r.looking_for === 'mf' || r.looking_for === myRow.gender)
      }
    })

    if (others.length === 0) {
      setTopMatches([])
      return
    }

    const matchesWithScore = others.map(other => ({
      ...other,
      compatibility: calcCompatibility(myRow, other)
    }))

    const sorted = matchesWithScore.sort((a, b) => b.compatibility - a.compatibility)
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

    const userId = localStorage.getItem('user_id') || ''
    if (!userId) {
      alert('Error: No user ID found')
      return
    }

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

    try {
      const { data: upsertData, error } = await supabase
        .from('quiz_responses')
        .upsert({
          user_id: userId,
          user_name: userName,
          phone,
          gender,
          looking_for: lookingFor,
          romantic: scores.Romantic,
          adventurous: scores.Adventurous,
          intellectual: scores.Intellectual,
          creative: scores.Creative,
          chill: scores.Chill,
          social: scores.Social,
          ambitious: scores.Ambitious
        })
        .select()

      if (error) {
        console.error('Supabase error:', error)
        alert(`Error saving quiz: ${error.message}`)
        return
      }

      if (!upsertData || upsertData.length === 0) {
        console.error('No data returned from upsert')
        alert('Error: No data returned from save operation')
        return
      }

      setHasSubmitted(true)
      const myRow = upsertData[0] as QuizResponse
      await fetchMatches(myRow, userId)
    } catch (err) {
      console.error('Unexpected error:', err)
      alert(`Unexpected error: ${err instanceof Error ? err.message : 'Unknown error'}`)
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

  const handlePhoneUpdate = async (newPhone: string) => {
    setPhone(newPhone)
    const userId = localStorage.getItem('user_id') || ''
    if (!userId) return

    // Update in Supabase
    await supabase
      .from('quiz_responses')
      .update({ phone: newPhone })
      .eq('user_id', userId)
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
          gender={gender}
          lookingFor={lookingFor}
          onUserNameChange={setUserName}
          onPhoneChange={setPhone}
          onAnswerChange={handleAnswerChange}
          onGenderChange={setGender}
          onLookingForChange={setLookingFor}
          onSubmit={handleSubmit}
        />
      ) : (
        <Results
          userName={userName}
          topMatches={topMatches}
          onRefreshMatches={handleRefreshMatches}
          userGender={gender as Gender}  // We can assert here because hasSubmitted is true
          lookingFor={lookingFor as LookingFor}
          phone={phone}
          onUpdatePhone={handlePhoneUpdate}
        />
      )}
    </div>
  )
}

export default App
