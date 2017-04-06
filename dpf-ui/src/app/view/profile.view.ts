import { Component } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { environment as config } from '../../environments/environment';

@Component({
  selector: 'profile',
  templateUrl: 'profile.view.html',
  styles: ['.main.menu { margin: 60px 20px 5px; }']
})
export class ProfileView {
  profile: SafeResourceUrl
  
  constructor(private sanitizer:DomSanitizer) {}
  
  ngOnInit() {
    this.profile = this.sanitizer.bypassSecurityTrustResourceUrl(config.authProfile)
  }
}