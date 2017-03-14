import { Component, OnInit, ChangeDetectorRef }     from '@angular/core';

import { ClientRouter }                             from 'rts-ts-client';
import { AnnotationService, ImageDataset, ImageRef, Annotation }  from '../srv/annotation.srv';

@Component({
  selector: 'annotate-view',
  templateUrl: 'annotate.view.html'
})
export class AnnotateView implements OnInit {
  private annoProxy: AnnotationService

  //limit the number of "Recently Annotated" image list
  readonly limit = 3

  readonly annDefault: string = JSON.stringify({
    id: 0,
    image: 0,

    quality: 'UNDEFINED',
    local: 'UNDEFINED',

    retinopathy:'UNDEFINED',
    maculopathy:'UNDEFINED',
    photocoagulation:'UNDEFINED'
  })

  tab = 0
  loading = false

  start = 0
  index = 0
  
  pValue = 0
  pTotal = 0
  
  images: ImageRef[]
  image: ImageRef = { id: 0, url: '//:0'}

  annotations: Annotation[]
  annotation: Annotation = JSON.parse(this.annDefault)
  
  constructor(private router: ClientRouter) {
    this.annoProxy = router.createProxy('anno')
  }

  ngOnInit() {
    this.load()
  }

  updateProgress() {
    let pBar: any = $('.ui.progress')
    pBar.progress({
      label: 'ratio',
      text: { ratio: '{value} of {total}' },
      value: this.pValue,
      total: this.pTotal
    })
  }

  select(img: ImageRef) {
    let idx = this.images.indexOf(img)
    this.selectIndex(idx)
  }

  selectIndex(idx: number) {
    this.tab = 0
    this.image = this.images[idx]
    this.annotation = this.annotations[idx]
  }

  load() {
    this.annoProxy.currentDatasetNonAnnotatedImages().then(dataset => {
      this.images = dataset.images
      this.start = 0
      this.index = 0

      this.pTotal = dataset.total
      this.pValue = this.pTotal - dataset.images.length

      this.annotations = dataset.images.map(img => {
        let ann = JSON.parse(this.annDefault)
        ann.image = img.id
        return ann
      })

      this.loadImage()
      this.updateProgress()
    })
  }

  preload(fromIdx: number, toIdx: number) {
    if (fromIdx < this.images.length && fromIdx < toIdx) {
      if (!this.images[fromIdx].preloaded) {
        this.images[fromIdx].preloaded =  true

        let img = new Image()
        img.onload = _ => this.preload(fromIdx + 1, toIdx)
        img.src = this.images[fromIdx].url
      }
    }
  }

  loadImage() {
    if (this.index < this.images.length) {
      this.selectIndex(this.index)
      this.loading = true

      this.preload(this.index + 1, this.index + 3)
    }
  }

  setQuality(quality: string) {
    this.annotation.quality = quality
    if (this.annotation.quality === 'BAD')
       this.annotation.local = 'UNDEFINED'
  }

  setLocal(local: string) {
    if (this.annotation.quality !== 'BAD')
      this.annotation.local = local
  }

  setRetinopathy(retinopathy: string) {
    this.annotation.retinopathy = retinopathy
    if (this.annotation.retinopathy === 'R0')
      this.annotation.maculopathy = 'M0'
  }

  setMaculopathy(maculopathy: string) {
    if (this.annotation.retinopathy !== 'R0')
      this.annotation.maculopathy = maculopathy
  }

  setPhotocoagulation(photocoagulation: string) {
    this.annotation.photocoagulation = photocoagulation
  }

  onQualityNext() {
    if (this.annotation.quality == 'BAD') {
      this.done()
    } else {
      this.tab = 1
    }
  }

  done() {
    if (this.annotation.id == -1) {
      toastr.warning('Annotation save in progress, please wait!')
      return
    }

    if (this.annotation.id == 0) {
      this.annotation.id = -1
      this.annoProxy.createAnnotation(this.annotation)
        .then(newId => {
          this.annotation.id = newId
          this.index++
          this.pValue++
          
          if (this.index > this.limit)
            this.start = this.index - this.limit
          
          this.onDoneOk()
        })
        .catch(error => {
          this.annotation.id = 0
          toastr.error('Annotation save error:' + error.message)
        })
    } else {
      this.annoProxy.updateAnnotation(this.annotation)
        .then(_ => this.onDoneOk())
        .catch(error => toastr.error('Annotation save error:' + error.message))
    }
  }

  onDoneOk() {
    toastr.success('Annotation saved')
    this.loadImage()
    this.updateProgress()
  }
}