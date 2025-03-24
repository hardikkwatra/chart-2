export interface Badge {
  id: string
  name: string
  icon: string
}

export interface User {
  id: string
  username: string
  profileImageUrl: string
  twitterScore: number
  walletScore: number
  telegramScore: number
  totalScore: number
  badges: Badge[]
  isVerified: boolean
}

export interface TempUser {
  id: string
  username: string
  profileImageUrl: string
  twitterScore: number
  totalScore: number
  badges: Badge[]
}

