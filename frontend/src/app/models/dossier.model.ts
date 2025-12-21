/**
 * Models for DossierHub application
 * Defines all TypeScript interfaces for type safety
 */

export interface Agency {
  id: number;
  name: string;
  address: string;
  phone?: string;
  email?: string;
}

export interface Agent {
  id: number;
  name: string;
  fullName: string;
  email: string;
  role: string;
}

export interface Client {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  type: 'locataire' | 'vendeur' | 'acheteur';
}

export interface Property {
  id: number;
  address: string;
  city: string;
  zipCode: string;
  type: string;
  rent?: number;
  price?: number;
  // Extended property details
  description?: string;
  surface?: number;
  rooms?: number;
  floor?: number;
  hasParking?: boolean;
  hasCellar?: boolean;
  hasElevator?: boolean;
  charges?: number;
}

export interface AiSummary {
  description: string;
  strengths: string[];
  warnings: string[];
}

export interface ChecklistItem {
  id: number;
  name: string;
  status: 'received' | 'pending' | 'partial';
  required: boolean;
  received?: number;
  total?: number;
}

export interface Document {
  id: number;
  filename: string;
  type: string;
  uploadDate: string;
  origin: 'client' | 'agent';
  size: number;
  // AI Analysis fields
  analysis?: DocumentAnalysis;
}

/**
 * AI Document Analysis result
 * Simulates OCR + AI analysis of uploaded documents
 */
export interface DocumentAnalysis {
  status: 'pending' | 'analyzing' | 'validated' | 'warning' | 'rejected';
  confidence: number; // 0-100%
  detectedType: string;
  isCorrectType: boolean;
  isComplete: boolean;
  isReadable: boolean;
  extractedData: Record<string, string>;
  summary: string;
  alerts: DocumentAlert[];
  analyzedAt: string;
}

export interface DocumentAlert {
  type: 'info' | 'warning' | 'error';
  message: string;
}

export interface HistoryEntry {
  id: number;
  date: string;
  dateFormatted?: string;
  action: string;
  type: 'document' | 'notification' | 'creation' | 'update';
}

export type DossierType = 'location' | 'vente';
export type DossierStatus = 'a_completer' | 'complet' | 'en_cours' | 'archive';

export interface Dossier {
  id: number;
  reference: string;
  type: DossierType;
  status: DossierStatus;
  score: number | null;
  createdAt: string;
  updatedAt: string;
  updatedAtFormatted?: string;
  agentId: number;
  agentName?: string;
  agent?: Agent;
  client: Client;
  property: Property;
  aiSummary: AiSummary;
  checklist: ChecklistItem[];
  documents: Document[];
  history: HistoryEntry[];
}

export interface CurrentUser {
  id: number;
  name: string;
  role: string;
  agencyId: number;
}

export interface DashboardStats {
  total: number;
  location: number;
  vente: number;
  complet: number;
  aCompleter: number;
  enCours: number;
  archive: number;
  avgScore: string;
}

// Filter options for dashboard
export interface DossierFilters {
  type: 'tous' | DossierType;
  status: 'tous' | DossierStatus;
  minScore: number | null;
  agentId: number | null;
}

// Property with dossier summary
export interface PropertyWithDossiers {
  id: number;
  address: string;
  city: string;
  zipCode: string;
  type: string;
  dossierCount: number;
  dossierIds: number[];
  statuses: {
    a_completer: number;
    complet: number;
    en_cours: number;
    archive: number;
  };
  // Dossier types count (location/vente)
  dossierTypes: {
    location: number;
    vente: number;
  };
  lastUpdate: string;
  lastUpdateFormatted: string;
  // Extended property details
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

