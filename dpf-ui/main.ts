import { enableProdMode, provide }              from '@angular/core';
import { bootstrap }                            from '@angular/platform-browser-dynamic';
import { disableDeprecatedForms, provideForms } from '@angular/forms';
import { HTTP_PROVIDERS }                       from '@angular/http';

import { APP_CONFIG, config } from './app/app.config';
import { appRouterProviders } from './app/app.routes';

import { Application }      from './app/app';

// services
import { DicoogleService }  from './app/srv/dicoogle.srv';

//import { NotificationSrv }  from './app/srv/notification.srv';
//import { IndexSrv }  from './app/srv/index.srv';

//let notifSrv = new NotificationSrv(config)

import "rxjs/Rx";

//enableProdMode()
bootstrap(Application, [
  disableDeprecatedForms(), provideForms(),
  HTTP_PROVIDERS, appRouterProviders,
  provide(APP_CONFIG, { useValue: config }),
  DicoogleService
]).catch(err => console.log(err))

/*bootstrap(Application, [
  HTTP_PROVIDERS, ROUTER_PROVIDERS,
  provide(APP_CONFIG, { useValue: config }),
  provide(NotificationSrv, { useValue: notifSrv }),
  provide(IndexSrv, { useValue: new IndexSrv(config) }),
])
.then(() => {
  console.log('---READY---')
  notifSrv.ready()
})
.catch(err => console.log(err))
*/
