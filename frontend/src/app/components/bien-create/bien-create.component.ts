import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

/**
 * Form data structure for creating properties
 */
interface PropertyCreateFormData {
  // Type de transaction
  transactionType: 'location' | 'vente';
  
  // Adresse
  address: string;
  city: string;
  zipCode: string;
  
  // Type de bien
  propertyType: string;
  
  // Caractéristiques générales
  description: string;
  surface: number | null;
  rooms: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floor: number | null;
  totalFloors: number | null;
  buildYear: number | null;
  
  // Équipements
  hasParking: boolean;
  hasCellar: boolean;
  hasElevator: boolean;
  hasBalcony: boolean;
  hasTerrace: boolean;
  hasGarden: boolean;
  isFurnished: boolean;
  
  // Prix (Location)
  rent: number | null;
  charges: number | null;
  deposit: number | null;
  
  // Prix (Vente)
  price: number | null;
  pricePerSqm: number | null;
  agencyFees: number | null;
  notaryFees: number | null;
  
  // Diagnostics (Vente)
  dpeGrade: string;
  gesGrade: string;
  
  // Copropriété
  isInCopro: boolean;
  coproCharges: number | null;
  coproLots: number | null;
  
  // Disponibilité
  availableFrom: string;
  
  // Notes
  internalNotes: string;
}

/**
 * Bien Create Component
 * Dedicated page for creating new properties
 * Adapts fields based on transaction type (location/vente)
 */
@Component({
  selector: 'app-bien-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bien-create.component.html',
  styleUrl: './bien-create.component.css'
})
export class BienCreateComponent {
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);

  // State
  readonly saving = signal(false);
  readonly currentStep = signal(1);
  readonly totalSteps = 4;

  // Form data
  formData: PropertyCreateFormData = this.getEmptyFormData();

  // Property types options
  readonly propertyTypes = [
    'Studio',
    'T1',
    'T2',
    'T3',
    'T4',
    'T5+',
    'Maison',
    'Villa',
    'Loft',
    'Duplex',
    'Triplex',
    'Penthouse',
    'Local commercial',
    'Bureau',
    'Terrain',
    'Parking',
    'Autre'
  ];

  // DPE/GES grades
  readonly energyGrades = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'Non renseigné'];

  private getEmptyFormData(): PropertyCreateFormData {
    return {
      transactionType: 'location',
      address: '',
      city: '',
      zipCode: '',
      propertyType: 'T2',
      description: '',
      surface: null,
      rooms: null,
      bedrooms: null,
      bathrooms: null,
      floor: null,
      totalFloors: null,
      buildYear: null,
      hasParking: false,
      hasCellar: false,
      hasElevator: false,
      hasBalcony: false,
      hasTerrace: false,
      hasGarden: false,
      isFurnished: false,
      rent: null,
      charges: null,
      deposit: null,
      price: null,
      pricePerSqm: null,
      agencyFees: null,
      notaryFees: null,
      dpeGrade: 'Non renseigné',
      gesGrade: 'Non renseigné',
      isInCopro: false,
      coproCharges: null,
      coproLots: null,
      availableFrom: '',
      internalNotes: ''
    };
  }

  // Step navigation
  nextStep(): void {
    if (this.currentStep() < this.totalSteps) {
      this.currentStep.update(s => s + 1);
    }
  }

  prevStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.update(s => s - 1);
    }
  }

  goToStep(step: number): void {
    if (step >= 1 && step <= this.totalSteps) {
      this.currentStep.set(step);
    }
  }

  // Validation per step
  isStepValid(step: number): boolean {
    switch (step) {
      case 1: // Transaction type & address
        return !!(
          this.formData.transactionType &&
          this.formData.address.trim() &&
          this.formData.city.trim() &&
          this.formData.zipCode.trim()
        );
      case 2: // Characteristics
        return !!(
          this.formData.propertyType &&
          this.formData.surface && this.formData.surface > 0
        );
      case 3: // Price
        if (this.formData.transactionType === 'location') {
          return !!(this.formData.rent && this.formData.rent > 0);
        } else {
          return !!(this.formData.price && this.formData.price > 0);
        }
      case 4: // Final details
        return true; // Optional step
      default:
        return false;
    }
  }

  canProceed(): boolean {
    return this.isStepValid(this.currentStep());
  }

  // Calculate price per sqm
  calculatePricePerSqm(): void {
    if (this.formData.price && this.formData.surface) {
      this.formData.pricePerSqm = Math.round(
        this.formData.price / this.formData.surface
      );
    }
  }

  // Calculate deposit (usually 1-2 months rent)
  calculateDeposit(): void {
    if (this.formData.rent) {
      this.formData.deposit = this.formData.rent;
    }
  }

  // Cancel and go back
  cancel(): void {
    this.router.navigate(['/biens']);
  }

  // Submit form
  onSubmit(): void {
    if (this.saving()) return;
    if (!this.isStepValid(1) || !this.isStepValid(2) || !this.isStepValid(3)) {
      alert('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    this.saving.set(true);

    // Prepare data for API
    const propertyData = {
      address: this.formData.address,
      city: this.formData.city,
      zipCode: this.formData.zipCode,
      type: this.formData.propertyType,
      transactionType: this.formData.transactionType,
      description: this.formData.description,
      surface: this.formData.surface,
      rooms: this.formData.rooms,
      bedrooms: this.formData.bedrooms,
      bathrooms: this.formData.bathrooms,
      floor: this.formData.floor,
      totalFloors: this.formData.totalFloors,
      buildYear: this.formData.buildYear,
      hasParking: this.formData.hasParking,
      hasCellar: this.formData.hasCellar,
      hasElevator: this.formData.hasElevator,
      hasBalcony: this.formData.hasBalcony,
      hasTerrace: this.formData.hasTerrace,
      hasGarden: this.formData.hasGarden,
      isFurnished: this.formData.isFurnished,
      rent: this.formData.transactionType === 'location' 
        ? this.formData.rent : null,
      charges: this.formData.charges,
      deposit: this.formData.deposit,
      price: this.formData.transactionType === 'vente' 
        ? this.formData.price : null,
      pricePerSqm: this.formData.pricePerSqm,
      agencyFees: this.formData.agencyFees,
      notaryFees: this.formData.notaryFees,
      dpeGrade: this.formData.dpeGrade,
      gesGrade: this.formData.gesGrade,
      isInCopro: this.formData.isInCopro,
      coproCharges: this.formData.coproCharges,
      coproLots: this.formData.coproLots,
      availableFrom: this.formData.availableFrom,
      internalNotes: this.formData.internalNotes
    };

    // Call API to create property
    this.api.createProperty(propertyData).subscribe({
      next: (response) => {
        this.saving.set(false);
        // Navigate to the new property or list
        if (response && response.id) {
          this.router.navigate(['/biens', response.id]);
        } else {
          this.router.navigate(['/biens']);
        }
      },
      error: (err) => {
        console.error('Error creating property:', err);
        this.saving.set(false);
        alert('Erreur lors de la création du bien. Veuillez réessayer.');
      }
    });
  }

  // Get step title
  getStepTitle(step: number): string {
    const titles = [
      'Type & Adresse',
      'Caractéristiques',
      'Prix & Charges',
      'Détails & Disponibilité'
    ];
    return titles[step - 1] || '';
  }
}

