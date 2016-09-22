import { NgModule }               from '@angular/core';
import { BrowserModule }          from '@angular/platform-browser';
import { ReactiveFormsModule }    from '@angular/forms';
import { HttpModule }             from '@angular/http';

import { ClientRouter, SubscriberService, RepositoryService }   from 'rts-ts-client';
import { Application }                                          from './app';
import { routing }                                              from './app.routing';
import { router, subSrv, repoSrv }                              from './app.config';

import { DicoogleService }                                      from './srv/dicoogle.srv';

//views
import { SearchView }       from './view/search.view';
import { ResultsView }      from './view/results.view';

@NgModule({
  imports: [ BrowserModule, ReactiveFormsModule, HttpModule, routing ],
  declarations: [ Application, SearchView, ResultsView ],
  bootstrap: [ Application ],
  providers: [
    DicoogleService,
    { provide: ClientRouter, useValue: router },
    { provide: SubscriberService, useValue: subSrv },
    { provide: RepositoryService, useValue: repoSrv }
  ]
})
export class AppModule { }