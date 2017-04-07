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

  //html objects...
  magnifier: JQuery
  magsmall: JQuery
  maglarge: JQuery
  imageObj = new Image()

  get start() {
    let _start = this.last - this.BACK_LIMIT
    if (_start < 0) _start = 0
    return _start
  }

  constructor(private router: ClientRouter) {
    this.dsProxy = router.createProxy('ds')
    this.annoProxy = router.createProxy('anno')
  }

  ngOnInit() {
    this.loadDataset()
    this.magnify()
  }

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

  magnify() {
      this.magnifier = $(".magnify")
      this.magsmall = $(".magsmall")
      this.maglarge = $(".maglarge")

      window.onmousemove = e => {
        let mag = {
          width: this.maglarge.width()/2,
          height: this.maglarge.height()/2
        }

        let box = {
          top: this.magsmall.offset().top,
          left: this.magsmall.offset().left,
          width: this.magsmall.width(),
          height: this.magsmall.height()
        }

        let mx = e.pageX
        let my = e.pageY
        
        if(mx < (box.width + box.left) && my < (box.height + box.top) && mx > box.left && my > box.top) {
          this.maglarge.fadeIn(10)
        } else {
          this.maglarge.fadeOut(10)
        }
        
        if(this.maglarge.is(":visible")) {
          let rx = -1 * Math.round((mx - box.left)/box.width * this.imageObj.width - mag.width)
          let ry = -1 * Math.round((my - box.top)/box.height * this.imageObj.height - mag.height)
          let bgp = rx + "px " + ry + "px"
          
          let px = mx - mag.width
          let py = my - mag.height
          
          this.maglarge.css({left: px, top: py, backgroundPosition: bgp, zIndex: 100})
        }
      }
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
    this.imageObj = new Image()
    this.imageObj.src = this.image.url
    this.maglarge.css("background", "url(" + this.image.url + ") no-repeat")

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

  getOrCreateNode(nType: string) {
    let tNode = this.annotation.nodes[nType]
    if (!tNode) {
      tNode = { type: nType, fields: {} }
      this.annotation.nodes[nType] = tNode
    }

    return tNode
  }

  node(nType: string) {
    return this.getOrCreateNode(nType).fields
  }

  done() {
    if (this.isReadyToDone())
      this.annoProxy.saveAnnotation(this.annotation).then(_ => {
        this.setNext()
        toastr.success('Annotation saved')
      }).catch(error => toastr.error('Error saving Annotation:' + error.message))
  }

  //FIX: from here it should be replaced by a rule engine?
  isReadyToDone() {
    let qNode = this.node(this.QUALITY)
    let dNode = this.node(this.DIAGNOSIS)
    return qNode.quality === 'BAD' || qNode.quality && qNode.local && dNode.retinopathy && dNode.maculopathy && dNode.photocoagulation
  }

  setQuality(quality: string) {
    let qNode = this.node(this.QUALITY)
    let dNode = this.node(this.DIAGNOSIS)

    qNode.quality = quality
    if (qNode.quality === 'BAD') {
       delete qNode.local
       delete dNode.retinopathy
       delete dNode.maculopathy
       delete dNode.photocoagulation
       this.getOrCreateNode(this.DIAGNOSIS).implicit = true
    }
  }

  setLocal(local: string) {
    let qNode = this.node(this.QUALITY)
    if (qNode.quality !== 'BAD')
      qNode.local = local
  }

  setRetinopathy(retinopathy: string) {
    let qNode = this.node(this.QUALITY)
    let dNode = this.node(this.DIAGNOSIS)
    
    if (qNode.quality !== 'BAD') {
      dNode.retinopathy = retinopathy
      if (dNode.retinopathy === 'R0')
        dNode.maculopathy = 'M0'
    }
  }

  setMaculopathy(maculopathy: string) {
    let qNode = this.node(this.QUALITY)
    let dNode = this.node(this.DIAGNOSIS)

    if (qNode.quality !== 'BAD') {
      if (dNode.retinopathy !== 'R0')
        dNode.maculopathy = maculopathy
    }
  }

  setPhotocoagulation(photocoagulation: string) {
    let qNode = this.node(this.QUALITY)
    let dNode = this.node(this.DIAGNOSIS)

    if (qNode.quality !== 'BAD')
      dNode.photocoagulation = photocoagulation
  }
}