import { Component, OnInit, Input } from '@angular/core';
import { Control, CORE_DIRECTIVES, FORM_DIRECTIVES } from '@angular/common';
import { Observable } from 'rxjs/Observable';

import { DicoogleService, TransferService } from '../srv/services';

@Component({
  selector: 'search-view',
  templateUrl: './app/view/search.view.html',
  directives: [CORE_DIRECTIVES, FORM_DIRECTIVES],
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

  query = new Control()
  allSelected = false
  patients = []

  constructor(private dicoogleSrv: DicoogleService, private transferSrv: TransferService) {
    this.initSearch()

    transferSrv.srvPointObserver().then(obs => {
      obs.subscribe(_ => console.log('CHANGE: ', _))
    })
  }

  initSearch() {
    let patients = this.dicoogleSrv.search(this.query.valueChanges, results => {
      results.forEach(patient => {
        patient.nTransferred = 0
        patient.open = false
        patient.selected = false
        patient.studies.forEach(study => {
          study.open = false
          study.series.forEach(serie => {
            serie.open = false
          })
        })
      })
      return results
    })
    
    patients.subscribe(data => {
      //save selected data
      this.patients = this.patients.filter(_ => _.selected)
      
      //filter results non existent in pre-selected
      let newData = data.filter(newP => { if (this.patients.filter(_ => _.id == newP.id).length == 0) return true })
      this.patients.push(...newData)

      this.checkIfAllSelected()
      setTimeout(_ => this.jQueryProgressBars())
    }, error => {
      toastr.error('Dicoogle query error: ' + error)
      this.initSearch()
    })
  }

  ngOnInit() {
    this.jQueryProgressBars()

    let dropdown: any = $('.ui.dropdown')
    dropdown.dropdown({
      on: 'click',
      onChange: (text, value, selectedItem) => {
        let srvID = selectedItem.attr('id')
        let srv = this.srvPoints.find( _ => _.id == srvID )
        srv.selected = true
        this.selectedSrvPoint = srv
      }
    })
  }

  jQueryProgressBars() {
    let pBars: any = $('.ui.progress')
    pBars.progress({
      label: 'ratio',
      text: { ratio: '{value} of {total}' }
    })
  }

  checkIfAllSelected() {
    this.allSelected = this.patients.filter(_ => _.selected).length == this.patients.length
  }

  selectAll() {
    this.allSelected = !this.allSelected
    this.patients.forEach(_ => _.selected = this.allSelected)
  }

  selectPatient(patient: any) {
    patient.selected = !patient.selected
    this.checkIfAllSelected()
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