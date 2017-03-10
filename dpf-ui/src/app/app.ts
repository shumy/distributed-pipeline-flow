import { Component }                    from '@angular/core';
import { Router }                       from '@angular/router';
import { ClientRouter, IAuthManager }   from 'rts-ts-client';
import { environment as config }        from '../environments/environment';

@Component({
  selector: 'body[app]',
  templateUrl: 'app.html'
})
export class Application {
  profile: string
  auth: IAuthManager
  
  constructor(private wRouter: Router, router: ClientRouter) {
    this.auth = router.authMgr
    this.profile = config.authProfile
  }

  showMenu() {
    return this.wRouter.url !== '/home'// && this.auth.isLogged
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
