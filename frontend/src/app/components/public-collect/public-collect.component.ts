import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';

interface CollectDocument {
  docId: string;
  status: 'pending' | 'received' | 'not_applicable';
  fileName?: string;
  uploadedAt?: string;
  name: string;
  required: boolean;
  condition?: string;
}

interface CollectData {
  sourceName: string;
  sourceType: string;
  sourceInfo: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
  property: {
    address: string;
    city: string;
    zipCode: string;
  } | null;
  agencyName: string;
  documents: CollectDocument[];
  expiresAt: string;
}

/**
 * Public Collect Component
 * Public page for third parties to upload documents
 * Accessed via unique token link
 */
@Component({
  selector: 'app-public-collect',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './public-collect.component.html',
  styleUrl: './public-collect.component.css'
})
export class PublicCollectComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);

  readonly collectData = signal<CollectData | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly uploadingDoc = signal<string | null>(null);

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token');
    if (token) {
      this.loadCollectData(token);
    } else {
      this.error.set('Lien invalide');
      this.loading.set(false);
    }
  }

  loadCollectData(token: string): void {
    this.http.get<CollectData>(`/api/collect/${token}`).subscribe({
      next: (data) => {
        this.collectData.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        if (err.status === 404) {
          this.error.set('Ce lien n\'existe pas ou a été supprimé.');
        } else if (err.status === 410) {
          this.error.set('Ce lien a expiré. Contactez l\'agence.');
        } else {
          this.error.set('Une erreur est survenue.');
        }
        this.loading.set(false);
      }
    });
  }

  uploadDocument(doc: CollectDocument): void {
    // In a real app, this would open a file picker and upload
    // For demo, we'll simulate the upload
    const token = this.route.snapshot.paramMap.get('token');
    if (!token) return;

    this.uploadingDoc.set(doc.docId);

    // Simulate file name
    const fileName = `${doc.name.toLowerCase().replace(/\s+/g, '_')}.pdf`;

    this.http.post(`/api/collect/${token}/upload`, {
      docId: doc.docId,
      fileName
    }).subscribe({
      next: () => {
        this.collectData.update(data => {
          if (!data) return null;
          return {
            ...data,
            documents: data.documents.map(d => 
              d.docId === doc.docId 
                ? { ...d, status: 'received' as const, fileName }
                : d
            )
          };
        });
        this.uploadingDoc.set(null);
      },
      error: () => {
        this.uploadingDoc.set(null);
      }
    });
  }

  getSourceIcon(): string {
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
    const icon = this.collectData()?.sourceInfo?.icon || 'clipboard';
    return icons[icon] || icons['clipboard'];
  }

  getProgressStats(): { received: number; total: number; percentage: number } {
    const docs = this.collectData()?.documents || [];
    const applicable = docs.filter(d => d.status !== 'not_applicable');
    const received = applicable.filter(d => d.status === 'received').length;
    const total = applicable.length;
    return {
      received,
      total,
      percentage: total > 0 ? Math.round(received / total * 100) : 0
    };
  }

  formatExpiryDate(): string {
    const data = this.collectData();
    if (!data) return '';
    return new Date(data.expiresAt).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
}

