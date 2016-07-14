import { enableProdMode, provide }   from '@angular/core';
import { bootstrap }        from '@angular/platform-browser-dynamic';

import { HTTP_PROVIDERS }   from '@angular/http';

import { APP_CONFIG, Config, config } from './app/app.config';
import { appRouterProviders } from './app/app.routes';

import { Application }      from './app/app';

// services
//import { NotificationSrv }  from './app/srv/notification.srv';
//import { IndexSrv }  from './app/srv/index.srv';

//let notifSrv = new NotificationSrv(config)

//enableProdMode()
bootstrap(Application, [
  HTTP_PROVIDERS, appRouterProviders,
  provide(APP_CONFIG, { useValue: config })
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
