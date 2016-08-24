import { Component, OnInit, Input, Inject, ChangeDetectorRef } from '@angular/core';
import { Control, CORE_DIRECTIVES, FORM_DIRECTIVES } from '@angular/common';
import { Observable } from 'rxjs/Observable';

import {
  DicoogleService, TransferService,
  ServicePointToken, ServicePointService, IPatientTransfer
} from '../srv/services';

@Component({
  selector: 'search-view',
  templateUrl: './app/view/search.view.html',
  directives: [CORE_DIRECTIVES, FORM_DIRECTIVES],
  styles: ['.main.menu { margin: 60px 20px 5px; }']
})
export class SearchView implements OnInit {
  selectedSrvPoint: any = { id: 0, name: 'Download', selected: true }
  srvPoints = [ this.selectedSrvPoint ]

  query = new Control()
  allSelected = false
  patients = []

  constructor(
    private ref: ChangeDetectorRef,
    private dicoogleSrv: DicoogleService,
    private trfSrv: TransferService,
    @Inject(ServicePointToken) private srvPointSrv: ServicePointService
  ) {
    this.initSearch()

    this.srvPointSrv.srvPoints()
      .then(_ => _.forEach(sp => this.srvPoints.push({ id: sp.id, name: sp.name, icon: true })))
      .catch(error => console.log('ERROR requesting service-point: ', error))
  }

  initSearch() {
    let patients = this.dicoogleSrv.search(this.query.valueChanges, results => {
      results.forEach(patient => {
        patient.open = false
        patient.selected = false
        patient.nTransferred = 0
        patient.nTotal = 0
        patient.studies.forEach(study => {
          study.open = false
          study.series.forEach(serie => {
            serie.open = false
            serie.images.forEach(image => patient.nTotal += 1)
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
    }, error => {
      toastr.error('Dicoogle query error: ' + error)
      this.initSearch()
    })
  }

  ngOnInit() {
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
    if (this.selectedSrvPoint.id != 0) {
      let modal: any = $('.ui.modal')
      modal.modal('setting', 'onApprove', _ => {
        let patientIds = this.patients.filter(_ => _.selected == true).map(_ => _.id)
        this.trfSrv.transferPatients(patientIds, this.selectedSrvPoint.id)
          .then(obs => {
            toastr.success('Dataset submitted')
            obs.subscribe(notif => this.onTransferred(notif))
          })
          .catch(error => toastr.error(error.message))
      })

      modal.modal('show')
    }
  }

  onTransferred(notif: IPatientTransfer) {
    console.log('TRANFERRED: ', notif)
    let pChanged = this.patients.find(_ => _.id === notif.id)
      
    pChanged.nTransferred += notif.value
    this.ref.detectChanges()

    let pBar: any = $('#progress_' + pChanged.id)
    if (notif.error) {
      toastr.error('Transfer problem in patient: ' + pChanged.id)
      pBar.addClass('error')
      return
    }

    pBar.progress({
      label: 'ratio',
      text: { ratio: '{value} of {total}' },
      value: pChanged.nTransferred,
      total: pChanged.nTotal
    })
  }
}