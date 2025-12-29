import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import {
  Agency,
  Agent,
  CurrentUser,
  Dossier,
  DossierFilters,
  DashboardStats,
  PropertyWithDossiers
} from '../models/dossier.model';
import { AuthService } from './auth.service';

/**
 * State Service
 * Centralized state management using Angular Signals
 * Handles all data fetching and state updates
 * Filters data by agent for non-admin users
 */
@Injectable({
  providedIn: 'root'
})
export class StateService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly baseUrl = '/api';

  // ============================================
  // STATE SIGNALS
  // ============================================
  
  // Agency & User
  readonly agency = signal<Agency | null>(null);
  readonly currentUser = signal<CurrentUser | null>(null);
  readonly agents = signal<Agent[]>([]);

  // Dossiers
  readonly dossiers = signal<Dossier[]>([]);
  readonly selectedDossier = signal<Dossier | null>(null);
  readonly dossierFilters = signal<DossierFilters>({
    type: 'tous',
    status: 'tous',
    minScore: null,
    agentId: null
  });

  // Properties
  readonly properties = signal<PropertyWithDossiers[]>([]);
  readonly selectedProperty = signal<PropertyWithDossiers | null>(null);
  readonly selectedPropertyDossiers = signal<Dossier[]>([]);

  // Loading states
  readonly loadingDossiers = signal(false);
  readonly loadingProperties = signal(false);
  readonly loadingDossierDetail = signal(false);

  // ============================================
  // COMPUTED SIGNALS
  // ============================================

  // Filtered dossiers based on current filters
  readonly filteredDossiers = computed(() => {
    const filters = this.dossierFilters();
    let result = this.dossiers();

    if (filters.type !== 'tous') {
      result = result.filter(d => d.type === filters.type);
    }

    if (filters.status !== 'tous') {
      result = result.filter(d => d.status === filters.status);
    }

    if (filters.minScore) {
      result = result.filter(d => d.score && d.score >= filters.minScore!);
    }

    if (filters.agentId) {
      result = result.filter(d => d.agentId === filters.agentId);
    }

    return result;
  });

  // Dashboard stats computed from dossiers
  readonly stats = computed(() => {
    const dossiers = this.dossiers();
    return {
      total: dossiers.length,
      location: dossiers.filter(d => d.type === 'location').length,
      vente: dossiers.filter(d => d.type === 'vente').length,
      complet: dossiers.filter(d => d.status === 'complet').length,
      aCompleter: dossiers.filter(d => d.status === 'a_completer').length,
      enCours: dossiers.filter(d => d.status === 'en_cours').length,
      archive: dossiers.filter(d => d.status === 'archive').length
    };
  });

  // ============================================
  // DATA LOADING METHODS
  // ============================================

  /** Load agency information */
  loadAgency(): void {
    this.http.get<Agency>(`${this.baseUrl}/agency`).subscribe(
      agency => this.agency.set(agency)
    );
  }

  /** Update agency information */
  updateAgency(data: Partial<Agency>): Observable<Agency> {
    return this.http.patch<Agency>(`${this.baseUrl}/agency`, data).pipe(
      tap(agency => this.agency.set(agency))
    );
  }

  /** Load current user */
  loadCurrentUser(): void {
    this.http.get<CurrentUser>(`${this.baseUrl}/current-user`).subscribe(
      user => this.currentUser.set(user)
    );
  }

  /** Load all agents */
  loadAgents(): void {
    this.http.get<Agent[]>(`${this.baseUrl}/agents`).subscribe(
      agents => this.agents.set(agents)
    );
  }

  /** Load all dossiers from API (filtered by agent for non-admins) */
  loadDossiers(): void {
    this.loadingDossiers.set(true);
    
    // Build URL with agentId filter if user is not admin
    let url = `${this.baseUrl}/dossiers`;
    const user = this.authService.currentUser();
    
    if (user && user.role !== 'admin') {
      url += `?agentId=${user.id}`;
    }
    
    this.http.get<Dossier[]>(url).subscribe({
      next: (dossiers) => {
        this.dossiers.set(dossiers);
        this.loadingDossiers.set(false);
      },
      error: () => this.loadingDossiers.set(false)
    });
  }

  /** Load single dossier by ID */
  loadDossierById(id: number): void {
    this.loadingDossierDetail.set(true);
    this.selectedDossier.set(null);
    
    this.http.get<Dossier>(`${this.baseUrl}/dossiers/${id}`).subscribe({
      next: (dossier) => {
        this.selectedDossier.set(dossier);
        this.loadingDossierDetail.set(false);
      },
      error: () => this.loadingDossierDetail.set(false)
    });
  }

  /** Load all properties */
  loadProperties(): void {
    this.loadingProperties.set(true);
    this.http.get<PropertyWithDossiers[]>(`${this.baseUrl}/properties`)
      .subscribe({
        next: (properties) => {
          this.properties.set(properties);
          this.loadingProperties.set(false);
        },
        error: () => this.loadingProperties.set(false)
      });
  }

  /** Load single property by ID with full details */
  loadPropertyById(id: number): void {
    this.loadingProperties.set(true);
    this.selectedProperty.set(null);
    
    this.http.get<PropertyWithDossiers>(`${this.baseUrl}/properties/${id}`)
      .subscribe({
        next: (property) => {
          this.selectedProperty.set(property);
          this.loadingProperties.set(false);
        },
        error: () => this.loadingProperties.set(false)
      });
  }

  /** Load dossiers for a specific property */
  loadDossiersByProperty(propertyId: number): void {
    this.selectedPropertyDossiers.set([]);
    this.http.get<Dossier[]>(`${this.baseUrl}/properties/${propertyId}/dossiers`)
      .subscribe(dossiers => this.selectedPropertyDossiers.set(dossiers));
  }

  // ============================================
  // FILTER METHODS
  // ============================================

  /** Update dossier filters */
  setDossierFilter<K extends keyof DossierFilters>(
    key: K, 
    value: DossierFilters[K]
  ): void {
    this.dossierFilters.update(filters => ({
      ...filters,
      [key]: value
    }));
  }

  /** Reset all dossier filters */
  resetDossierFilters(): void {
    this.dossierFilters.set({
      type: 'tous',
      status: 'tous',
      minScore: null,
      agentId: null
    });
  }

  // ============================================
  // CRUD OPERATIONS
  // ============================================

  /** Create new dossier */
  createDossier(data: Partial<Dossier>): Observable<Dossier> {
    return this.http.post<Dossier>(`${this.baseUrl}/dossiers`, data).pipe(
      tap(newDossier => {
        // Add to local state
        this.dossiers.update(dossiers => [newDossier, ...dossiers]);
        // Refresh properties to update counts
        this.loadProperties();
      })
    );
  }

  /** Update existing dossier */
  updateDossier(id: number, data: Partial<Dossier>): Observable<Dossier> {
    return this.http.patch<Dossier>(`${this.baseUrl}/dossiers/${id}`, data)
      .pipe(
        tap(updatedDossier => {
          // Update in dossiers list
          this.dossiers.update(dossiers =>
            dossiers.map(d => d.id === id ? { ...d, ...updatedDossier } : d)
          );
          // Update selected dossier if it's the same
          if (this.selectedDossier()?.id === id) {
            this.selectedDossier.update(d => 
              d ? { ...d, ...updatedDossier } : d
            );
          }
          // Refresh properties to update counts
          this.loadProperties();
        })
      );
  }

  /** Update checklist item */
  updateChecklistItem(
    dossierId: number,
    checklistId: number,
    data: { status: string }
  ): Observable<any> {
    const url = `${this.baseUrl}/dossiers/${dossierId}/checklist/${checklistId}`;
    return this.http.patch(url, data).pipe(
      tap(() => {
        // Refresh the selected dossier to get updated checklist
        if (this.selectedDossier()?.id === dossierId) {
          this.loadDossierById(dossierId);
        }
        // Refresh dossiers list
        this.loadDossiers();
      })
    );
  }

  /** Delete a dossier */
  deleteDossier(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/dossiers/${id}`).pipe(
      tap(() => {
        // Remove from local state
        this.dossiers.update(dossiers => 
          dossiers.filter(d => d.id !== id)
        );
        // Clear selected if it was the deleted one
        if (this.selectedDossier()?.id === id) {
          this.selectedDossier.set(null);
        }
        // Refresh properties to update counts
        this.loadProperties();
      })
    );
  }

  /** Get dossier by ID from local state */
  getDossierById(id: number): Dossier | undefined {
    return this.dossiers().find(d => d.id === id);
  }

  // ============================================
  // PROPERTY METHODS
  // ============================================

  /** Update property details */
  updateProperty(id: number, data: Partial<PropertyWithDossiers>): Observable<PropertyWithDossiers> {
    return this.http.patch<PropertyWithDossiers>(
      `${this.baseUrl}/properties/${id}`, 
      data
    ).pipe(
      tap(updatedProperty => {
        // Update in properties list
        this.properties.update(properties =>
          properties.map(p => p.id === id ? { ...p, ...updatedProperty } : p)
        );
        // Also update any dossiers that have this property
        this.dossiers.update(dossiers =>
          dossiers.map(d => {
            if (d.property.id === id) {
              return {
                ...d,
                property: {
                  ...d.property,
                  address: updatedProperty.address,
                  city: updatedProperty.city,
                  zipCode: updatedProperty.zipCode,
                  type: updatedProperty.type
                }
              };
            }
            return d;
          })
        );
      })
    );
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /** Get agent name by ID */
  getAgentName(agentId: number): string {
    const agent = this.agents().find(a => a.id === agentId);
    return agent?.name || 'Non assigné';
  }

  /** Find property by ID */
  getPropertyById(propertyId: number): PropertyWithDossiers | undefined {
    return this.properties().find(p => p.id === propertyId);
  }

  /** Initialize all base data */
  initializeAppData(): void {
    this.loadAgency();
    this.loadCurrentUser();
    this.loadAgents();
    this.loadDossiers();
    this.loadProperties();
  }
}

