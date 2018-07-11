import { Component }                    from '@angular/core';
import { Router }                       from '@angular/router';
import { ClientRouter, IAuthManager }   from 'rts-ts-client';

@Component({
  selector: 'body[app]',
  templateUrl: 'app.html'
})
export class Application {
  auth: IAuthManager
  
  constructor(private wRouter: Router, router: ClientRouter) {
    this.auth = router.authMgr
  }

  showMenu() {
    let uri = this.wRouter.url.split('?')[0]
    return ['/home', '/image'].indexOf(uri) === -1
  }

  contains(group: string): boolean {
    if (!this.auth.userInfo)
      return false

    return this.auth.userInfo.groups.indexOf(group) > -1
  }

  logout() {
    console.log('Logging out...')
    this.auth.logout()
    this.wRouter.navigate(['home'])
  }
}
