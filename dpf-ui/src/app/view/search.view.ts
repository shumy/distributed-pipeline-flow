import { Component, ViewChild, OnInit, Input, ChangeDetectorRef }  from '@angular/core';
import { FormControl }                                  from '@angular/forms';

import { UUID, ClientRouter }                           from 'rts-ts-client';
import { environment as config }                        from '../../environments/environment';

@Component({
  selector: 'search-view',
  templateUrl: 'search.view.html',
  styles: ['.main.menu { margin: 60px 20px 5px; }']
})
export class SearchView {
  @ViewChild('drop_data') drop_data
  @ViewChild('drop_action') drop_action
  @ViewChild('modal_create_ds') modal_create_ds
  @ViewChild('modal_help') modal_help
  @ViewChild('ds_name') ds_name

  //search help
  @ViewChild('search') search
  @ViewChild('search_drop_help') search_drop_help
  @ViewChild('search_drop_menu') search_drop_menu
  

  readonly POPUP_SIZE = 600

  private searchSrv: any
  private trfSrv: any
  private folderMngSrv: any
  private dsSrv: any

  query = new FormControl()
  allSelected = false
  selectedNumber = 0

  images = []
  pages = [0]
  pageSize = 20
  selectedPage = 0

  dataTypes = ['dcm', 'anno']

  dsMessageError = ''

  constructor(router: ClientRouter, private ref: ChangeDetectorRef) {
    if(!router.authMgr.isLogged) {
      toastr.error('Session timeout or not properly authenticated. Please login again!')
      setTimeout(_ => window.location.href=config.base, 3000)
    }

    this.searchSrv = router.createProxy('search')
    this.trfSrv = router.createProxy('transfers')
    this.folderMngSrv = router.createProxy('folder-manager')
    this.dsSrv = router.createProxy('ds')

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
    let drop_action: any = $(this.drop_action.nativeElement)
    drop_action.dropdown()

    let drop_data: any = $(this.drop_data.nativeElement)
    drop_data.dropdown({
      onChange: (text) => {
        this.dataTypes = text.split(',').filter(el => el.length > 0)
      }
    })

    drop_data.dropdown('set exactly', this.dataTypes)
  }

  openPreview(uid: string, event: any) {
    let preview = $('div[id="image_popup_' + uid + '"]')
    preview.css({position: "fixed", left: "calc(50vw - " + this.POPUP_SIZE/2 + "px)", top: "60px", width: (this.POPUP_SIZE + "px"), zIndex: 100, display: "block"})
  }

  closePreview(uid: string) {
    let preview = $('div[id="image_popup_' + uid + '"]')
    preview.css({display: "none"})
  }

  help() {
    let modal: any = $(this.modal_help.nativeElement)
    modal.modal('show')
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

  lesions(l: any) {
    return l.fields.lesions.map(_ => _.type)
  }

  transfer() {
    let selectedImages = this.images.filter(_ => _.selected == true)
    let selectedUIDs = selectedImages.map(_ => _.uid)

    this.images.forEach(_ => _.transferred = false)
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

  //dataset creation.................................................
  openDsModel() {
    this.dsMessageError = ''
    let input_ds_name: any = $(this.ds_name.nativeElement)
    input_ds_name.val('')

    let modal_create: any = $(this.modal_create_ds.nativeElement)
    modal_create.modal('show')
  }

  createDataset(name: string) {
    if (name.length > 0) {
      console.log('CREATE-DS: ', name)
      let selectedImages = this.images.filter(_ => _.selected == true)
      let selectedUIDs = selectedImages.map(_ => _.uid)

      this.dsSrv.create(name, selectedUIDs).then(_ => {
        let modal_create: any = $(this.modal_create_ds.nativeElement)
        modal_create.modal('hide')
        toastr.success('Dataset created')
      }).catch(error => this.dsMessageError = error.message)
    } else {
      this.dsMessageError = 'Please provide a dataset name!'
    }
  }

  //search help dropdown..............................................
  searchHelp() {
    let jSearch: any = $(this.search.nativeElement)
    let jSearchMenu: any = $(this.search_drop_menu.nativeElement)
    jSearchMenu.css({ width: jSearch.outerWidth() })

    let jDrop: any = $(this.search_drop_help.nativeElement)
    jDrop.dropdown({
      action: (text, value) => {
        console.log('drop-action: ', text, value)
        jDrop.dropdown('hide')
        jSearch.focus()
        jSearch.val(jSearch.val() + text)
      }
    })

    jDrop.focus()
  }
}