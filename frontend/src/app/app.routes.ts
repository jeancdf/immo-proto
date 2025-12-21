import { Routes } from '@angular/router';
import { LayoutComponent } from './components/layout/layout.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { DossierDetailComponent } from 
  './components/dossier-detail/dossier-detail.component';
import { DossierEditComponent } from 
  './components/dossier-edit/dossier-edit.component';
import { ShareDossierComponent } from 
  './components/share-dossier/share-dossier.component';
import { BiensComponent } from './components/biens/biens.component';
import { BienDetailComponent } from 
  './components/bien-detail/bien-detail.component';
import { BienEditComponent } from 
  './components/bien-edit/bien-edit.component';
import { ClientDepositComponent } from 
  './components/client-deposit/client-deposit.component';
import { PropertyLinkComponent } from 
  './components/property-link/property-link.component';
import { PublicApplicationComponent } from 
  './components/public-application/public-application.component';
import { ParametresComponent } from 
  './components/parametres/parametres.component';
import { ClientsComponent } from 
  './components/clients/clients.component';

/**
 * Application Routes
 * - Main routes wrapped in Layout component (with sidebar)
 * - Public routes without Layout (client deposit, candidature)
 */
export const routes: Routes = [
  // Public routes (no layout/sidebar)
  { path: 'deposit/:token', component: ClientDepositComponent },
  { path: 'candidature/:propertyId', component: PublicApplicationComponent },

  // Main application routes with layout
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'dossier/new', component: DossierEditComponent },
      { path: 'dossier/:id/edit', component: DossierEditComponent },
      { path: 'dossier/:id/share', component: ShareDossierComponent },
      { path: 'dossier/:id', component: DossierDetailComponent },
      { path: 'biens', component: BiensComponent },
      { path: 'biens/lien', component: PropertyLinkComponent },
      { path: 'biens/:id/lien', component: PropertyLinkComponent },
      { path: 'biens/:id/edit', component: BienEditComponent },
      { path: 'biens/:id', component: BienDetailComponent },
      { path: 'mes-dossiers', component: DashboardComponent },
      { path: 'clients', component: ClientsComponent },
      { path: 'parametres', component: ParametresComponent }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
