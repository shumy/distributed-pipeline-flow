export type ChangeEvent = 'login' | 'logout'

export interface AuthInfo {  
  type: string
  token: string
  idp?: string
}

export interface UserInfo {
  name: string
  email: string
  avatar: string
}

export interface IAuthManager {
  isLogged: boolean
  authInfo: AuthInfo
  userInfo: UserInfo
  
  login(): void
  logout(): void

  onChange(callback: (evt: ChangeEvent) => void)
}