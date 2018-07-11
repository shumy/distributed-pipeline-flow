import { UUID }                       from 'rts-ts-client';

import { NgModule, APP_INITIALIZER }  from '@angular/core';
import { BrowserModule }              from '@angular/platform-browser';
import { ReactiveFormsModule, FormsModule }        from '@angular/forms';
import { HttpModule }                 from '@angular/http';

import { routing }                    from './app.routing';
import { environment as config }      from '../environments/environment';

//services
import { AuthService }                from './srv/oidcAuth.srv';
import { DicoogleService }            from './srv/dicoogle.srv';

//views
import { Application }                from './app';

import { HomeView }                   from './view/home.view';
import { SearchView }                 from './view/search.view';
import { UploadView }                 from './view/upload.view';
import { AnnotateView }               from './view/annotate.view';
import { PacsCenterView }             from './view/pacscenter.view';
import { DatasetView }                from './view/dataset.view';
import { ProfileView }                from './view/profile.view';
import { RealmView }                  from './view/realm.view';
import { ImageView }                  from './view/image.view';

//rts config
import { ClientRouter, Pipeline }                               from 'rts-ts-client';
import { EventsService, SubscriberService, RepositoryService }  from 'rts-ts-client';

let client = 'web-' + UUID.generate()

declare var toastr: any
toastr.options = {
  positionClass: 'toast-top-center',
  timeOut: 5000
}

const pipeline = new Pipeline
pipeline.failHandler(error => console.log('PIPELINE-FAIL: ' + error))

const authMgr = new AuthService(config.authProvider, config.authClient)
export const router = new ClientRouter(config.server, client, pipeline)
router.authMgr = authMgr
router.onError = error => {
  if (error.httpCode == 401) {
    toastr.error('Session timeout or not properly authenticated. Please login again!')
    setTimeout(_ => window.location.href=config.base, 3000)
    return false
  }

  return true
}

const evtSrv = new EventsService(router)
export const subSrv = new SubscriberService(router, evtSrv)
export const repoSrv = new RepositoryService(router, evtSrv)
  repoSrv.create('srv-points').connect()

export function init() {
  return new Promise<void>((resolve) => {
    authMgr.load().then((isAuthorized: boolean) => {
      console.log('Auth-Manager ready...')
      console.log('Authorized: ', isAuthorized)
      resolve()
    })
  })
}

@NgModule({
  imports: [ BrowserModule, ReactiveFormsModule, FormsModule, HttpModule, routing ],
  declarations: [
    Application,
    HomeView, SearchView, UploadView, AnnotateView, PacsCenterView,
    DatasetView, ProfileView, RealmView, ImageView
  ],
  bootstrap: [ Application ],
  providers: [
    { provide: APP_INITIALIZER, useValue: init, multi: true },
    DicoogleService,
    { provide: ClientRouter, useValue: router },
    { provide: SubscriberService, useValue: subSrv },
    { provide: RepositoryService, useValue: repoSrv }
  ]
})
export class AppModule { }