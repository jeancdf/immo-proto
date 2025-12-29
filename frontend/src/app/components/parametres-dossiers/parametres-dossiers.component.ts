import { Component, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Document category options for dossier configuration
type DocumentCategory = 
  | 'identite' 
  | 'domicile' 
  | 'revenus' 
  | 'garant' 
  | 'autre';

// Required document in a dossier checklist
interface RequiredDocument {
  id: string;
  name: string;
  category: DocumentCategory;
}

// Scoring criterion for dossier evaluation
interface ScoringCriterion {
  id: string;
  name: string;
  weight: number;
}

// Dossier profile template
interface DossierProfile {
  id: string;
  name: string;
  documents: RequiredDocument[];
  scoringCriteria: ScoringCriterion[];
}

/**
 * Parametres Dossiers Component
 * Configuration screen for dossier requirements (Location/Vente)
 * Includes document checklist and scoring criteria sliders
 */
@Component({
  selector: 'app-parametres-dossiers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './parametres-dossiers.component.html',
  styleUrl: './parametres-dossiers.component.css'
})
export class ParametresDossiersComponent {
  @Output() saved = new EventEmitter<void>();
  
  // UI State
  readonly saving = signal(false);
  readonly activeSubTab = signal<'location' | 'vente'>('location');
  readonly selectedProfileId = signal<string>('standard');
  
  // Document categories for dropdown
  readonly documentCategories: { value: DocumentCategory; label: string }[] = [
    { value: 'identite', label: 'Identité' },
    { value: 'domicile', label: 'Domicile' },
    { value: 'revenus', label: 'Revenus' },
    { value: 'garant', label: 'Garant' },
    { value: 'autre', label: 'Autre' }
  ];
  
  // Location profiles
  locationProfiles: DossierProfile[] = [
    {
      id: 'standard',
      name: 'Dossier Standard',
      documents: [
        { 
          id: 'doc1', 
          name: 'Carte d\'identité (Recto/Verso)', 
          category: 'identite' 
        },
        { 
          id: 'doc2', 
          name: '3 dernières quittances de loyer', 
          category: 'domicile' 
        },
        { 
          id: 'doc3', 
          name: 'Contrat de travail', 
          category: 'revenus' 
        },
        { 
          id: 'doc4', 
          name: '3 dernières fiches de paie', 
          category: 'revenus' 
        },
        { 
          id: 'doc5', 
          name: 'Dernier avis d\'imposition', 
          category: 'revenus' 
        }
      ],
      scoringCriteria: [
        { id: 'crit1', name: 'Ratio Loyer / Revenus', weight: 45 },
        { id: 'crit2', name: 'Type de contrat (CDI/CDD)', weight: 25 },
        { id: 'crit3', name: 'Ancienneté dans l\'entreprise', weight: 15 },
        { id: 'crit4', name: 'Garant physique ou Visale', weight: 15 }
      ]
    }
  ];
  
  // Vente profiles
  venteProfiles: DossierProfile[] = [
    {
      id: 'standard',
      name: 'Dossier Standard',
      documents: [
        { id: 'vdoc1', name: 'Titre de propriété', category: 'identite' },
        { id: 'vdoc2', name: 'Diagnostics immobiliers', category: 'autre' },
        { id: 'vdoc3', name: 'Règlement de copropriété', category: 'autre' },
        { id: 'vdoc4', name: 'PV des 3 dernières AG', category: 'autre' },
        { id: 'vdoc5', name: 'Carnet d\'entretien', category: 'autre' }
      ],
      scoringCriteria: [
        { id: 'vcrit1', name: 'Complétude du dossier', weight: 40 },
        { id: 'vcrit2', name: 'Conformité diagnostics', weight: 35 },
        { id: 'vcrit3', name: 'Documents copropriété', weight: 25 }
      ]
    }
  ];
  
  // Switch sub-tab
  setSubTab(tab: 'location' | 'vente'): void {
    this.activeSubTab.set(tab);
    this.selectedProfileId.set('standard');
  }
  
  // Get current profiles based on sub-tab
  getCurrentProfiles(): DossierProfile[] {
    return this.activeSubTab() === 'location' 
      ? this.locationProfiles 
      : this.venteProfiles;
  }
  
  // Get current profile
  getCurrentProfile(): DossierProfile | undefined {
    return this.getCurrentProfiles().find(
      p => p.id === this.selectedProfileId()
    );
  }
  
  // Add new document
  addDocument(): void {
    const profile = this.getCurrentProfile();
    if (!profile) return;
    
    const newId = 'doc_' + Date.now();
    profile.documents.push({
      id: newId,
      name: '',
      category: 'autre'
    });
  }
  
  // Remove document
  removeDocument(docId: string): void {
    const profile = this.getCurrentProfile();
    if (!profile) return;
    
    profile.documents = profile.documents.filter(d => d.id !== docId);
  }
  
  // Update document name
  updateDocumentName(docId: string, name: string): void {
    const profile = this.getCurrentProfile();
    if (!profile) return;
    
    const doc = profile.documents.find(d => d.id === docId);
    if (doc) {
      doc.name = name;
    }
  }
  
  // Update document category
  updateDocumentCategory(docId: string, category: DocumentCategory): void {
    const profile = this.getCurrentProfile();
    if (!profile) return;
    
    const doc = profile.documents.find(d => d.id === docId);
    if (doc) {
      doc.category = category;
    }
  }
  
  // Update scoring criterion weight
  updateCriterionWeight(critId: string, weight: number): void {
    const profile = this.getCurrentProfile();
    if (!profile) return;
    
    const criterion = profile.scoringCriteria.find(c => c.id === critId);
    if (criterion) {
      criterion.weight = Math.max(0, Math.min(100, weight));
    }
  }
  
  // Get total weight of all criteria
  getTotalWeight(): number {
    const profile = this.getCurrentProfile();
    if (!profile) return 0;
    
    return profile.scoringCriteria.reduce((sum, c) => sum + c.weight, 0);
  }
  
  // Save settings
  saveSettings(): void {
    this.saving.set(true);
    // Simulate API call
    setTimeout(() => {
      this.saving.set(false);
      this.saved.emit();
    }, 500);
  }
  
  // Get category label
  getCategoryLabel(category: DocumentCategory): string {
    const found = this.documentCategories.find(c => c.value === category);
    return found ? found.label : category;
  }
}

