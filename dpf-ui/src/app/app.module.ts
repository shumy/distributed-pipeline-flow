import { NgModule }               from '@angular/core';
import { BrowserModule }          from '@angular/platform-browser';
import { ReactiveFormsModule }    from '@angular/forms';
import { HttpModule }             from '@angular/http';

import { routing }                from './app.routing';
import { config }                 from './app.config';

//services
import { AuthService }            from './srv/oidcAuth.srv';
import { DicoogleService }        from './srv/dicoogle.srv';

//views
import { Application }            from './app';
import { SearchView }             from './view/search.view';
import { UploadView }             from './view/upload.view';
import { AnnotateView }           from './view/annotate.view';

//rts config
import { ClientRouter, Pipeline }                               from 'rts-ts-client';
import { EventsService, SubscriberService, RepositoryService }  from 'rts-ts-client';

const pipeline = new Pipeline
pipeline.failHandler(error => console.log('PIPELINE-FAIL: ' + error))

const router = new ClientRouter(config.server, config.client, pipeline)
router.authMgr = new AuthService(config.authProvider, config.authClient)
router.onError = error => {
  if (error.httpCode == 401) {
    toastr.error(error.message)
    return false
  }

  return true
}

const evtSrv = new EventsService(router)
const subSrv = new SubscriberService(router, evtSrv)
const repoSrv = new RepositoryService(router, evtSrv)
  repoSrv.create('srv-points').connect()


@NgModule({
  imports: [ BrowserModule, ReactiveFormsModule, HttpModule, routing ],
  declarations: [ Application, SearchView, UploadView, AnnotateView ],
  bootstrap: [ Application ],
  providers: [
    DicoogleService,
    { provide: ClientRouter, useValue: router },
    { provide: SubscriberService, useValue: subSrv },
    { provide: RepositoryService, useValue: repoSrv }
  ]
})
export class AppModule { }