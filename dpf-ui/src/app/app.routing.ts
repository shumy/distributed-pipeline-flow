import { ModuleWithProviders }  from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { HomeView }             from './view/home.view';
import { SearchView }           from './view/search.view';
import { UploadView }           from './view/upload.view';
import { AnnotateView }         from './view/annotate.view';
import { PacsCenterView }       from './view/pacscenter.view';

const appRoutes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: HomeView },
  { path: 'search', component: SearchView},
  { path: 'upload', component: UploadView},
  { path: 'annotate', component: AnnotateView},
  { path: 'viewer', component: PacsCenterView},
];

export const routing: ModuleWithProviders = RouterModule.forRoot(appRoutes);