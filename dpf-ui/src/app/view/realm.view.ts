import { Component } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { environment as config } from '../../environments/environment';

@Component({
  selector: 'realm',
  templateUrl: 'realm.view.html',
  styles: ['.main.menu { margin: 60px 20px 5px; }']
})
export class RealmView {
  realm: SafeResourceUrl
  
  constructor(private sanitizer:DomSanitizer) {}
  
  ngOnInit() {
    this.realm = this.sanitizer.bypassSecurityTrustResourceUrl(config.authConsole)
  }
}