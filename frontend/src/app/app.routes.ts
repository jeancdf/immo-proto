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
import { PublicCollectComponent } from 
  './components/public-collect/public-collect.component';
import { MesDossiersComponent } from 
  './components/mes-dossiers/mes-dossiers.component';
import { BienCreateComponent } from 
  './components/bien-create/bien-create.component';
import { AnnonceGeneratorComponent } from 
  './components/annonce-generator/annonce-generator.component';
import { LoginComponent } from './components/login/login.component';
import { authGuard, guestGuard } from './guards/auth.guard';

/**
 * Application Routes
 * - Login page (guest only)
 * - Main routes wrapped in Layout (protected by authGuard)
 * - Public routes without Layout (client deposit, candidature, collect)
 */
export const routes: Routes = [
  // Login page (guest only - redirect to dashboard if logged in)
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },

  // Public routes (no layout/sidebar, no auth required)
  { path: 'deposit/:token', component: ClientDepositComponent },
  { path: 'candidature/:propertyId', component: PublicApplicationComponent },
  { path: 'collect/:token', component: PublicCollectComponent },

  // Main application routes with layout (protected)
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'dossier/new', component: DossierEditComponent },
      { path: 'dossier/:id/edit', component: DossierEditComponent },
      { path: 'dossier/:id/share', component: ShareDossierComponent },
      { path: 'dossier/:id', component: DossierDetailComponent },
      { path: 'biens', component: BiensComponent },
      { path: 'biens/new', component: BienCreateComponent },
      { path: 'biens/lien', component: PropertyLinkComponent },
      { path: 'biens/:id/lien', component: PropertyLinkComponent },
      { path: 'biens/:id/edit', component: BienEditComponent },
      { path: 'biens/:id/annonce', component: AnnonceGeneratorComponent },
      { path: 'biens/:id', component: BienDetailComponent },
      { path: 'mes-dossiers', component: MesDossiersComponent },
      { path: 'clients', component: ClientsComponent },
      { path: 'parametres', component: ParametresComponent }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
