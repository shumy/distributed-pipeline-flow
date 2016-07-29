import './app/app.config';
import "rxjs/Rx";

import { enableProdMode, provide }              from '@angular/core';
import { bootstrap }                            from '@angular/platform-browser-dynamic';
//import { disableDeprecatedForms, provideForms } from '@angular/forms';
import { HTTP_PROVIDERS, Http }                 from '@angular/http';

import { appRouterProviders }                   from './app/app.routes';
import { Application }                          from './app/app';

import { initServices, DicoogleService, TransferService }  from './app/srv/services';

enableProdMode()
bootstrap(Application, [
  //disableDeprecatedForms(), provideForms(),
  HTTP_PROVIDERS, appRouterProviders,
  //provide(APP_CONFIG, { useValue: config }),
  provide(DicoogleService, { useClass: DicoogleService }),
  provide(TransferService, { useValue: new TransferService() })
])
.then(_ => {
  initServices()
  console.log('---APP-READY---')
})
.catch(err => console.log(err))
