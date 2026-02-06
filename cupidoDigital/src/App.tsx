import React, { useCallback, useEffect, useState, useRef } from 'react'
import {
  DEVICE_USER_ID_STORAGE_KEY,
  getOrCreateDeviceUserId,
  supabase
} from './supabaseClient'
import { Quiz } from './components/Quiz'
import { Results } from './components/Results'
import { Category, QuizResponse, Gender, LookingFor, StudyYear } from './types'
import { styles, injectGlassStyles, globalBackgroundStyle, floatingOrbStyle, typography } from './styles'
import { quizData } from './quizData'
import { BackendMatch, getMatches, getMyProfile, MyProfile, submitQuiz } from './services/quizFlow'
import { GroupSummary, listMyGroup } from './services/groupChat'

const AUTO_REFRESH_INTERVAL_MS = 30000 // 30 seconds

const mapBackendMatchToQuizResponse = (match: BackendMatch): QuizResponse => ({
  user_id: match.user_id,
  user_name: match.user_name,
  phone: match.phone,
  gender: match.gender,
  looking_for: match.looking_for,
  compatibility: match.compatibility,
  is_mutual_top3: match.is_mutual_top3,
  rank: match.rank,
  romantic: 0,
  adventurous: 0,
  intellectual: 0,
  creative: 0,
  chill: 0,
  social: 0,
  ambitious: 0
})

function App() {
  const [userName, setUserName] = useState('')
  const [phone, setPhone] = useState('')
  const [answers, setAnswers] = useState<(Category | null)[]>(Array(quizData.length).fill(null))
  const [topMatches, setTopMatches] = useState<QuizResponse[]>([])
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [gender, setGender] = useState<Gender | null>(null)
  const [lookingFor, setLookingFor] = useState<LookingFor | null>(null)
  const [degreeCode, setDegreeCode] = useState('')
  const [studyYear, setStudyYear] = useState<StudyYear | ''>('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [myGroup, setMyGroup] = useState<GroupSummary | null>(null)
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null)

  const applyProfileToState = useCallback((profile: MyProfile) => {
    setUserName(profile.user_name)
    setPhone(profile.phone)
    setGender(profile.gender)
    setLookingFor(profile.looking_for)
    setDegreeCode(profile.course_code)
    setStudyYear(profile.study_year ?? '')
  }, [])

  const fetchMyRow = useCallback(async (userId: string) => {
    const myProfile = await getMyProfile(userId)

    if (!myProfile) {
      return
    }

    applyProfileToState(myProfile)
    setHasSubmitted(true)

    const [backendMatches, group] = await Promise.all([
      getMatches(myProfile),
      listMyGroup().catch(() => null)
    ])
    setTopMatches(backendMatches.map(mapBackendMatchToQuizResponse))
    setMyGroup(group)
  }, [applyProfileToState])

  useEffect(() => {
    // Inject glass morphism styles and animations
    injectGlassStyles()

    const queryParams = new URLSearchParams(window.location.search)
    const paramUserId = queryParams.get('u')
    if (paramUserId) {
      localStorage.setItem(DEVICE_USER_ID_STORAGE_KEY, paramUserId)
    }

    const userId = paramUserId ?? getOrCreateDeviceUserId()

    fetchMyRow(userId).catch((error) => {
      console.error('Failed to restore profile', error)
    })
  }, [fetchMyRow])

  const handleAnswerChange = (qIndex: number, category: Category) => {
    const newAnswers = [...answers]
    newAnswers[qIndex] = category
    setAnswers(newAnswers)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const userId = localStorage.getItem(DEVICE_USER_ID_STORAGE_KEY) || getOrCreateDeviceUserId()
    if (!userId) {
      alert('Error: No user ID found')
      return
    }

    if (!gender || !lookingFor) {
      alert('Por favor seleciona o teu género e preferência')
      return
    }

    if (!degreeCode || !studyYear) {
      alert('Por favor seleciona licenciatura e ano')
      return
    }

    try {
      const backendMatches = await submitQuiz({
        userName,
        phone,
        gender,
        lookingFor,
        courseCode: degreeCode,
        studyYear,
        answers
      })

      setHasSubmitted(true)
      setTopMatches(backendMatches.map(mapBackendMatchToQuizResponse))
      
      // Fetch group assignment after submission
      const group = await listMyGroup().catch(() => null)
      setMyGroup(group)
    } catch (err) {
      console.error('Unexpected error:', err)
      alert(`Unexpected error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const handleRefreshMatches = useCallback(async () => {
    const userId = localStorage.getItem(DEVICE_USER_ID_STORAGE_KEY) || getOrCreateDeviceUserId()
    if (!userId) return

    setIsRefreshing(true)
    try {
      const myProfile = await getMyProfile(userId)
      if (!myProfile) {
        setTopMatches([])
        return
      }

      applyProfileToState(myProfile)
      const [backendMatches, group] = await Promise.all([
        getMatches(myProfile),
        listMyGroup().catch(() => null)
      ])
      setTopMatches(backendMatches.map(mapBackendMatchToQuizResponse))
      setMyGroup(group)
    } catch (error) {
      console.error('Failed to refresh matches', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [applyProfileToState])

  // Auto-refresh matches every 30 seconds after submission
  useEffect(() => {
    if (hasSubmitted) {
      // Initial refresh
      handleRefreshMatches()
      
      // Set up interval for auto-refresh
      autoRefreshRef.current = setInterval(() => {
        handleRefreshMatches()
      }, AUTO_REFRESH_INTERVAL_MS)

      return () => {
        if (autoRefreshRef.current) {
          clearInterval(autoRefreshRef.current)
          autoRefreshRef.current = null
        }
      }
    }
  }, [hasSubmitted, handleRefreshMatches])

  const handlePhoneUpdate = async (newPhone: string) => {
    setPhone(newPhone)
    const userId = localStorage.getItem(DEVICE_USER_ID_STORAGE_KEY) || getOrCreateDeviceUserId()
    if (!userId) return

    await supabase
      .from('quiz_responses')
      .update({
        phone: newPhone,
        instagram_handle: newPhone
      })
      .eq('user_id', userId)
  }

  // Dark text for header on glass background
  const headerTitleStyle = {
    ...typography.title,
    background: 'linear-gradient(135deg, #0f172a 0%, #1e40af 50%, #0e7490 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  }

  const headerSubtitleStyle = {
    ...typography.subtitle,
    color: '#334155',
    marginBottom: '1rem',
  }

  return (
    <>
      {/* Global background with gradient atmosphere */}
      <div style={globalBackgroundStyle} />
      
      {/* Floating ambient orbs for liquid effect */}
      <div style={floatingOrbStyle('top-left')} />
      <div style={floatingOrbStyle('top-right')} />
      <div style={floatingOrbStyle('bottom-left')} />
      <div style={floatingOrbStyle('bottom-right')} />
      
      <div style={styles.container}>
        <div className="glass-card" style={{ 
          textAlign: 'center', 
          marginBottom: '1rem',
          padding: '1.25rem',
        }}>
          <h1 style={headerTitleStyle}>
            Matchmaker do ISCTE-Sintra
          </h1>
          <p style={headerSubtitleStyle}>
            Descobre as tuas conexões mais compatíveis ✨
          </p>
        </div>

        {!hasSubmitted ? (
          <Quiz
            quizData={quizData}
            answers={answers}
            userName={userName}
            phone={phone}
            gender={gender}
            lookingFor={lookingFor}
            degreeCode={degreeCode}
            studyYear={studyYear}
            onUserNameChange={setUserName}
            onPhoneChange={setPhone}
            onAnswerChange={handleAnswerChange}
            onGenderChange={setGender}
            onLookingForChange={setLookingFor}
            onDegreeCodeChange={setDegreeCode}
            onStudyYearChange={setStudyYear}
            onSubmit={handleSubmit}
          />
        ) : (
          <Results
            userName={userName}
            topMatches={topMatches}
            onRefreshMatches={handleRefreshMatches}
            userGender={gender as Gender}
            lookingFor={lookingFor as LookingFor}
            phone={phone}
            onUpdatePhone={handlePhoneUpdate}
            isRefreshing={isRefreshing}
            myGroup={myGroup}
          />
        )}
      </div>
    </>
  )
}

export default App
