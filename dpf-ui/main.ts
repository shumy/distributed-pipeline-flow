import './app/app.config';
import "rxjs/Rx";

import { enableProdMode, provide }              from '@angular/core';
import { bootstrap }                            from '@angular/platform-browser-dynamic';
//import { disableDeprecatedForms, provideForms } from '@angular/forms';
import { HTTP_PROVIDERS, Http }                 from '@angular/http';

import { appRouterProviders }                   from './app/app.routes';
import { Application }                          from './app/app';

import { ClientRouter, Pipeline }               from './lib/rts-ws-client';
import { DicoogleService, SubscriberService, TransferService }  from './app/srv/services';

console.log('INIT-SERVICES')
let server = 'ws://localhost:9090/clt'
let client = 'web-client'

let pipeline = new Pipeline
pipeline.failHandler = error => console.log('PIPELINE-FAIL: ' + error)

let router = new ClientRouter(server, client, pipeline)

let subscriberSrv = new SubscriberService(router)
let trfSrv = new TransferService(router)

enableProdMode()
bootstrap(Application, [
  //disableDeprecatedForms(), provideForms(),
  HTTP_PROVIDERS, appRouterProviders,
  //provide(APP_CONFIG, { useValue: config }),
  provide(DicoogleService, { useClass: DicoogleService }),
  provide(SubscriberService, { useValue: subscriberSrv }),
  provide(TransferService, { useValue: trfSrv })
])
.then(_ => { console.log('---APP-READY---') })
.catch(err => console.log(err))
