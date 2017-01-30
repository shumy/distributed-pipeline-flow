import { ModuleWithProviders }  from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { RouteGuard }           from './srv/route-guard.srv';

import { HomeView }             from './view/home.view';
import { SearchView }           from './view/search.view';
import { UploadView }           from './view/upload.view';
import { AnnotateView }         from './view/annotate.view';

const appRoutes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: HomeView },
  { path: 'search', component: SearchView, canActivate: [RouteGuard] },
  { path: 'upload', component: UploadView, canActivate: [RouteGuard] },
  { path: 'annotate', component: AnnotateView, canActivate: [RouteGuard] }
];

export const routing: ModuleWithProviders = RouterModule.forRoot(appRoutes);