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
  private authEndpoint: string
  private userInfoEndpoint: string
  private revogationEndpoint: string

  authHeader: string
  authInfo: AuthInfoResponse

  constructor(issuer: OIDCIssuer , clientId: string) {
    //TODO: use UUID for nonce ?
    let nonce = 'xpto'

    let redirectUri = window.location.protocol + '//' + window.location.host + '/'

    this.authEndpoint = issuer.discover.authorization_endpoint + '?scope=email+openid&response_type=token+id_token&nonce=' + nonce + '&redirect_uri=' + redirectUri + '&client_id=' + clientId
    this.userInfoEndpoint = issuer.discover.userinfo_endpoint
    this.revogationEndpoint = issuer.discover.revocation_endpoint
  }

  login(): Promise<AuthInfoResponse> {
    return new Promise<AuthInfoResponse>((resolve, reject) => {
      let authWin = window.open(this.authEndpoint, 'OAuth2', 'height=500,width=550')
      let intervalId = setInterval(_ => {
        if (!authWin) {
          clearInterval(intervalId)
          reject('Login not completed!')
        }

        try {
          if (authWin.location.hash) {
            clearInterval(intervalId)
            this.authInfo = parseHash(authWin.location.hash)
            this.authHeader = this.authInfo.token_type + ' ' + this.authInfo.access_token

            authWin.close()
            resolve(this.authInfo)
          }
        } catch(error) {
          console.log('Waiting for login...')
        }
      })
    })
  }

  logout(): void {
    $.ajax({ url: this.revogationEndpoint, headers: { 'Authorization': this.authHeader }})
      .done(res => console.log('Logout: ', res))
    
    delete this.authHeader
    delete this.authInfo
  }

  userInfo(): Promise<UserInfoResponse> {
    return new Promise<UserInfoResponse>((resolve, reject) => {
      $.ajax({ url: this.userInfoEndpoint, headers: { 'Authorization': this.authHeader }})
        .done(res => resolve(res))
        .fail(error => reject(error))
    })
  }
}

interface DiscoverResponse {
 issuer: string
 
 authorization_endpoint: string
 revocation_endpoint: string

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