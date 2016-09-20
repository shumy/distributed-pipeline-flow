import 'rxjs/Rx';

import { enableProdMode, provide }                                          from '@angular/core';
import { bootstrap }                                                        from '@angular/platform-browser-dynamic';
//import { disableDeprecatedForms, provideForms }                           from '@angular/forms';
import { HTTP_PROVIDERS, Http }                                             from '@angular/http';

import { UUID, ClientRouter, Pipeline }                                     from 'rts-ts-client';
import { EventsService, SubscriberService, RepositoryService }              from 'rts-ts-client';

import { Application }                                                      from './app/app';
import { appRouterProviders }                                               from './app/app.routes';
import { AuthService, DicoogleService }                                     from './app/app.imports';

//configs...
//let authProvider = 'https://accounts.google.com/'
//let authClient = '61929327789-7an73tpqqk1rrt2veopv1brsfcoetmrj.apps.googleusercontent.com'

let authProvider = 'http://localhost:8081/auth/realms/dev/'
let authClient = 'screen-dr'

let server = 'ws://localhost:9090/clt'
let client = 'web-' + UUID.generate()

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

  provide(DicoogleService, { useClass: DicoogleService })
])
.then(_ => { console.log('---APP-READY---') })
.catch(err => console.log(err))