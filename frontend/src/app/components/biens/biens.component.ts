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

  // Computed filtered properties based on search
  readonly filteredProperties = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const props = this.properties();
    
    if (!query) return props;

    return props.filter(prop =>
      prop.address.toLowerCase().includes(query) ||
      prop.city.toLowerCase().includes(query) ||
      prop.zipCode.includes(query) ||
      prop.type.toLowerCase().includes(query)
    );
  });

  // Handle search input
  onSearch(query: string): void {
    this.searchQuery.set(query);
  }

  // Navigate to property detail
  viewProperty(property: PropertyWithDossiers): void {
    this.router.navigate(['/biens', property.id]);
  }
}
