import type { AuthSession, User } from '../types'
import { apiRequest } from './client'

interface LoginResponse {
  access_token: string
  token_type: string
  user: User
}

export async function login(email: string, password: string): Promise<AuthSession> {
  const response = await apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

  return {
    token: response.access_token,
    user: response.user,
  }
}
