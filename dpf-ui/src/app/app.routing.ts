import { ModuleWithProviders }  from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SearchView }           from './view/search.view';
import { ResultsView }          from './view/results.view';

const appRoutes: Routes = [
  { path: '', redirectTo: 'search', pathMatch: 'full' },
  { path: 'search', component: SearchView },
  { path: 'results', component: ResultsView }
];

export const routing: ModuleWithProviders = RouterModule.forRoot(appRoutes);