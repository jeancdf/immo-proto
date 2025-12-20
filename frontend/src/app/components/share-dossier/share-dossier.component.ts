import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { StateService } from '../../services/state.service';

/**
 * Share Dossier Component
 * Allows sharing a dossier with professionals (notaire, bank, etc.)
 */
@Component({
  selector: 'app-share-dossier',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './share-dossier.component.html',
  styleUrl: './share-dossier.component.css'
})
export class ShareDossierComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly state = inject(StateService);

  // Dossier info
  readonly dossierId = signal<number | null>(null);
  readonly dossier = this.state.selectedDossier;

  // Form state
  readonly selectedRecipient = signal<string>('notaire');
  readonly selectedDocuments = signal<string[]>(['identity', 'diagnostics']);
  readonly permission = signal<'read' | 'upload'>('read');
  readonly allowDownload = signal(true);
  readonly validity = signal(30);
  readonly useCode = signal(false);
  accessCode = '';

  // Generated link
  readonly generatedLink = signal<string>('');
  readonly copied = signal(false);

  // Options
  readonly recipientTypes = [
    { id: 'notaire', name: 'Notaire' },
    { id: 'diagnostiqueur', name: 'Diagnostiqueur' },
    { id: 'banque', name: 'Banque / Courtier' },
    { id: 'autre', name: 'Autre' }
  ];

  readonly documentTypes = [
    { id: 'identity', name: 'Identité' },
    { id: 'diagnostics', name: 'Diagnostics' },
    { id: 'financial', name: 'Documents financiers' },
    { id: 'copro', name: 'Copropriété / Syndic' },
    { id: 'contracts', name: 'Contrats / Compromis' },
    { id: 'other', name: 'Autres documents' }
  ];

  // Computed
  readonly allDocumentsSelected = computed(() => {
    return this.selectedDocuments().length === this.documentTypes.length;
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.dossierId.set(parseInt(id, 10));
      this.state.loadDossierById(parseInt(id, 10));
    }
  }

  selectRecipient(id: string): void {
    this.selectedRecipient.set(id);
  }

  toggleDocument(id: string): void {
    const current = this.selectedDocuments();
    if (current.includes(id)) {
      this.selectedDocuments.set(current.filter(d => d !== id));
    } else {
      this.selectedDocuments.set([...current, id]);
    }
  }

  toggleAllDocuments(): void {
    if (this.allDocumentsSelected()) {
      this.selectedDocuments.set([]);
    } else {
      this.selectedDocuments.set(this.documentTypes.map(d => d.id));
    }
  }

  setPermission(perm: 'read' | 'upload'): void {
    this.permission.set(perm);
  }

  toggleDownload(): void {
    this.allowDownload.update(v => !v);
  }

  setValidity(days: number): void {
    this.validity.set(days);
  }

  toggleCode(): void {
    this.useCode.update(v => !v);
    if (!this.useCode()) {
      this.accessCode = '';
    }
  }

  getRecipientName(): string {
    const recipient = this.recipientTypes.find(
      r => r.id === this.selectedRecipient()
    );
    return recipient?.name || 'Destinataire';
  }

  getSelectedDocumentsText(): string {
    const selected = this.selectedDocuments();
    const names = this.documentTypes
      .filter(d => selected.includes(d.id))
      .map(d => d.name);
    return names.length > 0 ? names.join(', ') : 'Aucun document';
  }

  getPermissionsText(): string {
    const parts: string[] = [];
    parts.push(this.permission() === 'read' ? 'Lecture seule' : 'Lecture + Upload');
    if (this.allowDownload()) {
      parts.push('Téléchargement autorisé');
    }
    return parts.join(', ');
  }

  generateLink(): void {
    // Generate a random share ID
    const shareId = Math.random().toString(36).substring(2, 8);
    const link = `https://dossierhub.com/s/${this.selectedRecipient().substring(0, 3)}-${this.dossierId()}-${shareId}`;
    this.generatedLink.set(link);
  }

  generateQRCode(): void {
    // Generate link first if not exists
    if (!this.generatedLink()) {
      this.generateLink();
    }
    // In real app, would generate QR code image
    console.log('Generate QR for:', this.generatedLink());
  }

  copyLink(): void {
    navigator.clipboard.writeText(this.generatedLink());
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }
}

