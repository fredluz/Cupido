// src/App.tsx
import React, { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

// Example categories
type Category = 'Romantic' | 'Adventurous' | 'Intellectual' | 'Creative' | 'Chill' | 'Social' | 'Ambitious'

// Example question/answer structure
interface QuizQuestion {
  question: string
  answers: {
    label: string
    value: Category
  }[]
}

const quizData: QuizQuestion[] = [
  {
    question: 'Como seria a tua manhã de domingo ideal?',
    answers: [
      { label: 'Preparar o pequeno-almoço para alguém especial enquanto toco as minhas músicas favoritas', value: 'Romantic' },
      { label: 'Acordar cedo para uma caminhada ao nascer do sol', value: 'Adventurous' },
      { label: 'Mergulhar num bom livro, podcast ou documentário', value: 'Intellectual' },
      { label: 'Montar um cavalete junto à janela para pintar com a luz da manhã', value: 'Creative' },
      { label: 'Dormir até tarde com cobertores aconchegantes, música suave e zero obrigações', value: 'Chill' },
      { label: 'Contactar os meus amigos para ver como estão a lidar com a ressaca da noite anterior', value: 'Social' },
      { label: 'Começar cedo os meus projetos pessoais e o planeamento semanal', value: 'Ambitious' }
    ]
  },
  {
    question: 'O crush acabou de entrar na sala de aula. Qual é a estratégia?',
    answers: [
      { label: 'Deixei uma nota com uma mensagem fofa junto com o seu café favorito no lugar dele', value: 'Romantic' },
      { label: 'Convido-o para faltarmos à aula juntos', value: 'Adventurous' },
      { label: 'Inicio uma conversa sobre um tópico fascinante que o professor mencionou', value: 'Intellectual' },
      { label: 'Mostro-lhe o desenho que fez dele no meu caderno', value: 'Creative' },
      { label: 'Aceno casualmente e continuo a ouvir a minha música', value: 'Chill' },
      { label: 'Convido-o para se juntar à minha mesa já cheia de amigos', value: 'Social' },
      { label: 'Peço-lhe para ser o meu colega naquele projeto importante da cadeira', value: 'Ambitious' }
    ]
  },
  {
    question: 'O teu perfil numa aplicação de encontros destacaria...',
    answers: [
      { label: 'Procuro alguém para deep talks à meia-noite', value: 'Romantic' },
      { label: 'Procuro cúmplice para escapadelas espontâneas de fim de semana', value: 'Adventurous' },
      { label: 'Quero debater filosofia às 3 da manhã', value: 'Intellectual' },
      { label: 'Sou artista à procura de musa (ou pelo menos alguém para pintar)', value: 'Creative' },
      { label: 'Estou aqui para encontrar alguém para ver netflix', value: 'Chill' },
      { label: 'O meu grupo de amigos tem espaço para mais um', value: 'Social' },
      { label: 'Sou futuro CEO à procura de futura CEO', value: 'Ambitious' }
    ]
  },
  {
    question: 'Qual é o teu animal de estimação ideal?',
    answers: [
      { label: 'Quero um gato carinhoso que adore aconchegar-se', value: 'Romantic' },
      { label: 'Quero um cão energético para me acompanhar nas caminhadas', value: 'Adventurous' },
      { label: 'Quero um papagaio falante', value: 'Intellectual' },
      { label: 'Quero um animal exótico ou incomum que se destaque', value: 'Creative' },
      { label: 'Prefiro um aquário de baixa manutenção', value: 'Chill' },
      { label: 'Quero um cão amigável que adore conhecer pessoas novas', value: 'Social' },
      { label: 'Quero um cavalo de competição que possa treinar para ganharmos troféus juntos', value: 'Ambitious' }
    ]
  },
  {
    question: 'Como é a tua hora de almoço perfeita?',
    answers: [
      { label: 'Faço um piquenique no parque com a pessoa especial', value: 'Romantic' },
      { label: 'Experimento um novo restaurante numa zona inexplorada da cidade', value: 'Adventurous' },
      { label: 'Faço uma visita rápida à biblioteca ou livraria', value: 'Intellectual' },
      { label: 'Desenho no meu caderno num café', value: 'Creative' },
      { label: 'Como tranquilamente enquanto vejo a minha série favorita', value: 'Chill' },
      { label: 'Encontro-me com amigos para um almoço em grupo', value: 'Social' },
      { label: 'Como uma sandes rápida para voltar a trabalhar no meu projeto pessoal', value: 'Ambitious' }
    ]
  },
  {
    question: 'Estás a conhecer alguém novo num evento social. Qual cenário se parece mais contigo?',
    answers: [
      { label: 'Troco elogios e procuro encontrar genuína conexão emocional', value: 'Romantic' },
      { label: 'Começo a falar sobre as minhas excursões recentes ou planos de viagem', value: 'Adventurous' },
      { label: 'Mergulho num tópico profundo ou provocador de reflexão', value: 'Intellectual' },
      { label: 'Rapidamente discutimos música favorita, arte ou hobbies criativos', value: 'Creative' },
      { label: 'Mantenho a conversa leve, relaxada, falando sobre passatempos tranquilos', value: 'Chill' },
      { label: 'Convido-os para se juntarem ao meu grupo de amigos', value: 'Social' },
      { label: 'Pergunto sobre os seus objetivos, paixões ou planos futuros', value: 'Ambitious' }
    ]
  },
  {
    question: 'Como descreverias o teu "lugar feliz"?',
    answers: [
      { label: 'Num piquenique de sonho ou num passeio na praia ao pôr do sol', value: 'Romantic' },
      { label: 'Em pé no pico de uma montanha ou a explorar uma cidade nova', value: 'Adventurous' },
      { label: 'Numa biblioteca acolhedora ou num canto de café onde posso ler e refletir', value: 'Intellectual' },
      { label: 'Num estúdio repleto de cor, música e materiais infinitos para explorar', value: 'Creative' },
      { label: 'Num sofá confortável sozinho ou acompanhado por quem queira', value: 'Chill' },
      { label: 'Num festival animado, uma festa da AlternAtiva ou qualquer lugar com boas vibes', value: 'Social' },
      { label: 'Num escritório ou conferência vibrante onde sinto a energia das grandes ideias', value: 'Ambitious' }
    ]
  }
]

interface QuizResponse {
  id?: number
  user_id?: string
  user_name?: string
  phone?: string
  romantic: number
  adventurous: number
  intellectual: number
  creative: number
  chill: number
  social: number
  ambitious: number
}

function App() {
  const [userName, setUserName] = useState('')
  const [phone, setPhone] = useState('')
  const [answers, setAnswers] = useState<(Category | null)[]>(Array(quizData.length).fill(null))
  const [topMatches, setTopMatches] = useState<QuizResponse[]>([])
  const [hasSubmitted, setHasSubmitted] = useState(false)

  useEffect(() => {
    // 1. Check for ?u= param to support shareable link approach
    const queryParams = new URLSearchParams(window.location.search)
    const paramUserId = queryParams.get('u')
    if (paramUserId) {
      localStorage.setItem('user_id', paramUserId)
    }

    // 2. If no user_id in localStorage, generate a random one
    let storedId = localStorage.getItem('user_id')
    if (!storedId) {
      storedId = crypto.randomUUID()
      localStorage.setItem('user_id', storedId)
    }

    // 3. Try to fetch existing row for this ID
    fetchMyRow(storedId).catch(console.error)
  }, [])

  // Attempt to retrieve existing quiz record
  const fetchMyRow = async (uId: string) => {
    const { data: myRow, error } = await supabase
      .from('quiz_responses')
      .select('*')
      .eq('user_id', uId)
      .single()

    if (error || !myRow) return

    // We have a row for this user
    setUserName(myRow.user_name || '')
    setPhone(myRow.phone || '')
    setHasSubmitted(true)

    // If you want them to see previous answers, you'd store them in DB as well. 
    // For brevity, not shown here.
    // Then fetch matches
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

    // Sort by ascending distance
    const sorted = [...others].sort((a, b) => calcDistance(myRow, a) - calcDistance(myRow, b))
    setTopMatches(sorted.slice(0, 3))
  }

  const calcDistance = (a: QuizResponse, b: QuizResponse) => {
    // Euclidean distance across 7 categories
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

    // 1. Calculate scores from answers
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
      if (ans) {
        scores[ans] += 2 // or +1 if you prefer
      }
    })

    // 2. Upsert
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

    // fetch my row
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
    <div style={{ padding: '1rem' }}>
      <h1>Valentine's Quiz (No Password Auth)</h1>

      {!hasSubmitted && (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label>
              Nome:
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                required
              />
            </label>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label>
              Insta:
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
            <small style={{ display: 'block' }}>
              (Opcional, para os teus matches poderem falar contigo)
            </small>
          </div>

          {quizData.map((q, i) => (
            <div key={i} style={{ margin: '1rem 0' }}>
              <h3>{q.question}</h3>
              {q.answers.map((ans, ansIndex) => (
                <label key={ansIndex} style={{ display: 'block' }}>
                  <input
                    type="radio"
                    name={`question-${i}`}
                    value={ans.value}
                    checked={answers[i] === ans.value}
                    onChange={() => handleAnswerChange(i, ans.value)}
                    required
                  />
                  {ans.label}
                </label>
              ))}
            </div>
          ))}

          <button type="submit">Submit Quiz</button>
        </form>
      )}

      {hasSubmitted && (
        <div>
          <p>Thanks for submitting, <strong>{userName}</strong>!</p>
          <button onClick={handleRefreshMatches}>Refresh Matches</button>

          {topMatches.length > 0 ? (
            <div style={{ marginTop: '1rem' }}>
              <h2>Your Top 3 Matches</h2>
              {topMatches.map(match => (
                <div key={match.id} style={{ border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem' }}>
                  <p><strong>Name:</strong> {match.user_name || 'Unknown'}</p>
                  <p><strong>Insta:</strong> {match.phone || 'N/A'}</p>
                  {/* You could show how close the match is or other info */}
                </div>
              ))}
            </div>
          ) : (
            <p>No matches yet. Wait for more people to join!</p>
          )}
          <p style={{ marginTop: '1rem' }}>
            O teu link partilhável: <br />
            <code>{window.location.origin}?u={localStorage.getItem('user_id')}</code>
          </p>
          <small>(Podes usar esse link para ver os teus resultados noutro dispositivo)</small>
        </div>
      )}
    </div>
  )
}

export default App
