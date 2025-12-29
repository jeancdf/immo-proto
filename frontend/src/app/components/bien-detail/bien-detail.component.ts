import { Component, inject, OnInit, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { StateService } from '../../services/state.service';
import { PropertyWithDossiers, Proprietaire, Dossier, CollectLink } from '../../models/dossier.model';
import { ProprietaireComponent } from '../proprietaire/proprietaire.component';

/**
 * Bien Detail Component
 * Shows all dossiers associated with a specific property
 * Uses StateService signals for reactive state management
 */
@Component({
  selector: 'app-bien-detail',
  standalone: true,
  imports: [CommonModule, ProprietaireComponent],
  templateUrl: './bien-detail.component.html',
  styleUrl: './bien-detail.component.css'
})
export class BienDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  readonly state = inject(StateService);

  // Expose signal from state service
  readonly property = this.state.selectedProperty;
  readonly dossiers = this.state.selectedPropertyDossiers;

  // Find the most recent sale dossier (even if archived) to show audit history
  readonly relevantSaleDossier = computed(() => {
    const saleDossiers = this.dossiers().filter(d => d.type === 'vente');
    if (saleDossiers.length === 0) return null;
    
    // Sort by updatedAt descending to get the most recent one
    return [...saleDossiers].sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )[0];
  });

  // Collect progress signals
  readonly auditStats = signal({ received: 0, total: 0, percentage: 0 });
  readonly loadingAudit = signal(false);

  // Loading state
  readonly loading = computed(() => this.state.loadingProperties() || this.state.loadingDossiers());

  constructor() {
    // React to relevantSaleDossier changes to load audit stats
    effect(() => {
      const dossier = this.relevantSaleDossier();
      if (dossier) {
        this.loadAuditStats(dossier.id);
      } else {
        this.auditStats.set({ received: 0, total: 0, percentage: 0 });
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const propertyId = parseInt(id, 10);
      this.state.loadPropertyById(propertyId);
      this.state.loadDossiersByProperty(propertyId);
    }
  }

  loadAuditStats(dossierId: number): void {
    this.loadingAudit.set(true);
    this.http.get<CollectLink[]>(`/api/dossiers/${dossierId}/collect-links`)
      .subscribe({
        next: (links) => {
          const total = links.reduce((acc, l) => acc + l.stats.total, 0);
          const received = links.reduce((acc, l) => acc + l.stats.received, 0);
          const percentage = total > 0 ? Math.round((received / total) * 100) : 0;
          this.auditStats.set({ received, total, percentage });
          this.loadingAudit.set(false);
        },
        error: () => {
          this.loadingAudit.set(false);
        }
      });
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
    const id = this.property()?.id;
    if (id) {
      this.router.navigate(['/biens', id, 'edit']);
    }
  }

  // Navigate to generate candidature link page
  generateLink(): void {
    const id = this.property()?.id;
    if (id) {
      this.router.navigate(['/biens', id, 'lien']);
    }
  }

  // Navigate to annonce generator page
  generateAnnonce(): void {
    const id = this.property()?.id;
    if (id) {
      this.router.navigate(['/biens', id, 'annonce']);
    }
  }

  // Navigate to vente dashboard audit page
  viewVenteDashboard(): void {
    const dossierId = this.relevantSaleDossier()?.id;
    if (dossierId) {
      this.router.navigate(['/dossier', dossierId, 'vente-dashboard']);
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

  // Handle owner actions
  editOwner(owner: Proprietaire): void {
    console.log('Edit owner:', owner);
    // TODO: Implement owner edit modal/page
  }

  deleteOwner(owner: Proprietaire): void {
    console.log('Delete owner:', owner);
    if (confirm(`Supprimer le propriétaire ${owner.firstName} ${owner.lastName} ?`)) {
      // TODO: Implement owner deletion
    }
  }

  addOwner(): void {
    console.log('Add new owner');
    // TODO: Implement add owner modal/page
  }
}
