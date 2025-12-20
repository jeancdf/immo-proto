import { 
  Component, 
  inject, 
  signal, 
  computed,
  input,
  output
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../../services/state.service';
import { Dossier, DossierType, DossierStatus } from '../../models/dossier.model';

/**
 * Form data structure for creating/editing dossiers
 */
interface DossierFormData {
  type: DossierType;
  status: DossierStatus;
  score: number | null;
  agentId: number;
  client: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    type: 'locataire' | 'vendeur' | 'acheteur';
  };
  property: {
    address: string;
    city: string;
    zipCode: string;
    type: string;
    rent?: number;
    price?: number;
  };
}

/**
 * Dossier Modal Component
 * Modal for creating and editing dossiers
 */
@Component({
  selector: 'app-dossier-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dossier-modal.component.html',
  styleUrl: './dossier-modal.component.css'
})
export class DossierModalComponent {
  private readonly state = inject(StateService);

  // Inputs
  isOpen = input<boolean>(false);
  dossier = input<Dossier | null>(null);

  // Outputs
  closed = output<void>();
  saved = output<Dossier>();

  // Local state
  saving = signal(false);
  agents = this.state.agents;

  // Computed: check if in edit mode
  isEditMode = computed(() => !!this.dossier());

  // Form data with default values
  formData: DossierFormData = this.getEmptyFormData();

  // Initialize form when dossier input changes
  ngOnChanges(): void {
    const dossier = this.dossier();
    if (dossier) {
      this.formData = {
        type: dossier.type,
        status: dossier.status,
        score: dossier.score,
        agentId: dossier.agentId,
        client: { ...dossier.client },
        property: { ...dossier.property }
      };
    } else {
      this.formData = this.getEmptyFormData();
    }
  }

  private getEmptyFormData(): DossierFormData {
    return {
      type: 'location',
      status: 'a_completer',
      score: null,
      agentId: this.state.agents()[0]?.id || 1,
      client: {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        type: 'locataire'
      },
      property: {
        address: '',
        city: 'Paris',
        zipCode: '',
        type: ''
      }
    };
  }

  close(): void {
    this.closed.emit();
  }

  onOverlayClick(event: MouseEvent): void {
    // Close only if clicking the overlay, not the modal content
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.close();
    }
  }

  onSubmit(): void {
    if (this.saving()) return;

    this.saving.set(true);

    const dossierData: Partial<Dossier> = {
      type: this.formData.type,
      status: this.formData.status,
      score: this.formData.score,
      agentId: this.formData.agentId,
      client: {
        ...this.formData.client,
        id: this.dossier()?.client.id || Date.now()
      },
      property: {
        ...this.formData.property,
        id: this.dossier()?.property.id || Date.now()
      }
    };

    const existingDossier = this.dossier();

    if (existingDossier) {
      // Update existing
      this.state.updateDossier(existingDossier.id, dossierData).subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.saved.emit(updated);
          this.close();
        },
        error: () => this.saving.set(false)
      });
    } else {
      // Create new
      this.state.createDossier(dossierData).subscribe({
        next: (created) => {
          this.saving.set(false);
          this.saved.emit(created);
          this.close();
        },
        error: () => this.saving.set(false)
      });
    }
  }
}

