import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StateService } from '../../services/state.service';
import { PropertyWithDossiers } from '../../models/dossier.model';

/**
 * Biens Component
 * Displays all properties/addresses with their dossier counts
 * Uses StateService signals for reactive state management
 */
@Component({
  selector: 'app-biens',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './biens.component.html',
  styleUrl: './biens.component.css'
})
export class BiensComponent {
  private readonly router = inject(Router);
  readonly state = inject(StateService);

  // Expose signals from state service
  readonly properties = this.state.properties;
  readonly loading = this.state.loadingProperties;

  // Local search state
  readonly searchQuery = signal('');
  
  // Filter by dossier type (location/vente)
  readonly dossierTypeFilter = signal<'tous' | 'location' | 'vente'>('tous');

  // Computed filtered properties based on search and type filter
  readonly filteredProperties = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const typeFilter = this.dossierTypeFilter();
    let props = this.properties();
    
    // Filter by dossier type
    if (typeFilter !== 'tous') {
      props = props.filter(prop => {
        if (typeFilter === 'location') return prop.dossierTypes.location > 0;
        if (typeFilter === 'vente') return prop.dossierTypes.vente > 0;
        return true;
      });
    }
    
    // Filter by search query
    if (query) {
      props = props.filter(prop =>
        prop.address.toLowerCase().includes(query) ||
        prop.city.toLowerCase().includes(query) ||
        prop.zipCode.includes(query) ||
        prop.type.toLowerCase().includes(query)
      );
    }

    return props;
  });

  // Handle search input
  onSearch(query: string): void {
    this.searchQuery.set(query);
  }
  
  // Handle type filter change
  setTypeFilter(type: 'tous' | 'location' | 'vente'): void {
    this.dossierTypeFilter.set(type);
  }

  // Navigate to property detail
  viewProperty(property: PropertyWithDossiers): void {
    this.router.navigate(['/biens', property.id]);
  }
  
  // Navigate to create new property
  createProperty(): void {
    this.router.navigate(['/biens/new']);
  }
  
  // Get primary dossier type for display
  getPrimaryType(property: PropertyWithDossiers): 'location' | 'vente' | 'mixte' {
    const hasLocation = property.dossierTypes.location > 0;
    const hasVente = property.dossierTypes.vente > 0;
    
    if (hasLocation && hasVente) return 'mixte';
    if (hasVente) return 'vente';
    return 'location';
  }
}
