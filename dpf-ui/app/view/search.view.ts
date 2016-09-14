import { Component, OnInit, Input, Inject, ChangeDetectorRef } from '@angular/core';
import { Control, CORE_DIRECTIVES, FORM_DIRECTIVES } from '@angular/common';
import { Observable } from 'rxjs/Observable';

import { config } from '../app.config';

import {
  RepositoryService, Repository,
  DicoogleService, TransferService, IPatientTransfer
} from '../app.imports';

@Component({
  selector: 'search-view',
  templateUrl: './app/view/search.view.html',
  directives: [CORE_DIRECTIVES, FORM_DIRECTIVES],
  styles: ['.main.menu { margin: 60px 20px 5px; }']
})
export class SearchView implements OnInit {
  srvPointsRepo: Repository

  query = new Control()
  allSelected = false
  
  patients = []
  tags = {}

  constructor(
    private ref: ChangeDetectorRef,
    private repoSrv: RepositoryService,
    private dicoogleSrv: DicoogleService,
    private trfSrv: TransferService
  ) {
    this.initSearch()

    this.srvPointsRepo = repoSrv.get('srv-points')
    this.srvPointsRepo
      .on('add', _ => _.data.icon = true)
      .init({ id: '0', data: { name: 'Download' }})
      .defaultSelect('0')
  }

  initSearch() {
    let patients = this.dicoogleSrv.search(this.query.valueChanges, results => {
      results.forEach(patient => {
        patient.open = false
        patient.selected = false
        patient.transfer = false
        patient.nTransferred = 0
        patient.nTotal = 0
        patient.studies.forEach(study => {
          study.open = false
          study.series.forEach(serie => {
            serie.open = false
            serie.images.forEach(image => {
              patient.nTotal += 1
              image.url = 'http://' + config.dicoogleHost + '/dic2png?SOPInstanceUID=' + image.sopInstanceUID
            })
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
        this.srvPointsRepo.select(srvID)
      }
    })
  }

  toggleSerie(serie: any) {
    serie.open = !serie.open
    serie.images.forEach(image => this.tags[image.sopInstanceUID] = this.dicoogleSrv.tagsFor(image.sopInstanceUID))
  }

  openImagePopup(uid: string) {
    console.log('openImagePopup: ', uid)
    let imagePopup: any = $('i[id="image_link_' + uid + '"]')
    imagePopup.popup({
      position: 'right center',
      lastResort: 'right center',
      popup: $('div[id="image_' + uid + '"]')
    })

    imagePopup.popup('show')
  }

  closeImagePopup(uid: string) {
    console.log('closeImagePopup: ', uid)
    let imagePopup: any = $('i[id="image_link_' + uid + '"]')
    imagePopup.popup('hide')
  }

  openTagsModel(uid: string) {
    let tagsModal: any = $('div[id="tags_' + uid + '"]')
    tagsModal.modal('show')
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
    if (this.srvPointsRepo.selected.id !== '0') {
      //let modal: any = $('.ui.modal')
      //modal.modal('setting', 'onApprove', _ => {
        let selectedPts = this.patients.filter(_ => _.selected == true)
        selectedPts.forEach(_ => _.nTransferred = 0)

        let selectedIds = selectedPts.map(_ => _.id)
        this.trfSrv.transferPatients(selectedIds, this.srvPointsRepo.selected.id).then(obs => {
            toastr.success('Transfer request submitted')
            obs.subscribe(
              notif => this.onTransferredNotif(notif),
              error => toastr.error(error)
            )
        }).catch(error => toastr.error(error.message))
      //})

      //modal.modal('show')
    }
  }

  onTransferredNotif(notif: IPatientTransfer) {
    console.log('onTransferredNotif: ', notif)

    let pChanged = this.patients.find(_ => _.id === notif.id)
    pChanged.transfer = true
    this.ref.detectChanges()

    let pBar: any = $('#progress_' + pChanged.id)
    if (notif.error) {
      toastr.error('Transfer problem: ' + notif.error)
      pBar.addClass('error')
      return
    }

    pChanged.nTransferred++
    pBar.progress({
      label: 'ratio',
      text: { ratio: '{value} of {total}' },
      value: pChanged.nTransferred,
      total: pChanged.nTotal
    })
  }
}