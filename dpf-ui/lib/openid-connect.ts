export class OIDC {
  static discover(url: string): Promise<OIDCIssuer> {
    return new Promise<OIDCIssuer>((resolve, reject) => {
      $.ajax(url + '.well-known/openid-configuration')
        .done(res => resolve(new OIDCIssuer(res)))
        .fail(error => reject(error))
    })
  }
}

export class OIDCIssuer {
  constructor(public discover: DiscoverResponse) {}

  createClient(clientId: string): OIDCClient {
    return new OIDCClient(this, clientId)
  }
}

export class OIDCClient {
  private redirectUri: string

  private authEndpoint: string
  private userInfoEndpoint: string
  private endSessionEndpoint: string

  authHeader: string
  authInfo: AuthInfoResponse

  constructor(private issuer: OIDCIssuer, private clientId: string) {
    //TODO: use UUID for nonce ?
    let nonce = 'xpto'

    this.redirectUri = window.location.protocol + '//' + window.location.host + '/'

    this.authEndpoint = issuer.discover.authorization_endpoint + '?scope=email+openid&response_type=token+id_token&nonce=' + nonce + '&redirect_uri=' + this.redirectUri + '&client_id=' + clientId
    this.userInfoEndpoint = issuer.discover.userinfo_endpoint
    this.endSessionEndpoint = issuer.discover.end_session_endpoint

    //load from cookies...
    let authCookie = Cookies.get(clientId)
    if (authCookie) {
      let parsedCookie = JSON.parse(authCookie)
      if (parsedCookie.access_token) {
        this.authInfo = parsedCookie
        this.setAuthHeader()
      }
    }
  }

  login(): Promise<AuthInfoResponse> {
    return this.idpRequest(this.authEndpoint).then(hash => {
      console.log('Logged in...')
      this.authInfo = parseHash(hash)
      Cookies.set(this.clientId, JSON.stringify(this.authInfo))
      this.setAuthHeader()
      return this.authInfo
    })
  }

  logout(): void {
    let logoutURL = this.endSessionEndpoint + '?id_token_hint=' + this.authInfo.id_token + '&post_logout_redirect_uri=' + this.redirectUri
    this.clear()

    this.idpRequest(logoutURL).then(_ => console.log('Logged out...'))
  }

  userInfo(): Promise<UserInfoResponse> {
    return new Promise<UserInfoResponse>((resolve, reject) => {
      $.ajax({ headers: { 'Authorization': this.authHeader }, url: this.userInfoEndpoint})
        .done(res => resolve(res))
        .fail(error => {
          this.clear()
          reject(error)
        })
    })
  }

  private clear() {
    Cookies.remove(this.clientId)
    delete this.authHeader
    delete this.authInfo
  }

  private idpRequest(url: string) {
    return new Promise<string>((resolve, reject) => {
      console.log('IDP Request: ', url)
      let authWin = window.open(url, 'OAuth2', 'height=500,width=550')
      let intervalId = setInterval(_ => {
        if (!authWin) {
          clearInterval(intervalId)
          reject('Request not completed!')
        }

        try {
          if (authWin.location.hostname === window.location.hostname) {
            console.log(authWin.location)
            clearInterval(intervalId)
            let hash = authWin.location.hash
            authWin.close()
            resolve(hash)
          }
        } catch(error) {
          /*ignore error, this means that login/logout is not ready*/
        }
      })
    })
  }

  private setAuthHeader() {
    this.authHeader = this.authInfo.token_type + ' ' + this.authInfo.access_token
  }
}

interface DiscoverResponse {
 issuer: string
 
 authorization_endpoint: string
 end_session_endpoint: string

 token_endpoint: string
 userinfo_endpoint: string
 
 jwks_uri: string
}

interface AuthInfoResponse {
  access_token: string
  expires_in: string
  id_token: string
  token_type: string
}

interface UserInfoResponse {
  email: string
  email_verified: boolean
  name: string
  picture: string
}

function parseHash(hash: string) {
  let parts = hash.substring(1).split('&')
  let hashMap = {}
  parts.forEach(kv => {
    let tuple = kv.split('=')
    hashMap[tuple[0]] = tuple[1]
  })

  return hashMap as AuthInfoResponse
}