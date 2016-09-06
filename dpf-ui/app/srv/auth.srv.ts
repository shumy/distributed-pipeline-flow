import { IAuthManager, AuthInfo, UserInfo, ChangeEvent } from '../../lib/src/rts-auth';

declare var hello: any

export class AuthService implements IAuthManager {
  _onChange: (evt: ChangeEvent) => void

  public isLogged = false
  public authInfo: AuthInfo
  public userInfo: UserInfo

  constructor(private idp: string, private clientId: string) {
    let clt = {}
    clt[this.idp] = this.clientId 
    
    hello.init(clt, { scope: 'email openid', response_type: 'token id_token' })

    let authResp = hello(this.idp).getAuthResponse()
    if (authResp) {
      console.log('AUTH: ', authResp)
      this.setAuthInfo()
      this.setUserInfo()
    }
  }

  login() {
    hello(this.idp).login().then(_ => {
      this.setAuthInfo()
      this.setUserInfo()
    }, e => {
      console.log('Login: ', e.error)
      this.setLogout()
    })
  }

  logout() {
    this.setLogout()

    hello(this.idp).logout().then(_ => {
    }, e => console.log('Logout: ', e.error))
  }

  onChange(callback: (evt: ChangeEvent) => void) {
    this._onChange = callback
  }

  private setUserInfo() {
    hello(this.idp).api('me').then((info) => {
      this.userInfo = { name: info.name, email: info.email, avatar: info.picture }
      this.setLogin()
    }, e => {
      console.error('UserInfo: ', e.error)
      this.setLogout()
    })
  }

  private setAuthInfo() {
    let authResp = hello(this.idp).getAuthResponse()
    this.authInfo = { auth: 'jwt', token: authResp.id_token }
  }

  private setLogin() {
    this.isLogged = true
    if (this._onChange)
      this._onChange('login')
  }

  private setLogout() {
    delete this.authInfo
    delete this.userInfo

    this.isLogged = false
    if (this._onChange)
      this._onChange('logout')
  }
}