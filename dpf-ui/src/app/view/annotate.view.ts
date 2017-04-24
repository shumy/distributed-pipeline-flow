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

  readonly PRELOAD_LIMIT  = 5 //limit the preload of images and AnnotationInfo
  readonly BACK_LIMIT     = 5 //limit the number of "Recently Annotated" image list

  //active contexts
  ctxQuality = true
  ctxDiagnosis = true

  dataset: DatasetInfo
  dsLast: number = -1
  progress: number
  
  index: number
  images: ImageRef[]
  
  //info part...
  image: ImageRef = { id: 0, url: '//:0', loaded: false }
  annotation: AnnotationInfo = { imageId: 0, nodes: {} }

  //html objects...
  magnifier: JQuery
  magsmall: JQuery
  maglarge: JQuery
  imageObj = new Image()

  /*get start() {
    let _start = this.last - this.BACK_LIMIT
    if (_start < 0) _start = 0
    return _start
  }*/

  constructor(private router: ClientRouter) {
    this.dsProxy = router.createProxy('ds')
    this.annoProxy = router.createProxy('anno')
  }

  ngOnInit() {
    this.loadDataset()
    this.magnify()
  }

  getProgressFromContext() {
    if (this.ctxDiagnosis)
      return this.dataset.pointers[this.DIAGNOSIS].next
    else
      return this.dataset.pointers[this.QUALITY].next
  }

  select(img: ImageRef) {
    this.index = this.images.indexOf(img)
    this.loadInfo()
  }

  loadDataset(progress?: number) {
    this.index = -1
    this.images = []

    this.dsProxy.myDefault().then(ds => {
      //BEGIN - FIX: when schema is available on the server, this should be pre-assigned
      if (!ds.pointers[this.QUALITY])
        ds.pointers[this.QUALITY] = { type: this.QUALITY, last: -1, next: 0 }

      if (!ds.pointers[this.DIAGNOSIS])
          ds.pointers[this.DIAGNOSIS] = { type: this.DIAGNOSIS, last: -1, next: 0 }
      //END - FIX: when schema is available on the server, this should be pre-assigned

      this.dataset = ds
      
      if (progress != null)
        this.progress = progress
      else
        this.progress = this.getProgressFromContext()

      this.progress--
      this.setNext()
    }).catch(error => toastr.error(error.message))
  }

  updateProgress() {
    let pBar: any = $('.ui.progress')
    pBar.progress({
      label: 'ratio',
      text: { ratio: '{value} of {total} Done' },
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

  setPosition(pos?: number) {
    //position == progress + 1
    if (pos == null)
      pos = this.dsLast + 1

    //bound limits...
    if (pos < 1) pos = 1
    if (pos > this.dsLast + 1) pos = this.dsLast + 1

    if (pos == this.progress + 2)
      this.setNext()
    else
      this.loadDataset(pos - 1) //TODO: optimize when position is valid in the preload array
  }

  setNext() {
    this.index++
    this.progress++
    this.updateProgress()

    if (this.progress > this.dsLast)
      this.dsLast = this.progress

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
    if (this.isReadyToDone()) {
      if (this.ctxDiagnosis)
        this.getOrCreateNode(this.DIAGNOSIS).implicit = true

      //BEGIN - save only the context...
      let annToSave = JSON.parse(JSON.stringify(this.annotation)) as AnnotationInfo
      
      if (!this.ctxQuality)
        delete annToSave.nodes[this.QUALITY]
      
      if (!this.ctxDiagnosis)
        delete annToSave.nodes[this.DIAGNOSIS]
      //END - save only the context...

      this.annoProxy.saveAnnotation(annToSave).then(_ => {
        this.setNext()
        toastr.success('Annotation saved')
      }).catch(error => toastr.error('Error saving Annotation:' + error.message))
    }
  }

  //FIX: from here it should be replaced by a rule engine?
  isReadyToDone() {
    let qNode = this.node(this.QUALITY)
    let dNode = this.node(this.DIAGNOSIS)

    //quality is mandatory...
    if (!qNode.quality || qNode.quality !== 'BAD' && !qNode.local)
      return false

    if (this.ctxDiagnosis && qNode.quality !== 'BAD' &&
      (!dNode.retinopathy || !dNode.maculopathy || !dNode.photocoagulation)
    ) return false

    return true
  }

  getStateClass(state: string, position: string) {
    if (
      !this.ctxQuality && ['GOOD', 'PARTIAL', 'BAD', 'MACULA', 'OPTIC_DICS', 'OTHER'].indexOf(position) > -1
      ||
      !this.ctxDiagnosis && ['R0', 'R1', 'R2_M', 'R2_S', 'R3', 'M0', 'M1', 'P0', 'P1', 'P2'].indexOf(position) > -1
    )
      if (state !== position)
        return 'basic disabled'
      else
        return 'disabled'

    if (state === position) return ''

    if (
      this.node(this.QUALITY).quality === 'BAD' && ['GOOD', 'PARTIAL', 'BAD'].indexOf(position) === -1
      ||
      this.node(this.DIAGNOSIS).retinopathy === 'R0' && position === 'M1'
    )
      return 'basic disabled'

    return 'basic'
  }

  toogleQuality() {
    //one must be selected
    if (this.ctxQuality && !this.ctxDiagnosis)
      return
    this.ctxQuality = !this.ctxQuality

    this.loadDataset()
  }

  toogleDiagnosis() {
    //one must be selected
    if (this.ctxDiagnosis && !this.ctxQuality)
      return
    this.ctxDiagnosis = !this.ctxDiagnosis

    this.loadDataset()
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