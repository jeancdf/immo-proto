import { 
  Component, 
  inject, 
  signal, 
  computed,
  OnInit 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { StateService } from '../../services/state.service';
import { PropertyWithDossiers } from '../../models/dossier.model';

/**
 * Form data structure for editing properties
 */
interface PropertyFormData {
  address: string;
  city: string;
  zipCode: string;
  type: string;
  description?: string;
  surface?: number;
  rooms?: number;
  floor?: number;
  hasParking?: boolean;
  hasCellar?: boolean;
  hasElevator?: boolean;
  rent?: number;
  price?: number;
  charges?: number;
}

/**
 * Bien Edit Component
 * Dedicated page for editing property details
 */
@Component({
  selector: 'app-bien-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './bien-edit.component.html',
  styleUrl: './bien-edit.component.css'
})
export class BienEditComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly state = inject(StateService);

  // Route parameter
  readonly propertyId = signal<number | null>(null);

  // Local state
  readonly loading = signal(false);
  readonly saving = signal(false);

  // Original property from state
  readonly property = computed(() => {
    const id = this.propertyId();
    if (!id) return null;
    return this.state.getPropertyById(id) || null;
  });

  // Form data
  formData: PropertyFormData = this.getEmptyFormData();

  // Property types options
  readonly propertyTypes = [
    'Studio',
    'T1',
    'T2',
    'T3',
    'T4',
    'T5+',
    'Maison',
    'Loft',
    'Duplex',
    'Triplex',
    'Penthouse',
    'Local commercial',
    'Bureau',
    'Autre'
  ];

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    
    if (idParam) {
      const id = parseInt(idParam, 10);
      this.propertyId.set(id);
      this.loadProperty(id);
    }
  }

  private loadProperty(id: number): void {
    this.loading.set(true);
    
    // Try to get from local state
    const property = this.state.getPropertyById(id);
    if (property) {
      this.populateForm(property);
      this.loading.set(false);
      return;
    }

    // Load properties if not in state
    this.state.loadProperties();
    
    // Wait for properties to load
    const checkLoaded = setInterval(() => {
      const prop = this.state.getPropertyById(id);
      if (prop) {
        this.populateForm(prop);
        this.loading.set(false);
        clearInterval(checkLoaded);
      }
    }, 100);

    // Timeout after 5 seconds
    setTimeout(() => {
      clearInterval(checkLoaded);
      this.loading.set(false);
    }, 5000);
  }

  private populateForm(property: PropertyWithDossiers): void {
    this.formData = {
      address: property.address,
      city: property.city,
      zipCode: property.zipCode,
      type: property.type,
      // Extended fields from property data
      description: property.description || '',
      surface: property.surface,
      rooms: property.rooms,
      floor: property.floor,
      hasParking: property.hasParking || false,
      hasCellar: property.hasCellar || false,
      hasElevator: property.hasElevator || false,
      rent: property.rent,
      price: property.price,
      charges: property.charges
    };
  }

  private getEmptyFormData(): PropertyFormData {
    return {
      address: '',
      city: 'Paris',
      zipCode: '',
      type: 'T2',
      description: '',
      surface: undefined,
      rooms: undefined,
      floor: undefined,
      hasParking: false,
      hasCellar: false,
      hasElevator: false,
      rent: undefined,
      price: undefined,
      charges: undefined
    };
  }

  cancel(): void {
    const id = this.propertyId();
    if (id) {
      this.router.navigate(['/biens', id]);
    } else {
      this.router.navigate(['/biens']);
    }
  }

  onSubmit(): void {
    if (this.saving()) return;

    this.saving.set(true);

    const id = this.propertyId();
    if (!id) {
      this.saving.set(false);
      return;
    }

    // Call API to update property
    this.state.updateProperty(id, this.formData).subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/biens', id]);
      },
      error: (err) => {
        console.error('Error updating property:', err);
        this.saving.set(false);
        // Still navigate back on error for now
        this.router.navigate(['/biens', id]);
      }
    });
  }
}

