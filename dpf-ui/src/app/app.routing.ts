import { ModuleWithProviders }  from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SearchView }           from './view/search.view';
import { ResultsView }          from './view/results.view';
import { UploadView }           from './view/upload.view';
import { AnnotateView }         from './view/annotate.view';

const appRoutes: Routes = [
  { path: '', redirectTo: 'search', pathMatch: 'full' },
  { path: 'search', component: SearchView },
  { path: 'results', component: ResultsView },
  { path: 'upload', component: UploadView },
  { path: 'annotate', component: AnnotateView }
];

export const routing: ModuleWithProviders = RouterModule.forRoot(appRoutes);