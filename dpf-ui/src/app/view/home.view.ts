import { Component }                    from '@angular/core';
import { Router }                       from '@angular/router';
import { ClientRouter, IAuthManager }   from 'rts-ts-client';

@Component({
  selector: 'home-view',
  templateUrl: 'home.view.html'
})
export class HomeView {
  auth: IAuthManager
  menu = 0
  
  constructor(private wRouter: Router, router: ClientRouter) {
    this.auth = router.authMgr
  }

  start() {
    this.auth.login()
    this.auth.onChange((evt) => {
      this.wRouter.navigate(['search'])
    })
  }
}