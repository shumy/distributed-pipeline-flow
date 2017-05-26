import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { ActivatedRoute }                                     from '@angular/router';

import { ClientRouter }                                       from 'rts-ts-client';
import { DatasetService, DatasetInfo, PointerInfo, ImageRef } from '../srv/dataset.srv';
import { AnnotationService, AnnotationInfo, NodeInfo }        from '../srv/annotation.srv';

declare var Raphael: any

@Component({
  selector: 'annotate-view',
  templateUrl: 'annotate.view.html'
})
export class AnnotateView implements OnInit {
  private dsProxy: DatasetService
  private annoProxy: AnnotationService

  readonly QUALITY        = 'quality'
  readonly DIAGNOSIS      = 'diagnosis'
  readonly LESIONS        = 'lesions'

  readonly PRELOAD_LIMIT  = 5 //limit the preload of images and AnnotationInfo
  readonly BACK_LIMIT     = 5 //limit the number of "Recently Annotated" image list

  //active contexts
  ctxQuality: boolean
  ctxDiagnosis: boolean
  ctxLesions: boolean

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

  readonly geoAttributes = {
    MA: { color: "#2185D0", width: 2},  //MicroAneurisms (elipse)
    HEM: { color: "#00B5AD", width: 2}, //Hemorhages (circle)
    HE: { color: "#21BA45", width: 2},  //Hard Exudates (path)
    SE: { color: "#B5CC18", width: 2},  //Soft Exudates (path)
    NV: { color: "#767676", width: 2}   //Neovascularization (pencil)
  }

  lastTool: string
  tool = 'MAG' // (MAG, ERASER, MOVE, MA, HEM, HE, SE, NV)
  toolActive = false
  toolData: any
  toolGeo: any

  //move tool
  selectedGeoKey: string
  initPos: any

  //geometry
  lastKey = 0
  geoKeyOrder = []
  geometry = {}

  paper: any
  box = { top: 0, left: 0, width: 0, height: 0 }

  constructor(private router: ClientRouter, private route: ActivatedRoute, private hasChange: ChangeDetectorRef) {
    let params = this.route.snapshot.queryParams
    
    this.ctxLesions = params['lesions'] == 'true' ? true : false
    this.ctxQuality = !this.ctxLesions
    this.ctxDiagnosis = !this.ctxLesions

    this.dsProxy = router.createProxy('ds')
    this.annoProxy = router.createProxy('anno')
  }

  ngOnInit() {
    this.magnifier = $(".magnify")
    this.magsmall = $(".magsmall")
    this.maglarge = $(".maglarge")

    this.tools()
    this.loadDataset()
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
    this.image = { id: 0, url: '//:0', loaded: false }
    this.index = -1
    this.images = []

    this.dsProxy.myDefault().then(ds => {
      //BEGIN - FIX: when schema is available on the server, this should be pre-assigned
      if (!ds.pointers[this.QUALITY])
        ds.pointers[this.QUALITY] = { type: this.QUALITY, last: -1, next: 0 }

      if (!ds.pointers[this.DIAGNOSIS])
          ds.pointers[this.DIAGNOSIS] = { type: this.DIAGNOSIS, last: -1, next: 0 }
      
      if (!ds.pointers[this.LESIONS])
          ds.pointers[this.LESIONS] = { type: this.LESIONS, last: -1, next: 0 }
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
      text: { ratio: '{value} of {total}' },
      value: this.progress,
      total: this.dataset.size
    })
  }

  adjustLayout() {
    if (!this.ctxLesions) return

    this.box = {
      top: this.magsmall.offset().top,
      left: this.magsmall.offset().left,
      width: this.magsmall.width(),
      height: this.magsmall.height()
    }

    let RaphaelDiv = $("#raphael")
    RaphaelDiv.css({
      cursor: "crosshair",
      left: this.box.left,
      top: this.box.top,
      width: this.box.width,
      height: this.box.height,
      zIndex: 100
    })

    this.paper.setSize('100%', '100%')
    this.redraw()
  }

  isMouseInBox(mx: number, my: number) {
    return mx < (this.box.width + this.box.left) && my < (this.box.height + this.box.top) && mx > this.box.left && my > this.box.top
  }

  mouseToBoxPosition(mx: number, my: number) {
    return { x: mx - this.box.left, y: my - this.box.top }
  }

  selectTool(tool: string) {
    this.tool = tool
    this.redraw()
  }

  tools() {
    this.paper = Raphael('raphael', 0, 0)
    window.onresize = _ => {
      if (!this.ctxLesions) return
      this.adjustLayout()
    }

    window.onmousedown = e => {
      if (!this.ctxLesions) return
      if (this.tool == 'MAG') return

      let mx = e.pageX
      let my = e.pageY
      if (!this.isMouseInBox(mx, my)) {
        if (this.toolActive && (this.tool == 'HE' || this.tool == 'SE') && this.toolData.length > 2)
          this.pushGeometry({ type: this.tool, data: this.toolData})
        else
          this.redraw()

        this.toolActive = false
        return
      }

      let pos = this.mouseToBoxPosition(mx, my)

      if (e.button == 0) {
        this.toolGeo = null
        if (this.tool == 'MA' || this.tool == 'HEM') {
          this.toolData = { x: pos.x, y: pos.y, rx: 0, ry: 0 }
          this.toolGeo = this.paper.ellipse(this.toolData.x, this.toolData.y, 0, 0)
        } else if(this.tool == 'HE' || this.tool == 'SE' || this.tool == 'NV') {
          if (!this.toolActive)
            this.toolData = []
          
          this.toolData.push(pos)
          this.toolGeo = this.paper.path(this.toolBuildPath(this.toolData, 1, 1))
        } else if(this.tool == 'MOVE') {
          this.initPos = pos
          this.lastTool = 'MOVE'
          this.toolActive = true
          this.setToLastGeometryIfNotSelected()
          this.hasChange.detectChanges()
        }

        this.toolActive = true
        if (this.toolGeo != null)
          this.toolGeo.attr("stroke", this.geoAttributes[this.tool].color)

      } else if (e.button == 1) {
        if (this.toolActive && (this.tool == 'HE' || this.tool == 'SE')) {
          this.toolActive = false
          if (this.toolData.length > 2)
            this.pushGeometry({ type: this.tool, data: this.toolData})
          else
            this.redraw()
        } else {
          this.initPos = pos
          this.lastTool = this.tool
          this.toolActive = true
          this.setToLastGeometryIfNotSelected()
          this.selectTool('MOVE')
          this.hasChange.detectChanges()
        }
      }
    }

    window.onmouseup = e => {
      if (!this.ctxLesions) return
      if (this.tool == 'MAG') return
      let pos = this.mouseToBoxPosition(e.pageX, e.pageY)

      if (this.toolActive) {
        if (this.tool != 'HE' && this.tool != 'SE')
          this.toolActive = false

        if (this.tool == 'MA') {
          this.toolData.rx = Math.abs(pos.x - this.toolData.x)
          this.toolData.ry = Math.abs(pos.y - this.toolData.y)
          if (this.toolData.rx > 5 && this.toolData.ry > 5)
            this.pushGeometry({ type: "MA", data: this.toolData})
          else
            this.redraw()
        } else if (this.tool == 'HEM') {
          let r = Math.sqrt(Math.pow(pos.x - this.toolData.x, 2) + Math.pow(pos.y - this.toolData.y, 2))
          this.toolData.rx = r
          this.toolData.ry = r

          if (r > 5)
            this.pushGeometry({ type: "HEM", data: this.toolData})
          else
            this.redraw()
        } else if(this.tool == 'NV') {
          if (this.toolData.length > 2)
            this.pushGeometry({ type: "NV", data: this.toolData})
          else
            this.redraw()
        } else if (this.tool == 'MOVE') {
          this.selectTool(this.lastTool)
          this.hasChange.detectChanges()
        }
      }
    }

    window.onmousemove = e => {
      if (this.tool == 'MAG') {
        this.magnify(e.pageX, e.pageY)
        return
      }

      if (!this.ctxLesions) return
      let pos = this.mouseToBoxPosition(e.pageX, e.pageY)
      
      if (this.toolActive) {
        if (this.tool == 'MA') {
          this.toolData.rx = Math.abs(pos.x - this.toolData.x)
          this.toolData.ry = Math.abs(pos.y - this.toolData.y)
          this.toolGeo.attr("rx", this.toolData.rx)
          this.toolGeo.attr("ry", this.toolData.ry)
        } else if (this.tool == 'HEM') {
          let r = Math.sqrt(Math.pow(pos.x - this.toolData.x, 2) + Math.pow(pos.y - this.toolData.y, 2))
          this.toolGeo.attr("rx", r)
          this.toolGeo.attr("ry", r)
        } else if(this.tool == 'HE' || this.tool == 'SE') {
          let fig = this.toolBuildPath(this.toolData, 1, 1) + "L" + pos.x + " " + pos.y
          this.toolGeo.attr("path", fig)
        } else if(this.tool == 'NV') {
          let fig = this.toolBuildPath(this.toolData, 1, 1) + "L" + pos.x + " " + pos.y
          this.toolGeo.attr("path", fig)

          let index = this.toolData.length - 1
          let dist = Math.pow(pos.x - this.toolData[index].x, 2) + Math.pow(pos.y - this.toolData[index].y, 2)
          if (dist > 100)
            this.toolData.push(pos)
        } else if (this.tool == 'MOVE') {
          this.moveGeometry(pos.x - this.initPos.x, pos.y - this.initPos.y)
          this.initPos = pos
        }
      }
    }
  }

  toolBuildPath(data: any[], xScale: number, yScale: number, close = false) {
    let path = "M" + data[0].x*xScale + " " + data[0].y*yScale
    for (var i = 1; i < data.length; i++)
      path += "L" + data[i].x*xScale + " " + data[i].y*yScale
    
    if (close)
      path += "Z"

    return path
  }

  setToLastGeometryIfNotSelected() {
    if (this.selectedGeoKey == null) {
      let index = this.geoKeyOrder.length - 1
      if (index > -1)
        this.selectedGeoKey = this.geoKeyOrder[index]
    }
  }

  moveGeometry(xDelta: number, yDelta: number) {
    let selectedGeo = this.geometry[this.selectedGeoKey]
    if (selectedGeo != null) {
      let type = selectedGeo.type
      let geo = selectedGeo.data
      if (type == "MA" || type == "HEM") {
        geo.x += xDelta
        geo.y += yDelta
      } else if (type == 'HE' || type == 'SE' || type == 'NV') {
        geo.forEach(dPos => {
          dPos.x += xDelta
          dPos.y += yDelta
        })
      }

      this.redraw()
    }
  }

  pushGeometry(geo: any) {
    geo.scale = { width: this.box.width, height: this.box.height }
    this.lastKey++
    let key = this.lastKey + ""

    this.geoKeyOrder.push(key)
    this.geometry[key] = geo
    
    this.selectedGeoKey = key
    this.redraw()
  }

  lesionsToGeometry(lNode: any) {
    this.lastKey = 0
    this.geoKeyOrder = []
    this.geometry = {}

    if (lNode.lesions != null)
      lNode.lesions.forEach(lesion => {
        this.lastKey++
        let key = this.lastKey + ""
        this.geoKeyOrder.push(key)
        this.geometry[key] = lesion
      })
  }

  geometryToLesions() {
    let lesions = []
    this.geoKeyOrder.forEach(key => lesions.push(this.geometry[key]))
    return lesions
  }

  magnify(mx: number, my: number) {
    if (this.dataset != null && this.progress >= this.dataset.size)
      return

    let mag = {
      width: this.maglarge.width()/2,
      height: this.maglarge.height()/2
    }

    if(this.isMouseInBox(mx, my))
      this.maglarge.fadeIn(10)
    else
      this.maglarge.fadeOut(10)
    
    if(this.maglarge.is(":visible")) {
      let rx = -1 * Math.round((mx - this.box.left)/this.box.width * this.imageObj.width - mag.width)
      let ry = -1 * Math.round((my - this.box.top)/this.box.height * this.imageObj.height - mag.height)
      let bgp = rx + "px " + ry + "px"
      
      let px = mx - mag.width
      let py = my - mag.height
      
      this.maglarge.css({left: px, top: py, backgroundPosition: bgp, cursor: "none", zIndex: 200})
    }
  }

  eraseLast() {
    let keyIndex = this.geoKeyOrder.length - 1
    if (keyIndex > -1) {
      let key = this.geoKeyOrder[keyIndex]
      this.erase(key)
    }
  }

  eraseAll() {
    this.selectedGeoKey = null
    this.geoKeyOrder = []
    this.geometry = {}
    this.redraw()
  }

  erase(key: string) {
    let keyIndex = this.geoKeyOrder.indexOf(key)
    if (keyIndex > -1) {
      this.geoKeyOrder.splice(keyIndex, 1)
      delete this.geometry[key]

      if (key == this.selectedGeoKey) {
        this.selectedGeoKey = null
        this.setToLastGeometryIfNotSelected()
      }

      this.redraw()
    }
  }

  redraw() {
    this.paper.clear()
    if (!this.ctxLesions) return

    // for debug...
    /*let circle1 = this.paper.circle(0, 0, 10)
    circle1.attr("fill", "#f00")

    let circle2 = this.paper.circle(this.box.width, 0, 10)
    circle2.attr("fill", "#f00")

    let circle3 = this.paper.circle(0, this.box.height, 10)
    circle3.attr("fill", "#f00")

    let circle4 = this.paper.circle(this.box.width, this.box.height, 10)
    circle4.attr("fill", "#f00")
    */

    //console.log('GEO-KEY: ', this.geoKeyOrder)
    //console.log('GEO: ', this.geometry)

    //draw geometry
    Object.keys(this.geometry).forEach(key => {
      let geo = this.geometry[key]
      let xScale = this.box.width/geo.scale.width
      let yScale = this.box.height/geo.scale.height
      
      let geoElement: any
      if (geo.type == "MA" || geo.type == "HEM") {  
        geoElement = this.paper.ellipse(geo.data.x*xScale, geo.data.y*yScale, geo.data.rx*xScale, geo.data.ry*yScale)
      } else if(geo.type == 'HE' || geo.type == 'SE') {
        let path = this.toolBuildPath(geo.data, xScale, yScale, true)
        geoElement = this.paper.path(path)
      } else if(geo.type == 'NV') {
        let path = this.toolBuildPath(geo.data, xScale, yScale)
        geoElement = this.paper.path(path)
      }

      if (geoElement != null) {
        geoElement.attr("stroke", this.geoAttributes[geo.type].color)

        if (this.tool == 'MOVE' && key == this.selectedGeoKey)
          geoElement.attr("stroke", "#ffffff")
        else
          geoElement.attr("stroke-width", this.geoAttributes[geo.type].width)

        geoElement.mouseover(_ => {
          if (this.tool == 'ERASER' && this.toolActive)
            this.erase(key)
          else if (this.tool == 'MOVE' && !this.toolActive) {
            this.selectedGeoKey = key
            this.redraw()
          }
        })
      }
    })
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event) {
    console.log('onKeyDown: ', event)
    switch (event.key) {
      case "ArrowDown": this.setPosition(1); break
      case "ArrowLeft": this.setPosition(this.progress); break
      case "ArrowRight": this.setPosition(this.progress + 2); break
      case "ArrowUp": this.setPosition(); break
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
    if (this.progress >= this.dataset.size) {
      this.image = { id: 0, url: 'assets/img/ni.png', loaded: true }
      this.setMagImage()
      return
    }
    
    this.dsProxy.getImageRefsFromDefault(this.progress, this.PRELOAD_LIMIT).then(refs => {
      this.images = this.images.concat(refs)
      this.preloadImages(0, refs)
      this.loadInfo()
    }).catch(error => toastr.error(error.message))
  }

  loadInfo() {
    if (this.progress >= this.dataset.size) {
      this.image = { id: 0, url: 'assets/img/ni.png', loaded: true }
      this.setMagImage()
      return
    }

    this.image = this.images[this.index]
    this.setMagImage()

    this.annoProxy.readAnnotation(this.image.id).then(ann => {
      this.annotation = ann
      this.lesionsToGeometry(this.node(this.LESIONS))
      this.selectedGeoKey = null
      this.setToLastGeometryIfNotSelected()
      this.redraw()
    }).catch(error => toastr.error(error.message))
  }

  setMagImage() {
    this.imageObj = new Image()
    this.imageObj.onload = _ => this.adjustLayout()
    this.imageObj.src = this.image.url
    this.maglarge.css("background", "url(" + this.image.url + ") no-repeat")
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

  getOrCreateNode(ann: AnnotationInfo, nType: string) {
    let tNode = ann.nodes[nType]
    if (!tNode) {
      tNode = { type: nType, fields: {} }
      ann.nodes[nType] = tNode
    }

    return tNode
  }

  node(nType: string) {
    return this.getOrCreateNode(this.annotation, nType).fields
  }

  done() {
    if (this.isReadyToDone()) {
      if (this.ctxDiagnosis)
        this.getOrCreateNode(this.annotation, this.DIAGNOSIS).implicit = true

      //BEGIN - save only the context...
      let annToSave = JSON.parse(JSON.stringify(this.annotation)) as AnnotationInfo
      
      if (!this.ctxQuality)
        delete annToSave.nodes[this.QUALITY]
      
      if (!this.ctxDiagnosis)
        delete annToSave.nodes[this.DIAGNOSIS]
      
      if (!this.ctxLesions)
        delete annToSave.nodes[this.LESIONS]
      else {
        let lNode = this.getOrCreateNode(annToSave, this.LESIONS).fields
        lNode.lesions = this.geometryToLesions()
      }
      //END - save only the context...

      this.annoProxy.saveAnnotation(annToSave).then(_ => {
        this.setNext()
        toastr.success('Annotation saved')
      }).catch(error => toastr.error('Error saving Annotation:' + error.message))
    }
  }

  //FIX: from here it should be replaced by a rule engine?
  isReadyToDone() {
    if (this.dataset != null && this.progress >= this.dataset.size)
      return false

    let qNode = this.node(this.QUALITY)
    let dNode = this.node(this.DIAGNOSIS)

    if (this.ctxLesions)
      return true

    //quality is mandatory...
    if (!qNode.quality || qNode.quality !== 'BAD' && !qNode.local)
      return false

    if (this.ctxDiagnosis && qNode.quality !== 'BAD' &&
      (!dNode.retinopathy || !dNode.maculopathy || !dNode.photocoagulation)
    ) return false

    return true
  }

  getStateClass(state: string, position: string) {
    if (this.dataset != null && this.progress >= this.dataset.size)
      return 'basic disabled'

    if (
      !this.ctxQuality && ['GOOD', 'PARTIAL', 'BAD', 'MACULA', 'OPTIC_DISC', 'OTHER'].indexOf(position) > -1
      ||
      !this.ctxDiagnosis && ['R0', 'R1', 'R2_M', 'R2_S', 'R3', 'RX', 'M0', 'M1', 'MX', 'P0', 'P1', 'P2'].indexOf(position) > -1
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

    this.dsLast = -1
    this.loadDataset()
  }

  toogleDiagnosis() {
    //one must be selected
    if (this.ctxDiagnosis && !this.ctxQuality)
      return
    this.ctxDiagnosis = !this.ctxDiagnosis

    this.dsLast = -1
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