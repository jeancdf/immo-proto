import { Routes } from '@angular/router';
import { LayoutComponent } from './components/layout/layout.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { DossierDetailComponent } from 
  './components/dossier-detail/dossier-detail.component';
import { DossierEditComponent } from 
  './components/dossier-edit/dossier-edit.component';
import { BiensComponent } from './components/biens/biens.component';
import { BienDetailComponent } from 
  './components/bien-detail/bien-detail.component';

/**
 * Application Routes
 * All routes are wrapped in the Layout component
 * Note: /dossier/new must come before /dossier/:id to avoid 'new' as ID
 */
export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'dossier/new', component: DossierEditComponent },
      { path: 'dossier/:id/edit', component: DossierEditComponent },
      { path: 'dossier/:id', component: DossierDetailComponent },
      { path: 'biens', component: BiensComponent },
      { path: 'biens/:id', component: BienDetailComponent },
      { path: 'mes-dossiers', component: DashboardComponent },
      { path: 'clients', component: DashboardComponent },
      { path: 'parametres', component: DashboardComponent }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
