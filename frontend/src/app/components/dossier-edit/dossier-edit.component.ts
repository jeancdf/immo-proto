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
 * Dossier Edit Component
 * Dedicated page for creating and editing dossiers
 */
@Component({
  selector: 'app-dossier-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './dossier-edit.component.html',
  styleUrl: './dossier-edit.component.css'
})
export class DossierEditComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly state = inject(StateService);

  // Route parameter
  readonly dossierId = signal<number | null>(null);

  // Local state
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly dossier = signal<Dossier | null>(null);

  // From state service
  readonly agents = this.state.agents;

  // Computed: check if in edit mode (has ID)
  readonly isEditMode = computed(() => this.dossierId() !== null);

  // Form data with default values
  formData: DossierFormData = this.getEmptyFormData();

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    
    if (idParam && idParam !== 'new') {
      // Edit mode: load existing dossier
      const id = parseInt(idParam, 10);
      this.dossierId.set(id);
      this.loadDossier(id);
    } else {
      // Create mode: use empty form
      this.dossierId.set(null);
      this.formData = this.getEmptyFormData();
    }
  }

  private loadDossier(id: number): void {
    this.loading.set(true);
    
    // Try to get from local state first
    const cachedDossier = this.state.getDossierById(id);
    if (cachedDossier) {
      this.populateForm(cachedDossier);
      this.loading.set(false);
      return;
    }

    // Otherwise load from API
    this.state.loadDossierById(id);
    
    // Wait for the dossier to be loaded
    const checkLoaded = setInterval(() => {
      const selectedDossier = this.state.selectedDossier();
      if (selectedDossier && selectedDossier.id === id) {
        this.populateForm(selectedDossier);
        this.loading.set(false);
        clearInterval(checkLoaded);
      }
      if (!this.state.loadingDossierDetail()) {
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

  private populateForm(dossier: Dossier): void {
    this.dossier.set(dossier);
    this.formData = {
      type: dossier.type,
      status: dossier.status,
      score: dossier.score,
      agentId: dossier.agentId,
      client: { ...dossier.client },
      property: { ...dossier.property }
    };
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

  cancel(): void {
    // Navigate back
    if (this.isEditMode() && this.dossierId()) {
      this.router.navigate(['/dossier', this.dossierId()]);
    } else {
      this.router.navigate(['/dashboard']);
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

    const existingId = this.dossierId();

    if (existingId) {
      // Update existing
      this.state.updateDossier(existingId, dossierData).subscribe({
        next: () => {
          this.saving.set(false);
          this.router.navigate(['/dossier', existingId]);
        },
        error: () => this.saving.set(false)
      });
    } else {
      // Create new
      this.state.createDossier(dossierData).subscribe({
        next: (created) => {
          this.saving.set(false);
          this.router.navigate(['/dossier', created.id]);
        },
        error: () => this.saving.set(false)
      });
    }
  }
}

