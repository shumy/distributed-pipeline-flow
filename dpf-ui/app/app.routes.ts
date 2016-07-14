import { provideRouter, RouterConfig } from '@angular/router';
import { SearchView } from './view/search.view';
import { ResultsView } from './view/results.view';

const routes: RouterConfig = [
  { path: '', redirectTo: 'search', pathMatch: 'full' },
  { path: 'search', component: SearchView },
  { path: 'results', component: ResultsView }
];

export const appRouterProviders = [
  provideRouter(routes)
];