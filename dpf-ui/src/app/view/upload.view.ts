import { Component, ChangeDetectorRef } from '@angular/core';

import { ClientRouter }  from 'rts-ts-client';

import { environment as config }  from '../../environments/environment';
import { FolderManagerProxy } from '../srv/folder.srv';
import { IndexProxy } from '../srv/load.srv';

import * as Dropzone from 'dropzone';

declare var toastr: any

@Component({
  selector: 'upload-view',
  templateUrl: 'upload.view.html',
  styles: ['.main.menu { margin: 60px 20px 5px; }']
})
export class UploadView {
  private folderProxy: FolderManagerProxy
  private indexProxy: IndexProxy

  nSelected = 0
  allSelected = true
  sFiles = []

  constructor (private router: ClientRouter, private ref: ChangeDetectorRef) {
    this.indexProxy = router.createProxy('indexer')

    this.folderProxy = router.createProxy('folder-manager')
    this.folderProxy.list('*').then((files) => {
      files.filter(_ => !_.isDir && _.type == 'dcm')
        .forEach((file) => this.sFiles.push({ name: file.name, size: file.size, selected: true, indexed: false }))
    })
  }

  ngOnInit() {
    let token = 'Bearer ' + this.router.authMgr.authInfo.token
    let drop = new Dropzone('div#dropzone', { url: config.base + '/file-upload', headers: { "Authorization": token } })

    drop.on("success", (resp) => {
      this.nSelected++
      this.sFiles.push({ name: resp.name, size: resp.size, selected: true, indexed: false })
      this.ref.markForCheck()
    })

    drop.on("queuecomplete", _ => {
      console.log('queuecomplete')
      //fire auto index??
    })
  }

  selectAll() {
    if (this.allSelected) {
      this.allSelected = false
      this.nSelected = 0
    } else {
      this.allSelected = true
      this.nSelected = this.sFiles.length
    }

    this.sFiles.forEach((file) => {
      file.selected = this.allSelected
    })
  }

  selectFile(file) {
    if (file.selected) {
      file.selected = false
      this.nSelected--
    } else {
      file.selected = true
      this.nSelected++
    }

    if (this.nSelected === this.sFiles.length)
      this.allSelected = true
    else
      this.allSelected = false
  }

  index() {
    let files = this.sFiles.filter(_ => _.selected && !_.indexed).map(_ => _.name)

    this.indexProxy.indexFiles(files).then(obs => {
      toastr.success('Indexing files...')  
      obs.subscribe(
        notif => this.onIndexedNotif(notif),
        error => toastr.error(error.message)
      )
    }).catch(error => toastr.error(error.message))
  }

  onIndexedNotif(file: string) {
    console.log('onIndexedNotif: ', file)

    let pChanged = this.sFiles.find(_ => _.name === file)
    pChanged.indexed = true
    this.ref.detectChanges()
  }
}