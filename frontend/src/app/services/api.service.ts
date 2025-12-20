import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Agency,
  Agent,
  CurrentUser,
  Dossier,
  DossierFilters,
  DashboardStats,
  PropertyWithDossiers
} from '../models/dossier.model';

/**
 * API Service
 * Handles all HTTP communication with the backend
 */
@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly http = inject(HttpClient);
  // Utilise le proxy en dev, URL relative pour la prod
  private readonly baseUrl = '/api';

  // Agency endpoints
  getAgency(): Observable<Agency> {
    return this.http.get<Agency>(`${this.baseUrl}/agency`);
  }

  // Agent endpoints
  getAgents(): Observable<Agent[]> {
    return this.http.get<Agent[]>(`${this.baseUrl}/agents`);
  }

  // Current user endpoint
  getCurrentUser(): Observable<CurrentUser> {
    return this.http.get<CurrentUser>(`${this.baseUrl}/current-user`);
  }

  // Dossier endpoints
  getDossiers(filters?: Partial<DossierFilters>): Observable<Dossier[]> {
    let params = new HttpParams();

    if (filters) {
      if (filters.type && filters.type !== 'tous') {
        params = params.set('type', filters.type);
      }
      if (filters.status && filters.status !== 'tous') {
        params = params.set('status', filters.status);
      }
      if (filters.minScore) {
        params = params.set('minScore', filters.minScore.toString());
      }
      if (filters.agentId) {
        params = params.set('agentId', filters.agentId.toString());
      }
    }

    return this.http.get<Dossier[]>(`${this.baseUrl}/dossiers`, { params });
  }

  getDossierById(id: number): Observable<Dossier> {
    return this.http.get<Dossier>(`${this.baseUrl}/dossiers/${id}`);
  }

  createDossier(data: Partial<Dossier>): Observable<Dossier> {
    return this.http.post<Dossier>(`${this.baseUrl}/dossiers`, data);
  }

  updateDossier(id: number, data: Partial<Dossier>): Observable<Dossier> {
    return this.http.patch<Dossier>(`${this.baseUrl}/dossiers/${id}`, data);
  }

  updateChecklistItem(
    dossierId: number,
    checklistId: number,
    data: { status: string }
  ): Observable<any> {
    const url = `${this.baseUrl}/dossiers/${dossierId}/checklist/${checklistId}`;
    return this.http.patch(url, data);
  }

  // Stats endpoint
  getStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.baseUrl}/stats`);
  }

  // Properties endpoints
  getProperties(): Observable<PropertyWithDossiers[]> {
    return this.http.get<PropertyWithDossiers[]>(`${this.baseUrl}/properties`);
  }

  getDossiersByProperty(propertyId: number): Observable<Dossier[]> {
    return this.http.get<Dossier[]>(
      `${this.baseUrl}/properties/${propertyId}/dossiers`
    );
  }
}

