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
export class AnnotateView {
  private dsProxy: DatasetService
  private annoProxy: AnnotationService

  readonly QUALITY        = 'quality'
  readonly DIAGNOSIS      = 'diagnosis'
  readonly LESIONS        = 'lesions'

  readonly PRELOAD_LIMIT  = 5 //limit the preload of images and AnnotationInfo
  readonly BACK_LIMIT     = 5 //limit the number of "Recently Annotated" image list

  //registering time between readAnnotation and saveAnnotation
  clockInSeconds = 0

  diseasesOptions = []

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
  diseasesDropdown: any
  imageObj = new Image()

  readonly geoAttributes = {
    MA:  { color: "#FF0000", width: 2},  //MicroAneurisms (elipse)
    HEM: { color: "#00FF00", width: 2},  //Hemorhages (circle)
    HE:  { color: "#0000FF", width: 2},  //Hard Exudates (path)
    SE:  { color: "#FFFF00", width: 2},  //Soft Exudates (path)
    NV:  { color: "#000000", width: 2}   //Neovascularization (pencil)
  }

  lastTool: string
  lastGeometryTool: string

  tool = 'MAG'            // (MAG, ERASER, MOVE)  (MA, HEM, HE, SE, NV)
  geometryTool = 'N'      // (C-"Circle", E-"Elipse", P-"Polygon", F-"Free-Hand", N-"None")
  magnifierTool = true
  toolActive = false
  toolData: any
  toolGeo: any

  //move tool
  selectedGeoKey: string
  initPos: any

  //geometry
  lastKey = 0
  geoKeyOrder = []
  geoElements = {}
  geometry = {}

  paper: any
  box = { top: 0, left: 0, width: 0, height: 0 }

  constructor(private router: ClientRouter, private route: ActivatedRoute, private hasChange: ChangeDetectorRef) {
    let params = this.route.snapshot.queryParams
    this.initContext(params)

    this.route.queryParams.subscribe(params => {
      this.initContext(params)
      if (this.magnifier != null)
        this.loadDataset()
    })

    this.dsProxy = router.createProxy('ds')
    this.annoProxy = router.createProxy('anno')

    router.createProxy('properties').allOfKey('diagnosis.diseases')
      .then(dList => this.diseasesOptions = dList)
      .catch(error => console.error('Diagnosis Diseases not loaded:' + error.message))
  }

  ngOnInit() {
    this.magnifier = $(".magnify")
    this.magsmall = $(".magsmall")
    this.maglarge = $(".maglarge")

    this.tools()
    this.loadDataset()
  }

  initContext(params: any) {
    this.ctxLesions = params['lesions'] == 'true' ? true : false
    this.ctxQuality = !this.ctxLesions
    this.ctxDiagnosis = !this.ctxLesions
  }

  getProgressFromContext() {
    if (this.ctxLesions)
      return this.dataset.pointers[this.LESIONS].next
    else if (this.ctxDiagnosis)
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
    this.diseasesDropdown = $('.ui.dropdown')
    this.diseasesDropdown.dropdown({
      onChange: (text) => {
        let selected = text.split(',').filter(el => el.length > 0)
        this.node(this.DIAGNOSIS).diseases = selected
      }
    })

    let pBar: any = $('.ui.progress')
    pBar.progress({
      label: 'ratio',
      text: { ratio: '{value} of {total}' },
      value: this.progress,
      total: this.dataset.size
    })
  }

  adjustLayout() {
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

  isQualityNeeded() {
    return !this.ctxQuality && this.ctxDiagnosis && this.node(this.QUALITY).quality == null
  }

  isMouseInBox(mx: number, my: number) {
    return mx < (this.box.width + this.box.left) && my < (this.box.height + this.box.top) && mx > this.box.left && my > this.box.top
  }

  mouseToBoxPosition(mx: number, my: number) {
    return { x: mx - this.box.left, y: my - this.box.top }
  }

  defaultGeometryTool(tool: string): string {
      switch (tool) {
        case "MA": return "E"
        case "HEM": return "C"
        case "HE": 
        case "SE": return "P"
        case "NV": return "F"
        default: return "N"
      } 
  }

  selectTool(tool: string) {
    //Eraser and Move are not compatible with Magnifier
    if (tool === 'ERASER' || tool === 'MOVE')
      this.magnifierTool = false

    if (this.tool === 'ERASER' || this.tool === 'MOVE') {
      if (tool === 'MAG')
        this.magnifierTool = true
      this.tool = tool
    } else if (tool === 'MAG') {
      this.magnifierTool = !this.magnifierTool
      if (!this.magnifierTool && this.tool === 'MAG')
        this.tool = "NONE"
    } else {
      this.tool = tool
    }

    // select the default geometry tool
    if (tool !== 'MAG')
      this.geometryTool = this.defaultGeometryTool(this.tool)

    this.redraw()
  }

  selectGeometryTool(geoTool: string) {
    if (['MA', 'HEM', 'HE', 'SE', 'NV'].indexOf(this.tool) > -1)
      this.geometryTool = geoTool
  }

  tools() {
    this.paper = Raphael('raphael', 0, 0)
    window.onresize = _ => this.adjustLayout()

    window.onmousedown = e => {
      if (!this.ctxLesions) return

      let mx = e.pageX
      let my = e.pageY

      if (!this.isMouseInBox(mx, my)) {
        if (this.toolActive && (this.geometryTool == 'P') && this.toolData.length > 2)
          this.pushGeometry()
        else
          this.redraw()

        this.toolActive = false
        return
      }

      let pos = this.mouseToBoxPosition(mx, my)

      if (e.button == 0) {
        this.toolGeo = null
        if (this.geometryTool == 'E' || this.geometryTool == 'C') {
          this.toolData = { x: pos.x, y: pos.y, rx: 0, ry: 0 }
          this.toolGeo = this.paper.ellipse(this.toolData.x, this.toolData.y, 0, 0)
        } else if(this.geometryTool == 'P' || this.geometryTool == 'F') {
          if (!this.toolActive)
            this.toolData = []
          
          this.toolData.push(pos)
          this.toolGeo = this.paper.path(this.toolBuildPath(this.toolData, 1, 1))
        } else if(this.tool == 'MOVE') {
          this.initPos = pos
          this.lastTool = 'MOVE'
          this.toolActive = true
          this.hasChange.detectChanges()
        }

        this.toolActive = true
        if (this.toolGeo != null)
          this.toolGeo.attr("stroke", this.geoAttributes[this.tool].color)

      } else if (e.button == 1 || e.button == 2) {
        if (this.toolActive && (this.geometryTool == 'P')) {
          this.toolActive = false
          if (this.toolData.length > 2)
            this.pushGeometry()
          else
            this.redraw()
        } else if (!this.magnifierTool) {
          this.initPos = pos
          this.lastTool = this.tool
          this.lastGeometryTool = this.geometryTool
          this.toolActive = true
          this.selectTool('MOVE')
          this.hasChange.detectChanges()
        }
      }

      //update last change to the magnifier
      if (this.magnifierTool)
        this.magnify(mx, my)
    }

    window.onmouseup = e => {
      if (!this.ctxLesions) return

      let pos = this.mouseToBoxPosition(e.pageX, e.pageY)

      if (this.toolActive) {
        if (this.geometryTool != 'P')
          this.toolActive = false

        if (this.geometryTool == 'E') {
          this.toolData.rx = Math.abs(pos.x - this.toolData.x)
          this.toolData.ry = Math.abs(pos.y - this.toolData.y)
          if (this.toolData.rx > 5 && this.toolData.ry > 5)
            this.pushGeometry()
          else
            this.redraw()
        } else if (this.geometryTool == 'C') {
          let r = Math.sqrt(Math.pow(pos.x - this.toolData.x, 2) + Math.pow(pos.y - this.toolData.y, 2))
          this.toolData.rx = r
          this.toolData.ry = r

          if (r > 5)
            this.pushGeometry()
          else
            this.redraw()
        } else if(this.geometryTool == 'F') {
          if (this.toolData.length > 2)
            this.pushGeometry()
          else
            this.redraw()
        } else if (this.tool == 'MOVE') {
          this.selectTool(this.lastTool)
          this.selectGeometryTool(this.lastGeometryTool)
          this.hasChange.detectChanges()
        }
      }
    }

    window.onmousemove = e => {
      if (this.magnifierTool)
        this.magnify(e.pageX, e.pageY)

      if (!this.ctxLesions) return
      let pos = this.mouseToBoxPosition(e.pageX, e.pageY)
      
      if (this.toolActive) {
        if (this.geometryTool == 'E') {
          this.toolData.rx = Math.abs(pos.x - this.toolData.x)
          this.toolData.ry = Math.abs(pos.y - this.toolData.y)
          this.toolGeo.attr("rx", this.toolData.rx)
          this.toolGeo.attr("ry", this.toolData.ry)
        } else if (this.geometryTool == 'C') {
          let r = Math.sqrt(Math.pow(pos.x - this.toolData.x, 2) + Math.pow(pos.y - this.toolData.y, 2))
          this.toolGeo.attr("rx", r)
          this.toolGeo.attr("ry", r)
        } else if(this.geometryTool == 'P') {
          let fig = this.toolBuildPath(this.toolData, 1, 1) + "L" + pos.x + " " + pos.y
          this.toolGeo.attr("path", fig)
        } else if(this.geometryTool == 'F') {
          let fig = this.toolBuildPath(this.toolData, 1, 1) + "L" + pos.x + " " + pos.y
          this.toolGeo.attr("path", fig)

          let index = this.toolData.length - 1
          let dist = Math.pow(pos.x - this.toolData[index].x, 2) + Math.pow(pos.y - this.toolData[index].y, 2)
          if (dist > 100)
            this.toolData.push(pos)
        } else if (this.tool == 'MOVE' && this.selectedGeoKey != null) {
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
      let geoType = selectedGeo.geo
      let geo = selectedGeo.data
      if (geoType == 'E' || geoType == 'C') {
        geo.x += xDelta
        geo.y += yDelta
      } else if (geoType == 'P' || geoType == 'F') {
        geo.forEach(dPos => {
          dPos.x += xDelta
          dPos.y += yDelta
        })
      }

      this.redraw()
    }
  }

  pushGeometry() {
    let geometry = {
      type: this.tool,
      geo: this.geometryTool,
      data: this.toolData,
      scale: { width: this.box.width, height: this.box.height }
    }
    
    this.lastKey++
    let key = this.lastKey + ""

    this.geoKeyOrder.push(key)
    this.geometry[key] = geometry
    
    this.redraw()
  }

  lesionsToGeometry() {
    let lNode = this.node(this.LESIONS)

    this.lastKey = 0
    this.geoKeyOrder = []
    this.geometry = {}

    if (lNode.lesions != null)
      lNode.lesions.forEach(lesion => {
        // lesion may not have the geometry type! Select the default.
        if (lesion.geo == null)
          lesion.geo = this.defaultGeometryTool(lesion.type)

        this.lastKey++
        let key = this.lastKey + ""
        this.geoKeyOrder.push(key)
        this.geometry[key] = lesion
      })
  }

  addDisease(dInput: HTMLInputElement) {
    let disease = dInput.value
    if (disease !== "") {
      dInput.value = ""

      if (this.node(this.DIAGNOSIS).diseases == null)
        this.node(this.DIAGNOSIS).diseases = []

      this.node(this.DIAGNOSIS).diseases.push(disease)
      this.loadDiseases()
    }
  }

  loadDiseases() {
    let diseases = this.node(this.DIAGNOSIS).diseases || []
    diseases.forEach(el => {
      if (this.diseasesOptions.indexOf(el) == -1)
        this.diseasesOptions.push(el)
    })

    this.hasChange.detectChanges()

    this.diseasesDropdown.dropdown({
      onChange: (text) => {
        let selected = text.split(',').filter(el => el.length > 0)
        this.node(this.DIAGNOSIS).diseases = selected
      }
    })

    this.diseasesDropdown.dropdown('set exactly', diseases)
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
      
      //BEGIN: set SVG background copy with correct scale...
      let svgElm = $("#raphael svg").clone()[0]
      svgElm.setAttribute("viewBox", "0 0 " + this.box.width + " " + this.box.height)
      svgElm.setAttribute("width", this.imageObj.width + "px")
      svgElm.setAttribute("height", this.imageObj.height + "px")
      //END

      this.maglarge.css({
        left: px,
        top: py,
        cursor: "crosshair",
        zIndex: 200,
        backgroundPosition: bgp + ", " + bgp,
        backgroundRepeat: "no-repeat, no-repeat",
        backgroundImage: "url('data:image/svg+xml;charset=utf8," + svgElm.outerHTML + "'), url(" + this.image.url + ")"
      })
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
    delete this.selectedGeoKey
    this.geoKeyOrder = []
    this.geometry = {}
    this.geoElements = {}
    this.redraw()
  }

  erase(key: string) {
    let keyIndex = this.geoKeyOrder.indexOf(key)
    if (keyIndex > -1) {
      this.geoKeyOrder.splice(keyIndex, 1)
      delete this.geometry[key]
      delete this.geoElements[key]

      if (key == this.selectedGeoKey)
        delete this.selectedGeoKey
      
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
    this.geoElements = {}
    this.geoKeyOrder.forEach(key => {
      let geo = this.geometry[key]
      let xScale = this.box.width/geo.scale.width
      let yScale = this.box.height/geo.scale.height
      
      let geoElement: any
      if (geo.geo == 'E' || geo.geo == 'C') {  
        geoElement = this.paper.ellipse(geo.data.x*xScale, geo.data.y*yScale, geo.data.rx*xScale, geo.data.ry*yScale)
      } else if(geo.geo == 'P') {
        let path = this.toolBuildPath(geo.data, xScale, yScale, true)
        geoElement = this.paper.path(path)
      } else if(geo.geo == 'F') {
        let path = this.toolBuildPath(geo.data, xScale, yScale)
        geoElement = this.paper.path(path)
      }

      if (geoElement != null) {
        this.geoElements[key] = geoElement
        geoElement.attr({
          "stroke-width": this.geoAttributes[geo.type].width,
          "stroke": this.geoAttributes[geo.type].color,
          "fill": "#ffffff",
          "fill-opacity": 0
        })

        if (this.selectedGeoKey == key)
          geoElement.attr("stroke", "#ffffff")

        let mouseover = (event) => {
          if (!this.toolActive) {
            if (this.selectedGeoKey != null) {
              let selectedType = this.geometry[this.selectedGeoKey].type
              let selectedGeoElement = this.geoElements[this.selectedGeoKey]
              if (selectedGeoElement != null)
                selectedGeoElement.attr("stroke", this.geoAttributes[selectedType].color)
            }

            this.selectedGeoKey = key
            geoElement.attr("stroke", "#ffffff")
          }
        }

        let mouseout = (event) => {
          if (!this.toolActive) {
            delete this.selectedGeoKey
            geoElement.attr("stroke", this.geoAttributes[geo.type].color)
          }
        }

        geoElement.hover(mouseover, mouseout)
        geoElement.click((event) => {
          if (this.tool == 'ERASER')
            this.erase(key)
        })
      }
    })
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event) {
    switch (event.key) {
      //case "ArrowDown": this.setPosition(1); break
      case "ArrowLeft": this.setPosition(this.progress); break
      case "ArrowRight": this.setPosition(this.progress + 2); break
      //case "ArrowUp": this.setPosition(); break
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
      this.diseasesDropdown.dropdown('set exactly', [])
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
      this.clockInSeconds = new Date().getTime() / 1000

      this.annotation = ann
      this.lesionsToGeometry()
      this.loadDiseases()
      this.redraw()
    }).catch(error => toastr.error(error.message))
  }

  setMagImage() {
    this.imageObj = new Image()
    this.imageObj.onload = _ => this.adjustLayout()
    this.imageObj.src = this.image.url
    //this.maglarge.css("background", "url(" + this.image.url + ") no-repeat")
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

      //BEGIN: colect the time spent between read and save annotation...
      let now = new Date().getTime() / 1000
      let timeSpent = now - this.clockInSeconds

      console.log('QUALITY:', this.node(this.QUALITY))
      if (this.ctxQuality && this.node(this.QUALITY).timeSpent == null && this.node(this.QUALITY).quality != null)
        this.node(this.QUALITY).timeSpent = timeSpent
      
      console.log('DIAGNOSIS:', this.node(this.DIAGNOSIS))
      if (this.ctxDiagnosis && this.node(this.DIAGNOSIS).timeSpent == null && this.node(this.DIAGNOSIS).maculopathy != null)
        this.node(this.DIAGNOSIS).timeSpent = timeSpent
      
      console.log('LESIONS:', this.node(this.LESIONS))
      if (this.ctxLesions && this.node(this.LESIONS).timeSpent == null)
        this.node(this.LESIONS).timeSpent = timeSpent
      //END -------------------------------------------------------------------

      //BEGIN - save only the context...
      let annToSave = JSON.parse(JSON.stringify(this.annotation)) as AnnotationInfo

      if (!this.ctxQuality)
        delete annToSave.nodes[this.QUALITY]
      
      if (!this.ctxDiagnosis)
        delete annToSave.nodes[this.DIAGNOSIS]
      else {
        if (annToSave.nodes[this.DIAGNOSIS].fields.diseases.length == 0)
          delete annToSave.nodes[this.DIAGNOSIS].fields.diseases
      }
      
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

    if (this.ctxLesions)
      return true

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
    if (this.dataset != null && this.progress >= this.dataset.size)
      return 'basic disabled'

    if (
      !this.ctxQuality && ['GOOD', 'PARTIAL', 'BAD', 'MACULA', 'OPTIC_DISC', 'OTHER'].indexOf(position) > -1
      ||
      !this.ctxDiagnosis && ['R0', 'R1', 'R2_M', 'R2_S', 'R3', 'RX', 'M0', 'M1', 'MX', 'P0', 'P1', 'P2', 'PX', 'DISEASES'].indexOf(position) > -1
    )
      if (state !== position)
        return 'basic disabled'
      else
        return 'disabled'

    if (state === position) return ''

    if (this.node(this.QUALITY).quality === 'BAD' && ['GOOD', 'PARTIAL', 'BAD'].indexOf(position) === -1)
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
       delete dNode.diseases
       this.loadDiseases()
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
      if (dNode.retinopathy === 'R0' || dNode.retinopathy === 'R1') {
        dNode.maculopathy = 'M0'
        dNode.photocoagulation = 'P0'
      }
    }
  }

  setMaculopathy(maculopathy: string) {
    let qNode = this.node(this.QUALITY)
    let dNode = this.node(this.DIAGNOSIS)

    if (qNode.quality !== 'BAD')
      dNode.maculopathy = maculopathy
  }

  setPhotocoagulation(photocoagulation: string) {
    let qNode = this.node(this.QUALITY)
    let dNode = this.node(this.DIAGNOSIS)

    if (qNode.quality !== 'BAD')
      dNode.photocoagulation = photocoagulation
  }
}