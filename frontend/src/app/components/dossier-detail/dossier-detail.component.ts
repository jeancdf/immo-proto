import { Component, inject, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { StateService } from '../../services/state.service';

/**
 * Dossier Detail Component
 * Shows complete information about a single dossier
 * Uses StateService signals for reactive state management
 */
@Component({
  selector: 'app-dossier-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dossier-detail.component.html',
  styleUrl: './dossier-detail.component.css'
})
export class DossierDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly state = inject(StateService);

  // Expose signals from state service
  readonly dossier = this.state.selectedDossier;
  readonly loading = this.state.loadingDossierDetail;

  // Local state
  readonly documentFilter = signal('');
  readonly linkCopied = signal(false);
  
  // Computed filtered documents
  readonly filteredDocuments = computed(() => {
    const dossier = this.dossier();
    if (!dossier) return [];
    
    const query = this.documentFilter().toLowerCase().trim();
    const docs = dossier.documents || [];
    
    if (!query) return docs;
    
    return docs.filter(doc =>
      doc.filename.toLowerCase().includes(query) ||
      doc.type.toLowerCase().includes(query)
    );
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.state.loadDossierById(parseInt(id, 10));
    }
  }

  // Navigate back to dashboard
  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  // Navigate to edit page
  editDossier(): void {
    const id = this.dossier()?.id;
    if (id) {
      this.router.navigate(['/dossier', id, 'edit']);
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

  // Format date for display
  formatDate(dateStr: string): string {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  }

  // Filter documents based on search query
  filterDocuments(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this.documentFilter.set(query);
  }

  // Update checklist item status
  updateChecklistItem(checklistId: number, newStatus: string): void {
    const dossierId = this.dossier()?.id;
    if (dossierId) {
      this.state.updateChecklistItem(dossierId, checklistId, { 
        status: newStatus 
      }).subscribe();
    }
  }

  // Navigate to share dossier page
  shareDossier(): void {
    const id = this.dossier()?.id;
    if (id) {
      this.router.navigate(['/dossier', id, 'share']);
    }
  }

  // Send reminder for missing documents
  sendReminder(): void {
    const dossier = this.dossier();
    if (dossier) {
      // In real app, would send email/notification
      alert(`Relance envoyée à ${dossier.client.email} pour les pièces manquantes.`);
    }
  }

  // Copy deposit link to clipboard
  copyDepositLink(): void {
    const id = this.dossier()?.id;
    if (id) {
      const link = `${window.location.origin}/deposit/${id}`;
      navigator.clipboard.writeText(link);
      this.linkCopied.set(true);
      setTimeout(() => this.linkCopied.set(false), 2000);
    }
  }
}
