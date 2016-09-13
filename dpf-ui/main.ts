import 'rxjs/Rx';

import { enableProdMode, provide }                                          from '@angular/core';
import { bootstrap }                                                        from '@angular/platform-browser-dynamic';
//import { disableDeprecatedForms, provideForms }                           from '@angular/forms';
import { HTTP_PROVIDERS, Http }                                             from '@angular/http';

import { ClientRouter, Pipeline }                                           from 'rts-ts-client';
import { EventsService, SubscriberService, RepositoryService }              from 'rts-ts-client';

import { Application }                                                      from './app/app';
import { appRouterProviders }                                               from './app/app.routes';
import { AuthService, DicoogleService, TransferService }                    from './app/app.imports';

/**
 * Fast UUID generator, RFC4122 version 4 compliant.
 * @author Jeff Ward (jcward.com).
 * @license MIT license
 * @link http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript/21963136#21963136
 **/
let UUID = (function() {
  let self: any = {}
  let lut = [] 
  for (var i=0; i<256; i++) { lut[i] = (i<16?'0':'')+(i).toString(16) }
  self.generate = function() {
    var d0 = Math.random()*0xffffffff|0
    var d1 = Math.random()*0xffffffff|0
    var d2 = Math.random()*0xffffffff|0
    var d3 = Math.random()*0xffffffff|0
    return lut[d0&0xff]+lut[d0>>8&0xff]+lut[d0>>16&0xff]+lut[d0>>24&0xff]+'-'+
      lut[d1&0xff]+lut[d1>>8&0xff]+'-'+lut[d1>>16&0x0f|0x40]+lut[d1>>24&0xff]+'-'+
      lut[d2&0x3f|0x80]+lut[d2>>8&0xff]+'-'+lut[d2>>16&0xff]+lut[d2>>24&0xff]+
      lut[d3&0xff]+lut[d3>>8&0xff]+lut[d3>>16&0xff]+lut[d3>>24&0xff]
  }
  return self
})()

//configs...
//let authProvider = 'https://accounts.google.com/'
//let authClient = '61929327789-7an73tpqqk1rrt2veopv1brsfcoetmrj.apps.googleusercontent.com'

let authProvider = 'http://localhost:8081/auth/realms/dev/'
let authClient = 'screen-dr'

let server = 'ws://localhost:9090/clt'
let client = 'web-' + UUID.generate()

console.log(Pipeline)

let pipeline = new Pipeline
pipeline.failHandler(error => console.log('PIPELINE-FAIL: ' + error))

let router = new ClientRouter(server, client, pipeline)
router.authMgr = new AuthService(authProvider, authClient)

let evtSrv = new EventsService(router)
let subSrv = new SubscriberService(router, evtSrv)
let repoSrv = new RepositoryService(router, evtSrv)
  repoSrv.create('srv-points').connect()

enableProdMode()
bootstrap(Application, [
  //disableDeprecatedForms(), provideForms(),
  HTTP_PROVIDERS, appRouterProviders,
  provide(ClientRouter, { useValue: router }),
  provide(SubscriberService, { useValue: subSrv }),
  provide(RepositoryService, { useValue: repoSrv }),

  provide(DicoogleService, { useClass: DicoogleService }),
  provide(TransferService, { useClass: TransferService })
])
.then(_ => { console.log('---APP-READY---') })
.catch(err => console.log(err))