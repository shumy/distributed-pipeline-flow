import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'results-view',
  templateUrl: 'results.view.html',
  styles: ['.main.menu { margin: 60px 20px 5px; }']
})
export class ResultsView implements OnInit {

  jQueryInit() {
    let pBars: any = $('.ui.progress')
    pBars.progress({
      label: 'ratio',
      text: { ratio: '{value} of {total}' }
    })
  }

  ngOnInit() {
    this.jQueryInit()
  }
}