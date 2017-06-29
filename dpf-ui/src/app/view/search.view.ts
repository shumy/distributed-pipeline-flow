import { Component, OnInit, Input, ChangeDetectorRef }  from '@angular/core';
import { FormControl }                                  from '@angular/forms';

import { UUID, ClientRouter }                           from 'rts-ts-client';
import { environment as config }                        from '../../environments/environment';

@Component({
  selector: 'search-view',
  templateUrl: 'search.view.html',
  styles: ['.main.menu { margin: 60px 20px 5px; }']
})
export class SearchView {
  private searchSrv: any
  private trfSrv: any
  private folderMngSrv: any

  query = new FormControl()
  allSelected = false
  selectedNumber = 0

  images = []
  pages = [0]
  pageSize = 10
  selectedPage = 0

  dataTypes = ['dcm']

  constructor(router: ClientRouter, private ref: ChangeDetectorRef) {
    this.searchSrv = router.createProxy('search')
    this.trfSrv = router.createProxy('transfers')
    this.folderMngSrv = router.createProxy('folder-manager')

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

          //calculate pages
          this.changePageSize(this.pageSize)

        }).catch(error => toastr.error(error.message))
      })
  }

  ngAfterContentInit() {
    let drop: any = $('.ui.dropdown')
    drop.dropdown({
      onChange: (text) => {
        this.dataTypes = text.split(',').filter(el => el.length > 0)
      }
    })

    drop.dropdown('set exactly', this.dataTypes)
  }

  openImagePopup(uid: string) {
    let imagePopup: any = $('i[id="image_link_' + uid + '"]')
    imagePopup.popup({
      inline: true,
      hoverable: true,
      position: 'bottom left',
      lastResort: 'bottom left'//,
      //boundary: '.ui.content.segment'
    })
      
    imagePopup.popup('show')
  }

  changePageSize(newSize: number) {
    if (newSize > 9 && newSize < 101) {
      this.pageSize = newSize
      this.pages = Array.from({length:Math.ceil(this.images.length/this.pageSize)}, (v,k)=>k)
      this.selectedPage = 0
    }
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
    this.trfSrv.downloadImages(selectedUIDs, this.dataTypes, fileName).then(obs => {
      toastr.success('Building zip file...')
      obs.subscribe(
        notif => this.onTransferredNotif(notif),
        error => toastr.error(error.message),
        _ => {
          let uri = config.base + '/file-download-and-delete/' + fileName + '.zip'
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

    let pChanged = this.images.find(_ => _.uid === notif.uid)
    pChanged.transferred = true
    this.ref.detectChanges()
  }
}