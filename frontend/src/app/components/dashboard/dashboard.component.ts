import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StateService } from '../../services/state.service';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { Dossier, DossierFilters, DossierStatus } from '../../models/dossier.model';

/**
 * Dashboard Component
 * Main view showing list of all dossiers with filters
 * Uses StateService signals for reactive state management
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDialogComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  private readonly router = inject(Router);
  readonly state = inject(StateService);

  // Expose signals from state service
  readonly dossiers = this.state.filteredDossiers;
  readonly agents = this.state.agents;
  readonly filters = this.state.dossierFilters;
  readonly loading = this.state.loadingDossiers;

  // Delete confirmation states
  readonly showDeleteConfirm = signal(false);
  readonly deletingDossier = signal<Dossier | null>(null);
  readonly deleteLoading = signal(false);

  // Set filter value
  setFilter<K extends keyof DossierFilters>(
    key: K, 
    value: DossierFilters[K]
  ): void {
    this.state.setDossierFilter(key, value);
  }

  // Reset all filters
  resetFilters(): void {
    this.state.resetDossierFilters();
  }

  // ============================================
  // ACTION HANDLERS
  // ============================================

  // View dossier detail
  viewDossier(id: number): void {
    this.router.navigate(['/dossier', id]);
  }

  // Navigate to create page
  createNewDossier(): void {
    this.router.navigate(['/dossier/new']);
  }

  // Navigate to edit page
  editDossier(dossier: Dossier): void {
    this.router.navigate(['/dossier', dossier.id, 'edit']);
  }

  // Open delete confirmation
  confirmDelete(dossier: Dossier): void {
    this.deletingDossier.set(dossier);
    this.showDeleteConfirm.set(true);
  }

  // Cancel delete
  cancelDelete(): void {
    this.showDeleteConfirm.set(false);
    this.deletingDossier.set(null);
  }

  // Execute delete
  executeDelete(): void {
    const dossier = this.deletingDossier();
    if (!dossier) return;

    this.deleteLoading.set(true);
    
    this.state.deleteDossier(dossier.id).subscribe({
      next: () => {
        this.deleteLoading.set(false);
        this.showDeleteConfirm.set(false);
        this.deletingDossier.set(null);
      },
      error: () => {
        this.deleteLoading.set(false);
      }
    });
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  // Get status display label
  getStatusLabel(status: DossierStatus): string {
    const labels: Record<DossierStatus, string> = {
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

  // Truncate long addresses
  truncateAddress(address: string): string {
    return address.length > 20 ? address.substring(0, 20) + '...' : address;
  }

  /**
   * Get score badge styles with gradient from red to green
   * @param score - Note from 0 to 10
   * @returns Object with background and color styles
   */
  getScoreStyle(score: number | null): { [key: string]: string } {
    if (score === null || score === undefined) {
      return {
        background: '#f1f5f9',
        color: '#94a3b8'
      };
    }

    // Normalize score to 0-1 range
    const normalized = Math.max(0, Math.min(10, score)) / 10;

    // Color interpolation from red (0) -> yellow (5) -> green (10)
    let r: number, g: number, b: number;
    let bgR: number, bgG: number, bgB: number;

    if (normalized < 0.5) {
      // Red to Yellow (0-5)
      const t = normalized * 2;
      // Text color
      r = 220;
      g = Math.round(38 + t * (146 - 38));
      b = 38;
      // Background (lighter version)
      bgR = 254;
      bgG = Math.round(226 + t * (243 - 226));
      bgB = Math.round(226 + t * (195 - 226));
    } else {
      // Yellow to Green (5-10)
      const t = (normalized - 0.5) * 2;
      // Text color
      r = Math.round(184 - t * (184 - 22));
      g = Math.round(146 - t * (146 - 163) + t * 17);
      b = Math.round(38 + t * (74 - 38));
      // Background (lighter version)
      bgR = Math.round(254 - t * (254 - 220));
      bgG = Math.round(243 - t * (243 - 252) + t * 9);
      bgB = Math.round(195 + t * (231 - 195));
    }

    return {
      background: `rgb(${bgR}, ${bgG}, ${bgB})`,
      color: `rgb(${r}, ${g}, ${b})`
    };
  }
}
