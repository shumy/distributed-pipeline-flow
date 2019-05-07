import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { ActivatedRoute }                                     from '@angular/router';

import { ClientRouter }                                       from 'rts-ts-client';
import { DatasetService, DatasetInfo, PointerInfo, ImageRef } from '../srv/dataset.srv';
import { AnnotationService, AnnotationInfo, NodeInfo }        from '../srv/annotation.srv';

import * as Ps from 'perfect-scrollbar';

declare var Raphael: any
declare var toastr: any

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
  readonly HISTORY        = 'history'

  readonly PRELOAD_LIMIT  = 5 //limit the preload of images and AnnotationInfo
  readonly BACK_LIMIT     = 5 //limit the number of "Recently Annotated" image list

  //registering time between readAnnotation and saveAnnotation
  startTime: string
  clockInSeconds = 0

  diseasesOptions = []
  tempDiseasesOptions = []

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

  //last mouse position on page
  mx = 0
  my = 0

  //html objects...
  form: JQuery
  magnifier: JQuery
  maglarge: JQuery
  magsmall: JQuery
  imageElm: JQuery
  raphaelElm: JQuery
  range: any

  diseasesDropdown: any
  imageObj = new Image()

  readonly geoAttributes = {
    MA:  { color: "#FF0000", width: 2},     //MicroAneurisms
    HEM: { color: "#00FF00", width: 2},     //Hemorhages
    HE:  { color: "#0000FF", width: 2},     //Hard Exudates
    SE:  { color: "#FFFF00", width: 2},     //Soft Exudates
    IrMA:  { color: "#B413EC", width: 2},   //Intraretinal Microvascular Abnormality
    
    PHEM:  { color: "#008080", width: 2},   //Vitreous/Pre-Retinal Hemorrhages
    PFIB:  { color: "#A52A2A", width: 2},   //Pre-Retinal Fibrose
    NV:  { color: "#000000", width: 2}      //Neovascularization
  }

  lastTool: string
  lastGeometryTool: string

  tool = 'NONE'           // (MAG, ERASER, MOVE, PAN)  (MA, HEM, HE, SE, IrMA, PHEM, PFIB, NV)
  geometryTool = 'N'      // (R-"Cross, "C-"Circle", E-"Elipse", P-"Polygon", F-"Free-Hand", N-"None")
  magnifierTool = false
  toolActive = false
  toolData: any
  toolGeo: any

  //move tool
  selectedGeoKey: string
  initPos: { x: number; y: number; }

  //geometry
  lastKey = 0
  geoKeyOrder = []
  geoElements = {}
  geometry = {}

  paper: any
  box = { top: 0, left: 0, width: 0, height: 0 }
  magBox = { top: 0, left: 0, width: 0, height: 0 }

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
    this.form = $(".form")
    this.magnifier = $(".magnify")
    this.maglarge = $(".maglarge")

    this.magsmall = $(".magsmall")
    this.imageElm = $("#imageElm")
    this.raphaelElm = $("#raphael")

    this.range = $('#contrast-range')
    this.range.range({
      min: 100,
      max: 200,
      start: 100,
      onChange: val => {
        let contrast = `contrast(${val}%)`
        this.imageElm
          .css('filter', contrast)
          .css('webkitFilter',contrast)
          .css('mozFilter',contrast)
          .css('oFilter',contrast)
          .css('msFilter',contrast)
      }
    })

    this.tools()
    this.loadDataset()
  }

  initContext(params: any) {
    this.dsLast = -1
    this.tool = 'PAN'
    this.geometryTool = 'N'
    this.magnifierTool = false
    this.toolActive = false

    this.ctxLesions = params['lesions'] == 'true' ? true : false
    this.ctxQuality = true
    this.ctxDiagnosis = true

    //this.ctxQuality = !this.ctxLesions
    //this.ctxDiagnosis = !this.ctxLesions
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

  adjustLayout(leftScrollRatio = 0.5, topScrollRatio = 0.5) {
    this.magBox = {
      top: this.magsmall.offset().top,
      left: this.magsmall.offset().left,
      width: this.magsmall.width(),
      height: this.magsmall.height()
    }

    this.box = {
      top: this.imageElm.offset().top,
      left: this.imageElm.offset().left,
      width: this.imageElm.width(),
      height: this.imageElm.height()
    }

    this.raphaelElm.css({
      cursor: "crosshair",
      width: this.box.width,
      height: this.box.height,
      zIndex: 100
    })

    //BEGIN: center image when non existent scroll
    let marginLeft = (this.magBox.width - this.box.width)/2
    let marginTop = (this.magBox.height - this.box.height)/2

    marginLeft = marginLeft < 0 ? 0 : marginLeft
    this.imageElm.css("marginLeft", marginLeft + 'px')
    this.raphaelElm.css("marginLeft", marginLeft + 'px')

    marginTop = marginTop < 0 ? 0 : marginTop
    this.imageElm.css("marginTop", marginTop + 'px')
    this.raphaelElm.css("marginTop", marginTop + 'px')
    //END: center image when non existent scroll

    this.paper.setSize('100%', '100%')
    Ps.update(this.form[0] as HTMLElement)
    Ps.update(this.magsmall[0] as HTMLElement)

    this.adjustScroll(leftScrollRatio, topScrollRatio)
    this.redraw()

    if (this.magnifierTool)
      this.magnify()
  }

  adjustBox() {
    this.box.top = this.imageElm.offset().top
    this.box.left = this.imageElm.offset().left
  }

  adjustScroll(leftScrollRatio: number, topScrollRatio: number) {
    let maxLeft = this.box.width - this.magBox.width
    this.magsmall[0].scrollLeft = maxLeft*leftScrollRatio

    let maxTop = this.box.height - this.magBox.height
    this.magsmall[0].scrollTop = maxTop*topScrollRatio

    this.adjustBox()
  }

  zoom(event: any) {
    event.stopImmediatePropagation()
    if (this.toolActive) return;

    let maxLeft = this.box.width - this.magBox.width
    let maxTop = this.box.height - this.magBox.height

    let leftScrollRatio = maxLeft <= 0 ? 0.5 : this.magsmall[0].scrollLeft/maxLeft
    let topScrollRatio  = maxTop <= 0  ? 0.5 : this.magsmall[0].scrollTop/maxTop


    let width = this.imageElm.width()
    let height = this.imageElm.height()
    if (event.deltaY < 0) {
      //wheel up
      if ( width > (this.magBox.width - 100) || height > (this.magBox.height - 100) )
        this.imageElm.width(width*0.95)
    } else {
      //wheel down
      if(width < this.imageObj.width)
        this.imageElm.width(width/0.95)
    }

    this.adjustLayout(leftScrollRatio, topScrollRatio)
  }

  isLesionsEligible() {
    return this.node(this.QUALITY).quality != null && this.node(this.QUALITY).quality != 'BAD' &&
      !(
          (this.node(this.DIAGNOSIS).retinopathy == null || this.node(this.DIAGNOSIS).retinopathy == 'R0')
       && (this.node(this.DIAGNOSIS).maculopathy == null || this.node(this.DIAGNOSIS).maculopathy == 'M0')
       && (this.node(this.DIAGNOSIS).photocoagulation == null || this.node(this.DIAGNOSIS).photocoagulation == 'P0')
       && (this.node(this.DIAGNOSIS).diseases == null || this.node(this.DIAGNOSIS).diseases.length == 0)
      )
  }

  isQualityNeeded() {
    return !this.ctxQuality && this.ctxDiagnosis && this.node(this.QUALITY).quality == null
  }

  isMouseInBox() {
    return this.mx < (this.magBox.width + this.magBox.left) && this.my < (this.magBox.height + this.magBox.top) && this.mx > this.magBox.left && this.my > this.magBox.top
  }

  mouseToBoxPosition() {
    return { x: this.mx - this.box.left, y: this.my - this.box.top }
  }

  defaultGeometryTool(tool: string): string {
      switch (tool) {
        case "MA": return "R"
        case "HEM": return "P"
        case "HE": 
        case "SE": return "P"
        case "IrMA": return "P"
        case "PHEM": return "P"
        case "PFIB": return "P"
        case "NV": return "P"
        default: return "N"
      } 
  }

  selectTool(tool: string, dontStamp = false) {
    //Eraser and Move are not compatible with Magnifier
    if (tool === 'ERASER' || tool === 'MOVE' || tool == 'PAN')
      this.magnifierTool = false

    if (this.tool === 'ERASER' || this.tool === 'MOVE' || this.tool === 'PAN') {
      if (tool === 'MAG')
        this.magnifierTool = true
      this.tool = tool
    } else if (tool === 'MAG') {
      this.magnifierTool = !this.magnifierTool
      if (!this.magnifierTool && this.tool === 'MAG') {
        this.tool = 'NONE'
        if (!this.ctxLesions)
          this.tool = 'PAN'
      }
    } else {
      this.tool = tool
    }

    if (!this.magnifierTool)
      this.maglarge.fadeOut(10)

    // select the default geometry tool
    if (tool !== 'MAG')
      this.geometryTool = this.defaultGeometryTool(this.tool)
    
    if (!dontStamp)
      this.stampHistory('TOOL_' + tool)

    this.redraw()
  }

  selectGeometryTool(geoTool: string, dontStamp = false) {
    if (['MA', 'HEM', 'HE', 'SE', 'IrMA', 'PHEM', 'PFIB', 'NV'].indexOf(this.tool) > -1) {
      if (!dontStamp)
        this.stampHistory('TOOL_' + geoTool)
      
      this.geometryTool = geoTool
    }
  }

  tools() {
    Ps.initialize(this.form[0] as HTMLElement)
    Ps.initialize(this.magsmall[0] as HTMLElement)
    this.paper = Raphael('raphael', 0, 0)

    window.onresize = _ => this.adjustLayout()

    window.onmousedown = e => {
      let pos = this.mouseToBoxPosition()

      if (!this.isMouseInBox()) {
        if (this.toolActive && (this.geometryTool == 'P') && this.toolData.length > 2)
          this.pushGeometry()
        else
          this.redraw()

        this.toolActive = false
        return
      }

      if (e.button == 0) {
        if (!this.toolActive)
          if (['MA', 'HEM', 'HE', 'SE', 'IrMA', 'PHEM', 'PFIB', 'NV'].indexOf(this.tool) > -1)
            this.stampHistory('DRAW_' + this.tool + '_' + this.geometryTool)
          else if (this.tool != 'MAG')
            this.stampHistory('USE_' + this.tool)
        
        this.toolGeo = null
        if (this.geometryTool == 'R') {
          this.toolData = { x: pos.x, y: pos.y }
          this.pushGeometry()
        } else if (this.geometryTool == 'E' || this.geometryTool == 'C') {
          this.toolData = { x: pos.x, y: pos.y, rx: 0, ry: 0 }
          this.toolGeo = this.paper.ellipse(this.toolData.x, this.toolData.y, 0, 0)
        } else if (this.geometryTool == 'P' || this.geometryTool == 'F') {
          if (!this.toolActive)
            this.toolData = []
          
          this.toolData.push(pos)
          this.toolGeo = this.paper.path(this.toolBuildPath(this.toolData, 1, 1))
        } else if (this.tool == 'MOVE') {
          this.initPos = pos
          this.lastTool = this.tool
          this.hasChange.detectChanges()
        } else if (this.tool == 'RESIZE') {
          if (this.selectedGeoKey != null) {
            this.lastTool = this.tool
            this.lastGeometryTool = this.geometryTool
            this.resizeEllipse(pos.x, pos.y)
          }
        } else if (this.tool == 'PAN') {
          this.initPos = pos
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
          this.selectTool('MOVE', true)
          this.hasChange.detectChanges()

          this.stampHistory('USE_' + this.tool)
        }
      }

      //update last change to the magnifier
      if (this.magnifierTool)
        this.magnify()
    }

    window.onmouseup = e => {
      let pos = this.mouseToBoxPosition()

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
          this.hasChange.detectChanges()
        } else if (this.tool == 'PAN') {
          this.adjustBox()
        }

        if (this.lastTool !== null) {
          this.selectTool(this.lastTool, true)
          this.lastTool = null
        }

        if (this.lastGeometryTool !== null) {
          this.selectGeometryTool(this.lastGeometryTool, true)
          this.lastGeometryTool = null
        }
      }
    }

    window.onmousemove = e => {
      this.mx = e.pageX
      this.my = e.pageY

      let pos = this.mouseToBoxPosition()

      if (this.magnifierTool)
        this.magnify()
      
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
        } else if(this.tool == 'PAN') {
          //move image
          this.magsmall[0].scrollLeft += this.initPos.x - pos.x
          this.magsmall[0].scrollTop += this.initPos.y - pos.y

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

  resizeEllipse(xDelta: number, yDelta: number) {
    let selectedGeo = this.geometry[this.selectedGeoKey]
    if (selectedGeo != null) {
      let geoType = selectedGeo.geo
      let geo = selectedGeo.data
      
      if (geoType == 'E' || geoType == 'C') {
        console.log('RESIZE: ', selectedGeo)
        geo.x /= selectedGeo.scale.width/this.box.width
        geo.y /= selectedGeo.scale.height/this.box.height
      }

      if (geoType == 'E') {
        this.toolData = { x: geo.x, y: geo.y, rx: Math.abs(xDelta - geo.x), ry: Math.abs(yDelta - geo.y) }
      }

      if (geoType == 'C') {
        let r = Math.sqrt(Math.pow(xDelta - geo.x, 2) + Math.pow(yDelta - geo.y, 2))
        this.toolData = { x: geo.x, y: geo.y, rx: r, ry: r }
      }

      if (geoType == 'E' || geoType == 'C') {
        this.tool = selectedGeo.type
        this.geometryTool = geoType
        this.erase(this.selectedGeoKey)
        this.toolGeo = this.paper.ellipse(this.toolData.x, this.toolData.y, this.toolData.rx, this.toolData.ry)
      }
    }
  }

  moveGeometry(xDelta: number, yDelta: number) {
    let selectedGeo = this.geometry[this.selectedGeoKey]
    if (selectedGeo != null) {
      let scale = {
        x: selectedGeo.scale.width/this.box.width,
        y: selectedGeo.scale.height/this.box.height
      }

      let geoType = selectedGeo.geo
      let geo = selectedGeo.data
      if (geoType == 'R' || geoType == 'E' || geoType == 'C') {
        geo.x += xDelta * scale.x
        geo.y += yDelta * scale.y
      } else if (geoType == 'P' || geoType == 'F') {
        geo.forEach(dPos => {
          dPos.x += xDelta * scale.x
          dPos.y += yDelta * scale.y
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

      if (this.diseasesOptions.indexOf(disease) == -1) {
        this.tempDiseasesOptions.push(disease)
        this.diseasesOptions.push(disease)
      }

      this.stampHistory('NEW_COMORBIDITY')

      setTimeout(_ => this.diseasesDropdown.dropdown('set selected', disease), 1)
    }
  }

  loadDiseases() {
    let isLoading = true

    let diseases = this.node(this.DIAGNOSIS).diseases || []
    diseases.forEach(el => {
      if (this.diseasesOptions.indexOf(el) == -1)
        this.diseasesOptions.push(el)
    })

    this.hasChange.detectChanges()

    this.diseasesDropdown.dropdown({
      onChange: (text) => {
        let initialCount = 0
        if (this.node(this.DIAGNOSIS).diseases != null)
        initialCount = this.node(this.DIAGNOSIS).diseases.length

        let selected = text.split(',').filter(el => el.length > 0)
        this.node(this.DIAGNOSIS).diseases = selected

        if (!isLoading && initialCount < selected.length)
          this.stampHistory('ADD_COMORBIDITY')
      },

      onRemove: (value) => {
        if (!isLoading)
          this.stampHistory('REMOVE_COMORBIDITY')

        let index = this.tempDiseasesOptions.indexOf(value)
        if (index != -1) {
          this.tempDiseasesOptions.splice(index, 1)
          this.diseasesOptions.splice(this.diseasesOptions.indexOf(value), 1)
        }
      }
    })

    this.diseasesDropdown.dropdown('set exactly', diseases)
    isLoading = false
  }

  geometryToLesions() {
    let lesions = []
    this.geoKeyOrder.forEach(key => lesions.push(this.geometry[key]))
    return lesions
  }

  encodeOptimizedSVGDataUri(svgString) {
    let uriPayload = encodeURIComponent(svgString)
      .replace(/%0A/g, '')
      .replace(/%20/g, ' ')
      .replace(/%3D/g, '=')
      .replace(/%3A/g, ':')
      .replace(/%2F/g, '/')
      .replace(/%22/g, "'")

    return 'data:image/svg+xml,' + uriPayload
  }

  magnify() {
    if (this.dataset != null && this.progress >= this.dataset.size)
      return

    let mag = {
      width: this.maglarge.width()/2,
      height: this.maglarge.height()/2
    }

    if(this.isMouseInBox())
      this.maglarge.fadeIn(10)
    else
      this.maglarge.fadeOut(10)
    
    if(this.maglarge.is(":visible")) {
      let rx = -1 * Math.round((this.mx - this.box.left)/this.box.width * this.imageObj.width - mag.width)
      let ry = -1 * Math.round((this.my - this.box.top)/this.box.height * this.imageObj.height - mag.height)
      let bgp = rx + "px " + ry + "px"
      
      let px = this.mx - mag.width
      let py = this.my - mag.height
      
      //BEGIN: set SVG background copy with correct scale...
      let svgElm = $('#raphael svg').clone()[0]
      svgElm.setAttribute("viewBox", "0 0 " + this.box.width + " " + this.box.height)
      svgElm.setAttribute("width", this.imageObj.width + "px")
      svgElm.setAttribute("height", this.imageObj.height + "px")
      //END

      let svgData = this.encodeOptimizedSVGDataUri(svgElm.outerHTML)
      this.maglarge.css({
        left: px,
        top: py,
        cursor: "crosshair",
        zIndex: 200,
        backgroundPosition: bgp + ", " + bgp,
        backgroundRepeat: "no-repeat, no-repeat",
        backgroundImage: "url(\"" + svgData + "\"), url(" + this.image.url + ")"
      })
    }
  }

  eraseLast() {
    this.stampHistory('TOOL_ERASE_LAST')

    let keyIndex = this.geoKeyOrder.length - 1
    if (keyIndex > -1) {
      let key = this.geoKeyOrder[keyIndex]
      this.erase(key)
    }
  }

  eraseAll() {
    this.stampHistory('TOOL_ERASE_ALL')

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

    //draw geometry
    this.geoElements = {}
    this.geoKeyOrder.forEach(key => {
      let geo = this.geometry[key]
      let xScale = this.box.width/geo.scale.width
      let yScale = this.box.height/geo.scale.height
      
      let geoElement: any
      if (geo.geo == 'R') {
        geoElement = this.paper.text(geo.data.x*xScale, geo.data.y*yScale, "X")
      } else if (geo.geo == 'E' || geo.geo == 'C') {  
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
          "stroke-width": geo.geo == 'R' ? 1 : this.geoAttributes[geo.type].width,
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
      this.startTime = new Date().toISOString()
      this.clockInSeconds = new Date().getTime() / 1000

      this.annotation = ann
      this.lesionsToGeometry()
      this.loadDiseases()
      this.redraw()
    }).catch(error => toastr.error(error.message))
  }

  setMagImage() {
    this.imageObj = new Image()
    this.imageObj.onload = _ => {
      //adjust to magsmall size...
      let boxRatio = this.magsmall.width() / this.magsmall.height()
      let imgRatio = this.imageElm.width() / this.imageElm.height()
      this.imageElm.width(this.magsmall.width() * imgRatio/boxRatio - 10)

      this.adjustLayout()
    }
    
    this.imageObj.src = this.image.url
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
    if (this.ctxLesions && !this.isLesionsEligible()) {
      this.setNext()
      console.log('NEXT')
      return
    }

    if (this.isReadyToDone()) {
      if (this.ctxDiagnosis)
        this.getOrCreateNode(this.annotation, this.DIAGNOSIS).implicit = true

      //BEGIN: colect the time spent between read and save annotation...
      this.stampHistory('SAVE')
      let now = new Date().getTime() / 1000
      let timeSpent = now - this.clockInSeconds
      this.node(this.HISTORY)[this.startTime].timeSpent = timeSpent
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

    let qNode = this.node(this.QUALITY)
    let dNode = this.node(this.DIAGNOSIS)

    //quality is mandatory...
    if (!qNode.quality || qNode.quality !== 'BAD' && !qNode.local)
      return false

    if ((this.ctxDiagnosis || this.ctxLesions) && qNode.quality !== 'BAD' &&
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
    if (this.ctxLesions) return

    //one must be selected
    if (this.ctxQuality && !this.ctxDiagnosis)
      return
    this.ctxQuality = !this.ctxQuality

    this.dsLast = -1
    this.loadDataset()
  }

  toogleDiagnosis() {
    if (this.ctxLesions) return

    //one must be selected
    if (this.ctxDiagnosis && !this.ctxQuality)
      return
    this.ctxDiagnosis = !this.ctxDiagnosis

    this.dsLast = -1
    this.loadDataset()
  }

  setQuality(quality: string) {
    this.stampHistory(quality)

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
    this.stampHistory(local)

    let qNode = this.node(this.QUALITY)
    if (qNode.quality !== 'BAD')
      qNode.local = local
  }

  setRetinopathy(retinopathy: string) {
    this.stampHistory(retinopathy)

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
    this.stampHistory(maculopathy)

    let qNode = this.node(this.QUALITY)
    let dNode = this.node(this.DIAGNOSIS)

    if (qNode.quality !== 'BAD')
      dNode.maculopathy = maculopathy
  }

  setPhotocoagulation(photocoagulation: string) {
    this.stampHistory(photocoagulation)

    let qNode = this.node(this.QUALITY)
    let dNode = this.node(this.DIAGNOSIS)

    if (qNode.quality !== 'BAD')
      dNode.photocoagulation = photocoagulation
  }

  stampHistory(action: string) {
    console.log('STAMP: ', action)

    let nHistory = this.node(this.HISTORY)
    let event = nHistory[this.startTime]
    if (event == null) {
      let modes = []
      if (this.ctxQuality) modes.push('QUALITY')
      if (this.ctxDiagnosis) modes.push('DIAGNOSIS')
      if (this.ctxLesions) modes.push('LESIONS')

      event = { modes: modes, timeSpent: 0, clicks: [] }
      nHistory[this.startTime] = event
    }

    let aClick = {}
    aClick[action] = new Date().toISOString()
    event.clicks.push(aClick)
  }
}