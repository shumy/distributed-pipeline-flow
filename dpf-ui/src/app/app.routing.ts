import { ModuleWithProviders }  from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { HomeView }             from './view/home.view';
import { SearchView }           from './view/search.view';
import { UploadView }           from './view/upload.view';
import { AnnotateView }         from './view/annotate.view';

const appRoutes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: HomeView },
  { path: 'search', component: SearchView},
  { path: 'upload', component: UploadView},
  { path: 'annotate', component: AnnotateView},
];

export const routing: ModuleWithProviders = RouterModule.forRoot(appRoutes);