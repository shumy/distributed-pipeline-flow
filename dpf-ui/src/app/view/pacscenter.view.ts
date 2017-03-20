import { Component } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { environment as config } from '../../environments/environment';

@Component({
  selector: 'pacs-center',
  templateUrl: 'pacscenter.view.html',
  styles: ['.main.menu { margin: 60px 20px 5px; }']
})
export class PacsCenterView {
  viewer: SafeResourceUrl
  
  constructor(private sanitizer:DomSanitizer) {}
  
  ngOnInit() {
    this.viewer = this.sanitizer.bypassSecurityTrustResourceUrl(config.viewer)
  }
}