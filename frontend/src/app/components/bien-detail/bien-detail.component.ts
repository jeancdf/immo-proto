import { Component, inject, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { StateService } from '../../services/state.service';
import { PropertyWithDossiers } from '../../models/dossier.model';

/**
 * Bien Detail Component
 * Shows all dossiers associated with a specific property
 * Uses StateService signals for reactive state management
 */
@Component({
  selector: 'app-bien-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bien-detail.component.html',
  styleUrl: './bien-detail.component.css'
})
export class BienDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly state = inject(StateService);

  // Local property ID signal
  private readonly propertyId = signal<number | null>(null);

  // Computed property from state based on ID
  readonly property = computed(() => {
    const id = this.propertyId();
    if (!id) return null;
    return this.state.getPropertyById(id) || null;
  });

  // Expose dossiers for this property
  readonly dossiers = this.state.selectedPropertyDossiers;

  // Loading state
  readonly loading = signal(true);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const propertyId = parseInt(id, 10);
      this.propertyId.set(propertyId);
      this.state.loadDossiersByProperty(propertyId);
      this.loading.set(false);
    } else {
      this.loading.set(false);
    }
  }

  // Navigate back to properties list
  goBack(): void {
    this.router.navigate(['/biens']);
  }

  // Navigate to dossier detail
  viewDossier(dossierId: number): void {
    this.router.navigate(['/dossier', dossierId]);
  }

  // Navigate to edit property page
  editProperty(): void {
    const id = this.propertyId();
    if (id) {
      this.router.navigate(['/biens', id, 'edit']);
    }
  }

  // Navigate to generate candidature link page
  generateLink(): void {
    const id = this.propertyId();
    if (id) {
      this.router.navigate(['/biens', id, 'lien']);
    }
  }

  // Get status display label
  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      a_completer: 'À compléter',
      complet: 'Complet',
      en_cours: 'En cours',
      archive: 'Archivé'
    };
    return labels[status] || status;
  }

  // Get client type display label
  getClientTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      locataire: 'Locataire',
      vendeur: 'Vendeur',
      acheteur: 'Acheteur'
    };
    return labels[type] || type;
  }
}
