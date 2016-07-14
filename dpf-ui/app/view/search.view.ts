import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'search-view',
  templateUrl: './app/view/search.view.html',
  styles: ['.main.menu { margin: 60px 20px 5px; }']
})
export class SearchView implements OnInit {
  modal: any

  selectedSrvPoint: any = { id: 1, name: 'Download', selected: true }
  srvPoints = [
    this.selectedSrvPoint,
    { id: 2, name: 'SP 1', icon: true },
    { id: 3, name: 'SP 2', icon: true },
    { id: 4, name: 'SP 3', icon: true }
  ]

  ngOnInit() {
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

    this.modal = $('.ui.modal')
    this.modal.modal({
      closable: false,
      transition: 'fly down',
      offset: 2000,
      onApprove : _ => {
        toastr.success('Dataset submitted')
      }
    })
  }

  select(srvID: number) {
    let srv = this.srvPoints.find( _ => _.id == srvID )
    srv.selected = true
    this.selectedSrvPoint = srv
  }

  transfer() {
    if (this.selectedSrvPoint.id != 1) {
      this.modal.modal('show')
    }
  }
}