import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { DossierType } from '../../models/dossier.model';

interface ApplicationFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  profession: string;
  monthlyIncome: number | undefined;
  message: string;
  // Acceptance
  acceptsTerms: boolean;
  acceptsContact: boolean;
}

interface PropertyInfo {
  id: number;
  address: string;
  city: string;
  zipCode: string;
  type: string;
  rent?: number;
  price?: number;
  surface?: number;
  rooms?: number;
  floor?: number;
}

/**
 * Public Application Component
 * Public page for users to create their dossier from a shared link
 * No authentication required
 */
@Component({
  selector: 'app-public-application',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './public-application.component.html',
  styleUrl: './public-application.component.css'
})
export class PublicApplicationComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);

  // Property info
  readonly propertyId = signal<number | null>(null);
  readonly property = signal<PropertyInfo | null>(null);
  readonly dossierType = signal<DossierType>('location');
  
  // State
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly submitted = signal(false);
  readonly error = signal<string | null>(null);
  readonly currentStep = signal(1);

  // Form data
  formData: ApplicationFormData = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    profession: '',
    monthlyIncome: undefined,
    message: '',
    acceptsTerms: false,
    acceptsContact: false
  };

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('propertyId');
    const typeParam = this.route.snapshot.queryParamMap.get('type');
    
    if (idParam) {
      this.propertyId.set(parseInt(idParam, 10));
      this.loadProperty(parseInt(idParam, 10));
    } else {
      this.loading.set(false);
      this.error.set('Lien invalide');
    }
    
    if (typeParam === 'location' || typeParam === 'vente') {
      this.dossierType.set(typeParam);
    }
  }

  private loadProperty(id: number): void {
    this.api.getProperties().subscribe({
      next: (properties) => {
        const prop = properties.find(p => p.id === id);
        if (prop) {
          this.property.set({
            id: prop.id,
            address: prop.address,
            city: prop.city,
            zipCode: prop.zipCode,
            type: prop.type,
            rent: prop.rent,
            price: prop.price,
            surface: prop.surface,
            rooms: prop.rooms,
            floor: prop.floor
          });
        } else {
          this.error.set('Bien non trouvé');
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Erreur de chargement');
        this.loading.set(false);
      }
    });
  }

  nextStep(): void {
    if (this.currentStep() < 2) {
      this.currentStep.update(s => s + 1);
    }
  }

  prevStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.update(s => s - 1);
    }
  }

  canProceed(): boolean {
    if (this.currentStep() === 1) {
      return !!(
        this.formData.firstName.trim() &&
        this.formData.lastName.trim() &&
        this.formData.email.trim() &&
        this.formData.phone.trim()
      );
    }
    return true;
  }

  canSubmit(): boolean {
    return this.formData.acceptsTerms && this.canProceed();
  }

  async submitApplication(): Promise<void> {
    if (!this.canSubmit() || this.submitting()) return;

    this.submitting.set(true);
    
    const prop = this.property();
    if (!prop) return;

    // Create the dossier
    const dossierData = {
      type: this.dossierType(),
      status: 'a_completer' as const,
      score: null,
      agentId: 1, // Default agent
      client: {
        id: Date.now(),
        firstName: this.formData.firstName,
        lastName: this.formData.lastName,
        email: this.formData.email,
        phone: this.formData.phone,
        type: this.dossierType() === 'location' 
          ? 'locataire' as const 
          : 'acheteur' as const
      },
      property: {
        id: prop.id,
        address: prop.address,
        city: prop.city,
        zipCode: prop.zipCode,
        type: prop.type,
        rent: prop.rent,
        price: prop.price
      },
      aiSummary: {
        description: `Candidature reçue via lien public. Profession: ${this.formData.profession}. Message: ${this.formData.message || 'Aucun'}`,
        strengths: [],
        warnings: ['Dossier à compléter - documents manquants']
      },
      checklist: this.getDefaultChecklist(),
      documents: [],
      history: [{
        id: 1,
        date: new Date().toISOString(),
        action: 'Candidature soumise via lien public',
        type: 'creation' as const
      }]
    };

    this.api.createDossier(dossierData).subscribe({
      next: () => {
        this.submitted.set(true);
        this.submitting.set(false);
      },
      error: () => {
        this.error.set('Erreur lors de la soumission');
        this.submitting.set(false);
      }
    });
  }

  private getDefaultChecklist() {
    return [
      { id: 1, name: "Carte d'identité R/V", status: 'pending' as const, required: true },
      { id: 2, name: 'Justificatif de domicile', status: 'pending' as const, required: true },
      { id: 3, name: 'Contrat de travail', status: 'pending' as const, required: true },
      { id: 4, name: '3 dernières fiches de paie', status: 'pending' as const, required: true },
      { id: 5, name: 'Dernier avis d\'imposition', status: 'pending' as const, required: true },
      { id: 6, name: 'RIB', status: 'pending' as const, required: false }
    ];
  }
}

