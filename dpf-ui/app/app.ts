import { Component } from '@angular/core';
import Dropzone from 'dropzone';

@Component({
  selector: 'body[app]',
  templateUrl: './app/app.html'
})
export class Application {
  ngOnInit() {
    //console.log('INIT: ', Dropzone)
    
    var drop = new Dropzone('div#dropzone', { url: '/file-upload' })
    //console.log('INIT: ', drop)
  }
}