import './app/app.config';
import "rxjs/Rx";

import { enableProdMode, provide }              from '@angular/core';
import { bootstrap }                            from '@angular/platform-browser-dynamic';
//import { disableDeprecatedForms, provideForms } from '@angular/forms';
import { HTTP_PROVIDERS, Http }                 from '@angular/http';

import { appRouterProviders }                   from './app/app.routes';
import { Application }                          from './app/app';

import { ClientRouter, RemoteObservers, Pipeline } from './lib/rts-ws-client';
import { DicoogleService, TransferService }     from './app/srv/services';

console.log('INIT-SERVICES')
let server = 'ws://localhost:9090/clt'
let client = 'web-client'

let pipeline = new Pipeline
pipeline.failHandler = error => console.log('PIPELINE-FAIL: ' + error)

let router = new ClientRouter(server, client, pipeline)
let observers = new RemoteObservers(router)

let trfSrv = new TransferService(router, observers)

enableProdMode()
bootstrap(Application, [
  //disableDeprecatedForms(), provideForms(),
  HTTP_PROVIDERS, appRouterProviders,
  //provide(APP_CONFIG, { useValue: config }),
  provide(DicoogleService, { useClass: DicoogleService }),
  provide(TransferService, { useValue: trfSrv })
])
.then(_ => { console.log('---APP-READY---') })
.catch(err => console.log(err))
