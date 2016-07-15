import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'search-view',
  templateUrl: './app/view/search.view.html',
  styles: ['.main.menu { margin: 60px 20px 5px; }']
})
export class SearchView implements OnInit {
  selectedSrvPoint: any = { id: 1, name: 'Download', selected: true }
  srvPoints = [
    this.selectedSrvPoint,
    { id: 2, name: 'SP 1', icon: true },
    { id: 3, name: 'SP 2', icon: true },
    { id: 4, name: 'SP 3', icon: true }
  ]

  jQueryInit() {
    console.log('jQueryInit')

    let pBars: any = $('.ui.progress')
    pBars.progress({
      label: 'ratio',
      text: { ratio: '{value} of {total}' }
    })

    let dropdown: any = $('.ui.dropdown')
    dropdown.dropdown({
      on: 'click',
      onChange: (text, value, selectedItem) => {
        this.select(selectedItem.attr('id'))
      }
    })
  }

  ngOnInit() {
    this.jQueryInit()
  }

  select(srvID: number) {
    let srv = this.srvPoints.find( _ => _.id == srvID )
    srv.selected = true
    this.selectedSrvPoint = srv
  }

  transfer() {
    if (this.selectedSrvPoint.id != 1) {
      let modal: any = $('.ui.modal')
      modal.modal('setting', 'onApprove', _ => {
        toastr.success('Dataset submitted')
      })

      modal.modal('show')
    }
  }
}