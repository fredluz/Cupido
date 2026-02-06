import { supabase } from '../supabaseClient'
import { Category, Gender, LookingFor, StudyYear } from '../types'

const SCORE_CATEGORIES: Category[] = [
  'Romantic',
  'Adventurous',
  'Intellectual',
  'Creative',
  'Chill',
  'Social',
  'Ambitious'
]

interface ScoreFields {
  romantic: number
  adventurous: number
  intellectual: number
  creative: number
  chill: number
  social: number
  ambitious: number
}

export interface MyProfile extends ScoreFields {
  user_id: string
  user_name: string
  phone: string
  gender: Gender | null
  looking_for: LookingFor | null
  course_code: string
  study_year: StudyYear | null
}

export interface BackendMatch {
  user_id: string
  user_name: string
  phone: string
  gender: Gender
  looking_for: LookingFor
  compatibility: number
  is_mutual_top3: boolean
  rank: number
}

interface SubmitQuizInput {
  userName: string
  phone: string
  gender: Gender
  lookingFor: LookingFor
  courseCode: string
  studyYear: StudyYear
  scores: ScoreFields
}

const defaultScores = (): ScoreFields => ({
  romantic: 0,
  adventurous: 0,
  intellectual: 0,
  creative: 0,
  chill: 0,
  social: 0,
  ambitious: 0
})

const parseGender = (value: unknown): Gender | null => {
  if (value === 'm' || value === 'f') return value
  return null
}

const parseLookingFor = (value: unknown): LookingFor | null => {
  if (value === 'm' || value === 'f' || value === 'mf') return value
  return null
}

const parseStudyYear = (value: unknown): StudyYear | null => {
  if (value === 'year_1' || value === 'year_2' || value === 'year_3') return value
  return null
}

const parseNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

const parseText = (value: unknown): string => {
  return typeof value === 'string' ? value : ''
}

const calculateScores = (answers: (Category | null)[]): ScoreFields => {
  const scores = SCORE_CATEGORIES.reduce(
    (acc, category) => {
      acc[category] = 0
      return acc
    },
    {} as Record<Category, number>
  )

  answers.forEach((answer) => {
    if (answer) {
      scores[answer] += 2
    }
  })

  return {
    romantic: scores.Romantic,
    adventurous: scores.Adventurous,
    intellectual: scores.Intellectual,
    creative: scores.Creative,
    chill: scores.Chill,
    social: scores.Social,
    ambitious: scores.Ambitious
  }
}

const normalizeMyProfile = (row: Record<string, unknown>): MyProfile => {
  const fallbackScores = defaultScores()

  return {
    user_id: parseText(row.user_id),
    user_name: parseText(row.user_name),
    phone: parseText(row.phone) || parseText(row.instagram_handle),
    gender: parseGender(row.gender),
    looking_for: parseLookingFor(row.looking_for),
    course_code: parseText(row.course_code),
    study_year: parseStudyYear(row.study_year),
    romantic: parseNumber(row.romantic ?? fallbackScores.romantic),
    adventurous: parseNumber(row.adventurous ?? fallbackScores.adventurous),
    intellectual: parseNumber(row.intellectual ?? fallbackScores.intellectual),
    creative: parseNumber(row.creative ?? fallbackScores.creative),
    chill: parseNumber(row.chill ?? fallbackScores.chill),
    social: parseNumber(row.social ?? fallbackScores.social),
    ambitious: parseNumber(row.ambitious ?? fallbackScores.ambitious)
  }
}

const toSubmitPayload = (input: SubmitQuizInput) => ({
  user_name: input.userName,
  phone: input.phone,
  instagram_handle: input.phone,
  gender: input.gender,
  looking_for: input.lookingFor,
  course_code: input.courseCode,
  study_year: input.studyYear,
  romantic: input.scores.romantic,
  adventurous: input.scores.adventurous,
  intellectual: input.scores.intellectual,
  creative: input.scores.creative,
  chill: input.scores.chill,
  social: input.scores.social,
  ambitious: input.scores.ambitious
})

const normalizeMatches = (value: unknown): BackendMatch[] => {
  if (!Array.isArray(value)) return []

  return value
    .map((rawMatch, index) => {
      if (!rawMatch || typeof rawMatch !== 'object') return null

      const match = rawMatch as Record<string, unknown>
      const userId = parseText(match.user_id)
      const gender = parseGender(match.gender)
      const lookingFor = parseLookingFor(match.looking_for)

      if (!userId || !gender || !lookingFor) {
        return null
      }

      return {
        user_id: userId,
        user_name: parseText(match.user_name),
        phone: parseText(match.phone) || parseText(match.instagram_handle),
        gender,
        looking_for: lookingFor,
        compatibility: parseNumber(match.compatibility),
        is_mutual_top3: Boolean(match.is_mutual_top3),
        rank: parseNumber(match.rank) || index + 1
      }
    })
    .filter((match): match is BackendMatch => match !== null)
}

const submitQuizAndReadMatches = async (input: SubmitQuizInput): Promise<BackendMatch[]> => {
  const { data, error } = await supabase.rpc('submit_quiz_and_refresh_matches', {
    payload: toSubmitPayload(input)
  })

  if (error) {
    throw error
  }

  const response = (data ?? {}) as Record<string, unknown>
  const topMatches = normalizeMatches(response.top_matches)

  if (topMatches.length > 0) {
    return topMatches
  }

  return normalizeMatches(response.matches)
}

export const getMyProfile = async (userId: string): Promise<MyProfile | null> => {
  const { data, error } = await supabase
    .from('quiz_responses')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  return normalizeMyProfile(data as Record<string, unknown>)
}

export const submitQuiz = async (input: {
  userName: string
  phone: string
  gender: Gender
  lookingFor: LookingFor
  courseCode: string
  studyYear: StudyYear
  answers: (Category | null)[]
}): Promise<BackendMatch[]> => {
  return submitQuizAndReadMatches({
    userName: input.userName,
    phone: input.phone,
    gender: input.gender,
    lookingFor: input.lookingFor,
    courseCode: input.courseCode,
    studyYear: input.studyYear,
    scores: calculateScores(input.answers)
  })
}

export const getMatches = async (profile: MyProfile): Promise<BackendMatch[]> => {
  if (!profile.gender || !profile.looking_for) {
    return []
  }

  return submitQuizAndReadMatches({
    userName: profile.user_name,
    phone: profile.phone,
    gender: profile.gender,
    lookingFor: profile.looking_for,
    courseCode: profile.course_code,
    studyYear: profile.study_year ?? 'year_1',
    scores: {
      romantic: profile.romantic,
      adventurous: profile.adventurous,
      intellectual: profile.intellectual,
      creative: profile.creative,
      chill: profile.chill,
      social: profile.social,
      ambitious: profile.ambitious
    }
  })
}
