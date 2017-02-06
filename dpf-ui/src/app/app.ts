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

  ngOnInit() {
    if (this.auth.userInfo)
      console.log(this.auth.userInfo.groups)
  }

  contains(group: string): boolean {
    if (!this.auth.userInfo)
      return false

    return this.auth.userInfo.groups.indexOf(group) > 0
  }

  logout() {
    this.auth.logout()
    this.wRouter.navigate(['home'])
  }
}
