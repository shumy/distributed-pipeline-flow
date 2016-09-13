import { IAuthManager, AuthInfo, UserInfo, ChangeEvent } from '../app.imports';
import { OIDC, OIDCClient } from '../../lib/openid-connect'

export class AuthService implements IAuthManager {
  _client: OIDCClient
  _onChange: (evt: ChangeEvent) => void

  public isLogged = false
  public authInfo: AuthInfo
  public userInfo: UserInfo

  constructor(private idp: string, private clientId: string) {
    OIDC.discover(idp).then(issuer => {
      this._client = issuer.createClient(clientId)
      if (this._client.authInfo) {
        this.setAuthInfo()
        this.setUserInfo()
      }
    })
  }

  login() {
    this._client.login().then(info => {
      console.log('AuthInfo: ', info)
      this.setAuthInfo()
      this.setUserInfo()
    }, e => {
      console.error('Login: ', e.error)
      this.setLogout()
    })
  }

  logout() {
    this.setLogout()
    this._client.logout()
  }

  onChange(callback: (evt: ChangeEvent) => void) {
    this._onChange = callback
  }

  private setUserInfo() {
    this._client.userInfo().then((info) => {
      console.log('UserInfo: ', info)
      this.userInfo = { name: info.name, email: info.email, avatar: info.picture }
      if (!this.userInfo.avatar)
        this.userInfo.avatar = 'res/img/default_user.png'
      
      this.setLogin()
    }, e => {
      console.error('UserInfo: ', e.error)
      this.setLogout()
    })
  }

  private setAuthInfo() {
    let authResp = this._client.authInfo
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