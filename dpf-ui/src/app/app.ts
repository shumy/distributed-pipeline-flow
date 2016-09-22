import { ChangeDetectorRef, Component } from '@angular/core';
import { ClientRouter, IAuthManager }   from 'rts-ts-client';

@Component({
  selector: 'body[app]',
  templateUrl: 'app.html'
})
export class Application {
  auth: IAuthManager
  
  constructor(ref: ChangeDetectorRef, router: ClientRouter) {
    this.auth = router.authMgr
    this.auth.onChange(_ => ref.detectChanges())
  }

  jQueryInit() {
    let modal: any = $('.ui.modal')
    modal.modal({
      closable: false,
      transition: 'fly down',
      offset: 2000
    })
  }

  ngOnInit() {
    this.jQueryInit()
    //let drop = new Dropzone('div#dropzone', { url: '/file-upload' })
  }
}