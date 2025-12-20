import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface RequiredDocument {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'partial' | 'complete';
}

interface SubmittedDocument {
  id: string;
  filename: string;
  type: string;
  date: string;
  reviewStatus: 'accepted' | 'pending' | 'rejected';
}

/**
 * Client Deposit Component
 * Public page for clients to upload documents for their dossier
 * Accessible via shared link without authentication
 */
@Component({
  selector: 'app-client-deposit',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './client-deposit.component.html',
  styleUrl: './client-deposit.component.css'
})
export class ClientDepositComponent {
  // Agency info (would come from share link params)
  agencyName = 'Agence ImmoParis';
  dossierType = 'Location';

  // Progress
  progressPercent = 65;
  documentsProvided = 4;
  totalDocuments = 6;

  // UI State
  readonly expandedDoc = signal<string | null>(null);
  readonly isDragging = signal(false);

  // Required documents list
  requiredDocuments: RequiredDocument[] = [
    {
      id: 'identity',
      name: "Carte d'identité",
      description: 'Photo ou PDF lisible. Les deux faces sont nécessaires.',
      status: 'pending'
    },
    {
      id: 'payslips',
      name: '3 dernières fiches de paie',
      description: 'Un seul fichier PDF ou plusieurs photos.',
      status: 'partial'
    },
    {
      id: 'address',
      name: 'Justificatif de domicile',
      description: 'Facture EDF, téléphone ou quittance de loyer < 3 mois.',
      status: 'pending'
    }
  ];

  // Already submitted documents
  submittedDocuments: SubmittedDocument[] = [
    {
      id: '1',
      filename: 'Avis_Imposition_2023.pdf',
      type: "Avis d'imposition",
      date: '12/06/2024',
      reviewStatus: 'accepted'
    },
    {
      id: '2',
      filename: 'Fiches_Paie_Mars_Avril_Mai.pdf',
      type: 'Fiches de paie',
      date: '10/06/2024',
      reviewStatus: 'pending'
    },
    {
      id: '3',
      filename: 'CNI_recto.jpg',
      type: "Carte d'identité",
      date: '09/06/2024',
      reviewStatus: 'rejected'
    }
  ];

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Non fourni',
      partial: 'En cours',
      complete: 'Complet'
    };
    return labels[status] || status;
  }

  getReviewLabel(status: string): string {
    const labels: Record<string, string> = {
      accepted: 'Accepté',
      pending: 'En vérification',
      rejected: 'À remplacer'
    };
    return labels[status] || status;
  }

  toggleExpand(docId: string): void {
    if (this.expandedDoc() === docId) {
      this.expandedDoc.set(null);
    } else {
      this.expandedDoc.set(docId);
    }
  }

  openUpload(docId: string, event: Event): void {
    event.stopPropagation();
    this.expandedDoc.set(docId);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent, docId: string): void {
    event.preventDefault();
    this.isDragging.set(false);
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0], docId);
    }
  }

  onFileSelected(event: Event, docId: string): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0], docId);
    }
  }

  private handleFile(file: File, docId: string): void {
    console.log('Uploading file:', file.name, 'for document:', docId);
    
    // In real app, would upload to server
    // For now, update the document status
    const doc = this.requiredDocuments.find(d => d.id === docId);
    if (doc) {
      doc.status = 'partial';
    }
    
    // Add to submitted documents
    this.submittedDocuments.unshift({
      id: Date.now().toString(),
      filename: file.name,
      type: doc?.name || 'Document',
      date: new Date().toLocaleDateString('fr-FR'),
      reviewStatus: 'pending'
    });
    
    // Update progress
    this.documentsProvided++;
    this.progressPercent = Math.round(
      (this.documentsProvided / this.totalDocuments) * 100
    );
    
    // Close the upload zone
    this.expandedDoc.set(null);
  }

  submitDossier(): void {
    console.log('Dossier submitted!');
    // In real app, would notify the agency
    alert('Merci ! Votre dossier a été transmis à l\'agence.');
  }
}

