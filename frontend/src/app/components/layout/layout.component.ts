import { 
  Component, inject, OnInit, computed, signal, HostListener 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { StateService } from '../../services/state.service';
import { debounceTime, Subject, switchMap, of } from 'rxjs';

interface SearchResult {
  clients: ClientResult[];
  properties: PropertyResult[];
  dossiers: DossierResult[];
}

interface ClientResult {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  type: string;
  dossierId: number;
}

interface PropertyResult {
  id: number;
  address: string;
  city: string;
  zipCode: string;
  type: string;
}

interface DossierResult {
  id: number;
  reference: string;
  type: string;
  status: string;
  clientName: string;
  propertyAddress: string;
}

/**
 * Layout Component
 * Main application shell with sidebar navigation and header
 * Uses StateService signals for reactive data display
 */
@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css'
})
export class LayoutComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  readonly state = inject(StateService);

  // Expose signals from state service
  readonly agency = this.state.agency;
  readonly currentUser = this.state.currentUser;

  // Search state
  searchQuery = '';
  readonly searchResults = signal<SearchResult | null>(null);
  readonly showResults = signal(false);
  readonly isSearching = signal(false);
  
  private searchSubject = new Subject<string>();

  // Computed user initials
  readonly userInitials = computed(() => {
    const name = this.currentUser()?.name || '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  });

  // Check if we have any results
  readonly hasResults = computed(() => {
    const results = this.searchResults();
    if (!results) return false;
    return results.clients.length > 0 || 
           results.properties.length > 0 || 
           results.dossiers.length > 0;
  });

  ngOnInit(): void {
    // Initialize all app data on layout load
    this.state.initializeAppData();
    
    // Setup search debounce
    this.searchSubject.pipe(
      debounceTime(300),
      switchMap(query => {
        if (query.length < 2) {
          return of(null);
        }
        this.isSearching.set(true);
        return this.http.get<SearchResult>(`/api/search?q=${encodeURIComponent(query)}`);
      })
    ).subscribe({
      next: (results) => {
        this.searchResults.set(results);
        this.showResults.set(results !== null);
        this.isSearching.set(false);
      },
      error: () => {
        this.isSearching.set(false);
      }
    });
  }

  onSearchInput(): void {
    this.searchSubject.next(this.searchQuery);
    if (this.searchQuery.length < 2) {
      this.showResults.set(false);
      this.searchResults.set(null);
    }
  }

  onSearchFocus(): void {
    if (this.searchQuery.length >= 2 && this.searchResults()) {
      this.showResults.set(true);
    }
  }

  // Close results when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.search-container')) {
      this.showResults.set(false);
    }
  }

  goToClient(client: ClientResult): void {
    this.clearSearch();
    this.router.navigate(['/dossier', client.dossierId]);
  }

  goToProperty(property: PropertyResult): void {
    this.clearSearch();
    this.router.navigate(['/biens', property.id]);
  }

  goToDossier(dossier: DossierResult): void {
    this.clearSearch();
    this.router.navigate(['/dossier', dossier.id]);
  }

  private clearSearch(): void {
    this.searchQuery = '';
    this.showResults.set(false);
    this.searchResults.set(null);
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      a_completer: 'À compléter',
      complet: 'Complet',
      en_cours: 'En cours',
      archive: 'Archivé'
    };
    return labels[status] || status;
  }

  getClientTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      locataire: 'Locataire',
      vendeur: 'Vendeur',
      acheteur: 'Acheteur'
    };
    return labels[type] || type;
  }
}
