import { Component, inject, signal, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface DocumentSource {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface CollectDocument {
  docId: string;
  status: 'pending' | 'received' | 'not_applicable';
  fileName?: string;
  uploadedAt?: string;
  name?: string;
  required?: boolean;
  condition?: string;
}

interface CollectLink {
  id: number;
  token: string;
  dossierId: number;
  sourceType: string;
  sourceName: string;
  sourceEmail: string;
  templateType: string;
  documents: CollectDocument[];
  sourceInfo: DocumentSource;
  stats: {
    received: number;
    total: number;
    percentage: number;
  };
  createdAt: string;
  expiresAt: string;
  lastAccessedAt: string | null;
}

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

  getSourceIcon(type: string): string {
    const icons: Record<string, string> = {
      user: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 3a4 4 0 100 8 4 4 0 000-8z',
      building: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 ' +
                '0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 ' +
                '1 0 011 1v5m-4 0h4',
      bank: 'M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11m16-11v11M8 14v3m4-3v3m4-3v3',
      clipboard: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 ' +
                 '00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 ' +
                 '2 0 012 2m-6 9l2 2 4-4',
      scale: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 ' +
             '1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 ' +
             '16H9m3 0h3'
    };
    const source = this.sources().find(s => s.id === type);
    return icons[source?.icon || 'clipboard'] || icons['clipboard'];
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

