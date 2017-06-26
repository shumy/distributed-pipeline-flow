import { Component, OnInit, Input, ChangeDetectorRef }  from '@angular/core';
import { FormControl }                                  from '@angular/forms';

import { UUID, ClientRouter }                           from 'rts-ts-client';
import { environment as config }                        from '../../environments/environment';

import { TransferProxy, IPatientTransfer }              from '../srv/transfer.srv';

@Component({
  selector: 'search2-view',
  templateUrl: 'search2.view.html',
  styles: ['.main.menu { margin: 60px 20px 5px; }']
})
export class Search2View {
  private searchSrv: any
  private trfSrv: any

  query = new FormControl()
  allSelected = false
  selectedNumber = 0

  images = []

  constructor(router: ClientRouter, private ref: ChangeDetectorRef) {
    this.searchSrv = router.createProxy('search')
    this.trfSrv = router.createProxy('transfers')

    this.query.valueChanges.debounceTime(400).distinctUntilChanged()
      .subscribe(tQuery => {
        console.log('QUERY: ', tQuery)
        this.searchSrv.search(tQuery).then(results => {
          console.log('RESULT: ', results.length)
          results.forEach(image => {
            image.selected = false
            image.open = false
            image.transferred = false
            image.url = config.base + '/proxy/dic2png/' + image.uid
          })

          //save selected data
          this.images = this.images.filter(_ => _.selected)

          //filter results non existent in pre-selected
          let newData = results.filter(newI => this.images.filter(_ => _.uid == newI.uid).length == 0)
          this.images.push(...newData)

        }).catch(error => toastr.error(error.message))
      })
  }

  openImagePopup(uid: string) {
    let imagePopup: any = $('i[id="image_link_' + uid + '"]')
    imagePopup.popup({
      inline: true,
      hoverable: true,
      position: 'bottom left',
      boundary: '.ui.content.segment'
    })
      
    imagePopup.popup('show')
  }

  selectAll() {
    this.allSelected = !this.allSelected
    this.selectedNumber = this.allSelected ? this.images.length : 0
    this.images.forEach(_ => _.selected = this.allSelected)
  }

  selectImage(image: any) {
    image.selected = !image.selected
    image.selected ? this.selectedNumber++ : this.selectedNumber--
    this.allSelected = this.selectedNumber == this.images.length
  }

  transfer() {
    let selectedImages = this.images.filter(_ => _.selected == true)
    let selectedUIDs = selectedImages.map(_ => _.uid)

    selectedImages.forEach(_ => _.transferred = false)
    this.ref.detectChanges()
    
    let fileName = UUID.generate()
    this.trfSrv.downloadImages(selectedUIDs, fileName).then(obs => {
      toastr.success('Building zip file...')
      obs.subscribe(
        notif => this.onTransferredNotif(notif),
        error => toastr.error(error.message),
        _ => {
          let uri = config.base + '/file-download/' + fileName + '.zip'
          window.location.href = uri
          toastr.success('Downloading file...')
        }
      )
    }).catch(error => toastr.error(error.message))
  }

  onTransferredNotif(notif: any) {
    console.log('onTransferredNotif: ', notif)
    if (notif.error) {
      toastr.error('Transfer problem: ' + notif.error)
      return
    }

    let pChanged = this.images.find(_ => _.uid === notif.id)
    pChanged.transferred = true
    this.ref.detectChanges()
  }
}