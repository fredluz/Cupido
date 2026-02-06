export type Category = 'Romantic' | 'Adventurous' | 'Intellectual' | 'Creative' | 'Chill' | 'Social' | 'Ambitious'

export type Gender = 'm' | 'f'
export type LookingFor = 'm' | 'f' | 'mf'
export type StudyYear = 'year_1' | 'year_2' | 'year_3'

export interface QuizQuestion {
  question: string
  answers: {
    label: string
    value: Category
  }[]
}

export interface QuizResponse {
  id?: number
  user_id?: string
  user_name?: string
  phone?: string
  course_code?: string
  study_year?: StudyYear
  romantic: number
  adventurous: number
  intellectual: number
  creative: number
  chill: number
  social: number
  ambitious: number
  compatibility?: number
  is_mutual_top3?: boolean
  rank?: number
  gender: Gender
  looking_for: LookingFor
}

export interface MatchEdge {
  id: number
  user_a_id: string
  user_b_id: string
  compatibility_a_to_b: number
  compatibility_b_to_a: number
  is_mutual_top3: boolean
  created_at?: string
  updated_at?: string
}

export interface ChatThread {
  id: string
  user_a_id: string
  user_b_id: string
  created_at: string
  revealed_at: string | null
}

export interface ChatMessage {
  id: number
  thread_id: string
  sender_user_id: string
  body: string
  created_at: string
}

export interface AppSetting {
  id: number
  reveal_enabled: boolean
  revealed_at: string | null
  updated_at?: string
}
