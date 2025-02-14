export type Category = 'Romantic' | 'Adventurous' | 'Intellectual' | 'Creative' | 'Chill' | 'Social' | 'Ambitious'

export type Gender = 'm' | 'f'
export type LookingFor = 'm' | 'f' | 'mf'

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
  romantic: number
  adventurous: number
  intellectual: number
  creative: number
  chill: number
  social: number
  ambitious: number
  compatibility?: number
  gender: Gender
  looking_for: LookingFor
}
