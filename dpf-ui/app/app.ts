import { Component } from '@angular/core';
import { ROUTER_DIRECTIVES } from '@angular/router';

@Component({
  selector: 'body[app]',
  directives: [ROUTER_DIRECTIVES],
  templateUrl: './app/app.html'
})
export class Application {
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