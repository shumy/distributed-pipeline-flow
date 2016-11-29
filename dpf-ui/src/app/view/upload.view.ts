import { Component } from '@angular/core';

import { ClientRouter }  from 'rts-ts-client';

@Component({
  selector: 'upload-view',
  templateUrl: 'upload.view.html',
  styles: ['.main.menu { margin: 60px 20px 5px; }']
})
export class UploadView {
  constructor (private router: ClientRouter) {}

  ngOnInit() {
    let token = 'Bearer ' + this.router.authMgr.authInfo.token
    let drop = new Dropzone('div#dropzone', { url: '/file-upload', headers: { "Authorization": token } })
    //let drop = new Dropzone('div#dropzone', { url: 'http://localhost:8080/stow' })
  }
}