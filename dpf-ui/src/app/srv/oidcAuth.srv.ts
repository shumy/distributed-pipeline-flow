import { IAuthManager, AuthInfo, UserInfo, ChangeEvent } from 'rts-ts-client';
import { OIDC, OIDCClient } from 'rts-ts-client'

export class AuthService implements IAuthManager {
  _client: OIDCClient
  _onChange: (evt: ChangeEvent) => void

  public isLogged = false
  public authInfo: AuthInfo
  public userInfo: UserInfo

  constructor(private idp: string, private clientId: string) {}

  load() {
    return new Promise<boolean>((resolve) => {
      OIDC.discover(this.idp).then(issuer => {
        this._client = issuer.createClient(this.clientId)
        if (this._client.authInfo) {
          this.setAuthInfo()
          this.setUserInfo().then(_ => resolve(_))
        } else {
          resolve(false)
        }
      }, error => {
        console.error('IDP discover: ', error)
        resolve(false)
      })
    })
  }

  login() {
    this._client.login().then(info => {
      console.log('AuthInfo: ', info)
      this.setAuthInfo()
      this.setUserInfo()
    }, error => {
      console.error('Login: ', error)
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
    return new Promise<boolean>((resolve) => {
      this._client.userInfo().then(info => {
        console.log('UserInfo: ', info)
        this.userInfo = { name: info.name, email: info.email, avatar: info.picture, groups: info.groups }
        if (!this.userInfo.avatar)
          this.userInfo.avatar = 'assets/img/default_user.png'
        
        this.setLogin()
        resolve(true)
      }, error => {
        console.log('UserInfo: ', error)
        this.setLogout()
        resolve(false)
      })
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