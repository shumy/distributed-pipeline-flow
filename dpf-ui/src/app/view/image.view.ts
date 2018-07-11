import { Component, OnInit, ChangeDetectorRef }               from '@angular/core';
import { ActivatedRoute }                                     from '@angular/router';

import { ClientRouter }                                       from 'rts-ts-client';
import { AnnotationService, NodeInfo }                        from '../srv/annotation.srv';

import { environment as config }                              from '../../environments/environment';

import * as Ps from 'perfect-scrollbar';

declare var Raphael: any
declare var toastr: any

@Component({
  selector: 'image-view',
  templateUrl: 'image.view.html'
})
export class ImageView {
  private searchSrv: any

  readonly QUALITY        = 'quality'
  readonly DIAGNOSIS      = 'diagnosis'
  readonly LESIONS        = 'lesions'

  readonly geoAttributes = {
    MA:  { color: "#FF0000", width: 2},  //MicroAneurisms (elipse)
    HEM: { color: "#00FF00", width: 2},  //Hemorhages (circle)
    HE:  { color: "#0000FF", width: 2},  //Hard Exudates (path)
    SE:  { color: "#FFFF00", width: 2},  //Soft Exudates (path)
    NV:  { color: "#000000", width: 2}   //Neovascularization (pencil)
  }

  uid: string
  imageObj = new Image()

  //info part...
  data: any
  annotation: any = { annotator: 'none', nodes: {} }
  image: any = { url: '//:0', loaded: false }
  annotators = []

  //tools info
  toolActive = false
  initPos: { x: number; y: number; }
  mx = 0
  my = 0

  //html objects...
  form: JQuery
  magsmall: JQuery
  imageElm: JQuery
  raphaelElm: JQuery
  annotatorsElm: any
  rangeElm: any

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
    this.uid = params['uid']

    this.searchSrv = router.createProxy('search')
  }

  getOrCreateNode(ann: any, nType: string) {
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

  getStateClass(state: string, position: string) {
    if (state === position)
      return ''
    return 'basic'
  }

  ngOnInit() {
    this.form = $(".form")

    this.magsmall = $(".magsmall")
    this.imageElm = $("#imageElm")
    this.raphaelElm = $("#raphael")

    this.rangeElm = $('#contrast-range')
    this.rangeElm.range({
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

    this.annotatorsElm = $('.ui.dropdown')
    this.annotatorsElm.dropdown({
      onChange: (value) => {
        let index = this.annotators.findIndex(item => item.annotator === value)
        this.selectAnnotator(index)
      }
    })

    this.tools()
    this.loadData()
  }

  loadData() {
    this.searchSrv.search('Image:' + this.uid).then(results => {
      if (results.length !== 1) {
        console.log('ERROR: ', 'Unexpected number of images!')
        toastr.error('Unexpected number of images!')
        return
      }

      this.data = results[0]
      this.image.url = config.base + '/proxy/dic2png/' + this.data.uid
      console.log('URL: ', this.image.url)

      this.loadImage()

      this.annotators = this.data.annotations
      if (this.annotators.length > 0) {
        setTimeout(_ => this.annotatorsElm.dropdown('set selected', this.annotators[0].annotator), 1)
        this.selectAnnotator(0)
      }
      
    }).catch(error => {
      console.log('ERROR: ', error)
      toastr.error(error.message)
    })
  }

  loadImage() {
    this.imageObj.onload = _ => {
      //adjust to magsmall size...
      let boxRatio = this.magsmall.width() / this.magsmall.height()
      let imgRatio = this.imageElm.width() / this.imageElm.height()
      this.imageElm.width(this.magsmall.width() * imgRatio/boxRatio - 10)

      this.image.loaded = true
      this.adjustLayout()
    }

    this.imageObj.src = this.image.url
  }

  selectAnnotator(index: number) {
    this.annotation = this.data.annotations[index]
    this.lesionsToGeometry()
    this.redraw()
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

  download() {
    console.log('Download')
  }

  zoom(event: any) {
    event.stopImmediatePropagation()

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
    Ps.update(this.form[0])
    Ps.update(this.magsmall[0])

    this.adjustScroll(leftScrollRatio, topScrollRatio)
    this.redraw()
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

  toolBuildPath(data: any[], xScale: number, yScale: number, close = false) {
    let path = "M" + data[0].x*xScale + " " + data[0].y*yScale
    for (var i = 1; i < data.length; i++)
      path += "L" + data[i].x*xScale + " " + data[i].y*yScale
    
    if (close)
      path += "Z"

    return path
  }

  isMouseInBox() {
    return this.mx < (this.magBox.width + this.magBox.left) && this.my < (this.magBox.height + this.magBox.top) && this.mx > this.magBox.left && this.my > this.magBox.top
  }

  mouseToBoxPosition() {
    return { x: this.mx - this.box.left, y: this.my - this.box.top }
  }

  tools() {
    Ps.initialize(this.form[0])
    Ps.initialize(this.magsmall[0])
    this.paper = Raphael('raphael', 0, 0)

    window.onresize = _ => this.adjustLayout()

    window.onmousedown = e => {
      if (!this.isMouseInBox() || !e.srcElement || e.srcElement.localName !== 'svg') {
        this.toolActive = false
        return
      }

      this.toolActive = true
      this.initPos = this.mouseToBoxPosition()
    }

    window.onmouseup = e => {
      if (this.toolActive) {
        this.toolActive = false
        this.adjustBox()
      }
    }

    window.onmousemove = e => {
      this.mx = e.pageX
      this.my = e.pageY
      let pos = this.mouseToBoxPosition()

      if (this.toolActive) {
        this.magsmall[0].scrollLeft += this.initPos.x - pos.x
        this.magsmall[0].scrollTop += this.initPos.y - pos.y

        this.initPos = pos
      }
    }
  }

  redraw() {
    this.paper.clear()

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
      }
    })
  }
}