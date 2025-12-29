import { Component, inject, signal, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DocumentSource, CollectDocument, CollectLink } from '../../models/dossier.model';

interface VenteTemplate {
  name: string;
  documents: Record<string, any[]>;
}

/**
 * Vente Collect Component
 * Manages document collection links for property sales
 * Allows agents to create links for different parties (seller, syndic, bank, etc.)
 */
@Component({
  selector: 'app-vente-collect',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vente-collect.component.html',
  styleUrl: './vente-collect.component.css'
})
export class VenteCollectComponent implements OnInit {
  private readonly http = inject(HttpClient);

  @Input() dossierId!: number;
  @Input() templateType: string = 'appartement_copropriete';

  // State
  readonly collectLinks = signal<CollectLink[]>([]);
  readonly sources = signal<DocumentSource[]>([]);
  readonly templates = signal<Record<string, VenteTemplate>>({});
  readonly loading = signal(true);
  readonly showAddForm = signal(false);
  readonly selectedLink = signal<CollectLink | null>(null);
  readonly linkCopied = signal(false);

  // Form data for new link
  newLink = {
    sourceType: '',
    sourceName: '',
    sourceEmail: ''
  };

  ngOnInit(): void {
    this.loadTemplates();
    this.loadCollectLinks();
  }

  loadTemplates(): void {
    this.http.get<{ sources: DocumentSource[], templates: Record<string, VenteTemplate> }>(
      '/api/vente/templates'
    ).subscribe({
      next: (data) => {
        this.sources.set(data.sources);
        this.templates.set(data.templates);
      }
    });
  }

  loadCollectLinks(): void {
    this.loading.set(true);
    this.http.get<CollectLink[]>(`/api/dossiers/${this.dossierId}/collect-links`)
      .subscribe({
        next: (links) => {
          this.collectLinks.set(links);
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
  }

  toggleAddForm(): void {
    this.showAddForm.update(v => !v);
    if (!this.showAddForm()) {
      this.resetForm();
    }
  }

  createLink(): void {
    if (!this.newLink.sourceType || !this.newLink.sourceName) return;

    this.http.post<CollectLink>(`/api/dossiers/${this.dossierId}/collect-links`, {
      ...this.newLink,
      templateType: this.templateType
    }).subscribe({
      next: (link) => {
        this.collectLinks.update(links => [...links, link]);
        this.resetForm();
        this.showAddForm.set(false);
      }
    });
  }

  copyLink(link: CollectLink): void {
    const url = `${window.location.origin}/collect/${link.token}`;
    navigator.clipboard.writeText(url).then(() => {
      this.linkCopied.set(true);
      setTimeout(() => this.linkCopied.set(false), 2000);
    });
  }

  viewDetails(link: CollectLink): void {
    // Load enriched details
    this.http.get<any>(`/api/collect/${link.token}`).subscribe({
      next: (details) => {
        this.selectedLink.set({
          ...link,
          documents: details.documents
        });
      }
    });
  }

  closeDetails(): void {
    this.selectedLink.set(null);
  }

  updateDocStatus(
    link: CollectLink, 
    docId: string, 
    status: 'pending' | 'received' | 'not_applicable'
  ): void {
    this.http.patch<any>(
      `/api/collect-links/${link.id}/documents/${docId}`,
      { status }
    ).subscribe({
      next: () => {
        // Update local state
        this.selectedLink.update(l => {
          if (!l) return null;
          return {
            ...l,
            documents: l.documents.map(d => 
              d.docId === docId ? { ...d, status } : d
            )
          };
        });
        // Reload all links to update stats
        this.loadCollectLinks();
      }
    });
  }

  deleteLink(link: CollectLink): void {
    if (!confirm(`Supprimer le lien pour ${link.sourceName} ?`)) return;

    this.http.delete(`/api/collect-links/${link.id}`).subscribe({
      next: () => {
        this.collectLinks.update(links => links.filter(l => l.id !== link.id));
        if (this.selectedLink()?.id === link.id) {
          this.selectedLink.set(null);
        }
      }
    });
  }

  private resetForm(): void {
    this.newLink = {
      sourceType: '',
      sourceName: '',
      sourceEmail: ''
    };
  }

  getAvailableSources(): DocumentSource[] {
    const usedTypes = this.collectLinks().map(l => l.sourceType);
    return this.sources().filter(s => !usedTypes.includes(s.id));
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'En attente',
      received: 'Reçu',
      not_applicable: 'Non applicable'
    };
    return labels[status] || status;
  }

  formatDate(dateString: string | null): string {
    if (!dateString) return 'Jamais';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
