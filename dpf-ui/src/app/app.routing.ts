import { ModuleWithProviders }  from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { HomeView }             from './view/home.view';
import { SearchView }           from './view/search.view';
import { Search2View }           from './view/search2.view';
import { UploadView }           from './view/upload.view';
import { AnnotateView }         from './view/annotate.view';
import { PacsCenterView }       from './view/pacscenter.view';
import { DatasetView }          from './view/dataset.view';
import { ProfileView }          from './view/profile.view';
import { RealmView }            from './view/realm.view';

const appRoutes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: HomeView },
  { path: 'search', component: SearchView },
  { path: 'search2', component: Search2View },
  { path: 'upload', component: UploadView },
  { path: 'annotate', component: AnnotateView },
  { path: 'viewer', component: PacsCenterView },
  { path: 'dataset', component: DatasetView },
  { path: 'profile', component: ProfileView },
  { path: 'realm', component: RealmView }
];

export const routing: ModuleWithProviders = RouterModule.forRoot(appRoutes);