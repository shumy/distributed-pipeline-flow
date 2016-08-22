import { Component, OnInit, Input, Inject, ChangeDetectorRef } from '@angular/core';
import { Control, CORE_DIRECTIVES, FORM_DIRECTIVES } from '@angular/common';
import { Observable } from 'rxjs/Observable';

import {
  DicoogleService, SubscriberService, TransferService,
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
    private subsSrv: SubscriberService,
    private trfSrv: TransferService,
    @Inject(ServicePointToken) private srvPointSrv: ServicePointService
  ) {
    this.initSearch()

    this.srvPointSrv.srvPoints()
      .then(_ => _.forEach(sp => this.srvPoints.push({ id: sp.id, name: sp.name, icon: true })))
      .catch(error => console.log('ERROR requesting service-point: ', error))

    this.subsSrv.subscribe('patientTransfersObserver')
      .then(_ => _.subscribe(change => this.onChange(change)))
      .catch(error => console.log('ERROR requesting subscription: ', error))
  }

  initSearch() {
    let patients = this.dicoogleSrv.search(this.query.valueChanges, results => {
      results.forEach(patient => {
        patient.open = false
        patient.selected = false
        patient.transfer = false
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
          .then(_ => toastr.success('Dataset submitted'))
          .catch(error => toastr.error(error.message))
      })

      modal.modal('show')
    }
  }

  onChange(change: any) {
    console.log('CHANGE: ', change)
    let transfer = change.data as IPatientTransfer
    let pChanged = this.patients.find(_ => _.id === transfer.id)
    if (change.oper === 'put') {
      pChanged.transfer = true
      this.ref.detectChanges()

      let pBar: any = $('#progress_' + pChanged.id)
      if (change.error) {
        toastr.error('Transfer problem in patient: ' + pChanged.id)
        pBar.addClass('error')
        return
      }

      pBar.progress({
        label: 'ratio',
        text: { ratio: '{value} of {total}' },
        value: transfer.value,
        total: transfer.total
      })
    }
  }
}