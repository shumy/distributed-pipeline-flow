import { Component, OnInit, ChangeDetectorRef } from '@angular/core';

import { ClientRouter }                 from 'rts-ts-client';
import { AnnotationService, ImageRef, Annotation }  from '../srv/annotation.srv';

@Component({
  selector: 'annotate-view',
  templateUrl: 'annotate.view.html'
})
export class AnnotateView implements OnInit {
  private annoProxy: AnnotationService

  tab = 0

  index = 0
  pValue = 0
  pTotal = 0

  images: ImageRef[]
  image: ImageRef = { id: 0, url: 'none' }

  annotations: Annotation[]
  annotation: Annotation = {
    id: 0,
    image: 0,

    quality: 'UNDEFINED',
    local: 'UNDEFINED',

    retinopathy:'UNDEFINED',
    maculopathy:'UNDEFINED',
    photocoagulation:'UNDEFINED'
  }
  
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

  load() {
    this.annoProxy.allNonAnnotatedImages().then(images => {
      this.index  = 0
      this.pValue = 0
      this.pTotal = images.length

      this.images = images
      this.annotations = images.map(img => {
        return {
          id: 0,
          image: img.id,

          quality: 'UNDEFINED',
          local: 'UNDEFINED',

          retinopathy:'UNDEFINED',
          maculopathy:'UNDEFINED',
          photocoagulation:'UNDEFINED'
        } as Annotation
      })

      this.loadImage()
      this.updateProgress()
    })
  }

  loadImage() {
    if (this.index < this.images.length) {
      this.tab = 0
      this.image = this.images[this.index]
      this.annotation = this.annotations[this.index]
    }
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
          this.pValue++
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
    this.index++
    
    this.loadImage()
    this.updateProgress()
  }
}