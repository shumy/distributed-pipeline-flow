import { Component }                    from '@angular/core';
import { Router }                       from '@angular/router';
import { ClientRouter, IAuthManager }   from 'rts-ts-client';

declare var toastr: any

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
    this.auth.onChange(_ => this.navigateToDefaultUI())
  }

  navigateToDefaultUI() {
    // default order (search, annotate, upload)
    if (this.auth.isLogged) {
      let groups = this.auth.userInfo.groups || []
      let uiGroups = groups.filter(_ => _.startsWith('/ui-'))
      if (uiGroups.indexOf('/ui-search') !== -1)
        this.wRouter.navigate(['search'])
      else if (uiGroups.indexOf('/ui-annotate') !== -1)
        this.wRouter.navigate(['annotate'])
      else if (uiGroups.indexOf('/ui-upload') !== -1)
        this.wRouter.navigate(['upload'])
      else {
        toastr.error('No UI groups in your account!')
      }
    }
  }
}