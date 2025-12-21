import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Document, DocumentAnalysis } from '../../models/dossier.model';

/**
 * Document Analysis Panel Component
 * Displays AI analysis results for a document in a slide-in panel
 * Integrated directly into the dossier detail view
 */
@Component({
  selector: 'app-document-analysis-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './document-analysis-panel.component.html',
  styleUrl: './document-analysis-panel.component.css'
})
export class DocumentAnalysisPanelComponent {
  @Input() document: Document | null = null;
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();

  // Simulate analyzing state for demo
  readonly isAnalyzing = signal(false);

  // Get analysis from document
  get analysis(): DocumentAnalysis | null | undefined {
    return this.document?.analysis;
  }

  // Get status class for styling
  getStatusClass(): string {
    const status = this.analysis?.status;
    if (!status) return 'pending';
    return status;
  }

  // Get status label in French
  getStatusLabel(): string {
    const labels: Record<string, string> = {
      pending: 'En attente',
      analyzing: 'Analyse en cours...',
      validated: 'Validé',
      warning: 'Attention requise',
      rejected: 'Rejeté'
    };
    return labels[this.analysis?.status || 'pending'] || 'Inconnu';
  }

  // Get confidence color
  getConfidenceClass(): string {
    const confidence = this.analysis?.confidence || 0;
    if (confidence >= 90) return 'high';
    if (confidence >= 70) return 'medium';
    return 'low';
  }

  // Get alert icon
  getAlertIcon(type: string): string {
    const icons: Record<string, string> = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌'
    };
    return icons[type] || 'ℹ️';
  }

  // Format extracted data for display
  getExtractedDataEntries(): { key: string; value: string }[] {
    const data = this.analysis?.extractedData;
    if (!data) return [];
    
    const labels: Record<string, string> = {
      type: 'Type de document',
      nom: 'Nom',
      prenom: 'Prénom',
      dateNaissance: 'Date de naissance',
      lieuNaissance: 'Lieu de naissance',
      numeroDocument: 'N° de document',
      dateExpiration: 'Date d\'expiration',
      sexe: 'Sexe',
      employeur: 'Employeur',
      periode: 'Période',
      salaireBrut: 'Salaire brut',
      salaireNet: 'Salaire net',
      primes: 'Primes',
      anneeRevenus: 'Année des revenus',
      revenuFiscal: 'Revenu fiscal',
      nombreParts: 'Nombre de parts',
      montantImpot: 'Montant impôt',
      adresseFiscale: 'Adresse fiscale',
      poste: 'Poste',
      dateDebut: 'Date de début',
      lieuTravail: 'Lieu de travail',
      classification: 'Classification',
      salaireAnnuel: 'Salaire annuel',
      dateActe: 'Date de l\'acte',
      vendeur: 'Vendeur',
      acquereur: 'Acquéreur',
      bien: 'Bien',
      surface: 'Surface',
      terrain: 'Terrain',
      prix: 'Prix',
      notaire: 'Notaire',
      dpe: 'DPE',
      ges: 'GES',
      amiante: 'Amiante',
      plomb: 'Plomb',
      electricite: 'Électricité',
      gaz: 'Gaz',
      validite: 'Validité',
      dateSignature: 'Date de signature',
      conditionsSuspensives: 'Conditions suspensives',
      dateButoir: 'Date butoir',
      statut: 'Statut',
      echelon: 'Échelon',
      dateEmbauche: 'Date d\'embauche',
      contenu: 'Contenu',
      revenus: 'Revenus',
      situation: 'Situation',
      salaireMoyen: 'Salaire moyen'
    };

    return Object.entries(data).map(([key, value]) => ({
      key: labels[key] || key,
      value: String(value)
    }));
  }

  // Format analysis date
  formatAnalysisDate(): string {
    const date = this.analysis?.analyzedAt;
    if (!date) return '';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Close the panel
  onClose(): void {
    this.close.emit();
  }

  // Simulate re-analysis (for demo)
  reAnalyze(): void {
    this.isAnalyzing.set(true);
    // Simulate processing time
    setTimeout(() => {
      this.isAnalyzing.set(false);
    }, 2000);
  }
}

