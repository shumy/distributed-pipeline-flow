import { Component, OnInit, ChangeDetectorRef }               from '@angular/core';

import { ClientRouter }                                       from 'rts-ts-client';
import { DatasetService, DatasetInfo, PointerInfo, ImageRef } from '../srv/dataset.srv';
import { AnnotationService, AnnotationInfo, NodeInfo }        from '../srv/annotation.srv';

@Component({
  selector: 'annotate-view',
  templateUrl: 'annotate.view.html'
})
export class AnnotateView implements OnInit {
  private dsProxy: DatasetService
  private annoProxy: AnnotationService

  readonly QUALITY        = 'quality'
  readonly DIAGNOSIS      = 'diagnosis'

  readonly PRELOAD_LIMIT  = 3 //limit the preload of images and AnnotationInfo
  readonly BACK_LIMIT     = 5 //limit the number of "Recently Annotated" image list

  context: string = this.QUALITY //default context
  dataset: DatasetInfo
  progress: number
  
  last = 0
  index = -1
  images: ImageRef[] = []
  
  //info part...
  image: ImageRef = { id: 0, url: '//:0', loaded: false }
  annotation: AnnotationInfo = { imageId: 0, nodes: {} }

  tab = 0

  constructor(private router: ClientRouter) {
    this.dsProxy = router.createProxy('ds')
    this.annoProxy = router.createProxy('anno')
  }

  ngOnInit() { this.loadDataset() }

  select(img: ImageRef) {
    this.index = this.images.indexOf(img)
    this.loadInfo()
  }

  loadDataset() {
    this.dsProxy.myDefault().then(ds => {
      //BEGIN - FIX: when schema is available on the server, this should be pre-assigned
      if (!ds.pointers[this.QUALITY])
        ds.pointers[this.QUALITY] = { type: this.QUALITY, last: -1, next: 0 }

      if (!ds.pointers[this.DIAGNOSIS])
        ds.pointers[this.DIAGNOSIS] = { type: this.DIAGNOSIS, last: -1, next: 0 }
      //END - FIX: when schema is available on the server, this should be pre-assigned

      this.dataset = ds
      this.progress = ds.pointers[this.context].next
      this.updateProgress()
      this.setNext()
    }).catch(error => toastr.error(error.message))
  }

  updateProgress() {
    let pBar: any = $('.ui.progress')
    pBar.progress({
      label: 'ratio',
      text: { ratio: '{value} of {total}' },
      value: this.progress,
      total: this.dataset.size
    })
  }

  setNext() {
    if (this.index === this.last) {
      this.last++
      this.progress++
      this.updateProgress()
    }

    this.index = this.last
    if (this.index >= this.images.length)
      this.loadImageRefs()
    else
      this.loadInfo()
  }

  loadImageRefs() {
    if (this.progress <= this.dataset.size)
      this.dsProxy.getImageRefsFromDefault(this.progress, this.PRELOAD_LIMIT).then(refs => {
        this.images = this.images.concat(refs)
        this.preloadImages(0, refs)
        this.loadInfo()
      }).catch(error => toastr.error(error.message))
  }

  loadInfo() {
    this.image = this.images[this.index]
    this.annoProxy.readAnnotation(this.image.id)
      .then(ann => this.annotation = ann)
      .catch(error => toastr.error(error.message))
  }

  preloadImages(idx: number, imgRefs: ImageRef[]) {
    if (idx < imgRefs.length) {
      let img = new Image()
      img.onload = _ => {
        imgRefs[idx].loaded = true
        this.preloadImages(idx + 1, imgRefs)
      }
      img.src = imgRefs[idx].url
    }
  }

  node(nType: string) {
    let tNode = this.annotation.nodes[nType]
    if (!tNode) {
      tNode = { type: nType, fields: {} }
      this.annotation.nodes[nType] = tNode
    }

    return tNode.fields
  }

  setQuality(quality: string) {
    let qNode = this.node(this.QUALITY)
    qNode.quality = quality
    if (qNode.quality === 'BAD')
       delete qNode.local
  }

  setLocal(local: string) {
    let qNode = this.node(this.QUALITY)
    if (qNode.quality !== 'BAD')
      qNode.local = local
  }

  setRetinopathy(retinopathy: string) {
    let dNode = this.node(this.DIAGNOSIS)
    dNode.retinopathy = retinopathy
    if (dNode.retinopathy === 'R0')
      dNode.maculopathy = 'M0'
  }

  setMaculopathy(maculopathy: string) {
    let dNode = this.node(this.DIAGNOSIS)
    if (dNode.retinopathy !== 'R0')
      dNode.maculopathy = maculopathy
  }

  setPhotocoagulation(photocoagulation: string) {
    let dNode = this.node(this.DIAGNOSIS)
    dNode.photocoagulation = photocoagulation
  }

  isReadyForNext() {
    let qNode = this.node(this.QUALITY)
    return qNode.quality === 'BAD' || qNode.quality && qNode.local
  }

  isReadyToDone() {
    let qNode = this.node(this.QUALITY)
    let dNode = this.node(this.DIAGNOSIS)
    return qNode.quality === 'BAD' || dNode.retinopathy && dNode.maculopathy && dNode.photocoagulation
  }

  onQualityNext() {
    if (this.isReadyForNext()) {
      let qNode = this.node(this.QUALITY)
      if (qNode.quality === 'BAD') {
        this.done()
      } else {
        this.tab = 1
      }
    }
  }

  done() {
    if (this.isReadyToDone())
      this.annoProxy.saveAnnotation(this.annotation).then(_ => {
        this.tab = 0
        this.setNext()
        toastr.success('Annotation saved')
      }).catch(error => toastr.error('Error saving Annotation:' + error.message))
  }
}