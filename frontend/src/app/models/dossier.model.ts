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

export interface Proprietaire {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address?: string;
  notes?: string;
}

export interface OwnerInteraction {
  id: number;
  ownerId: number;
  type: 'email' | 'appel' | 'rdv' | 'note';
  content: string;
  agentId: number;
  agentName?: string;
  createdAt: string;
  createdAtFormatted?: string;
}

export interface ProprietaireFull extends Proprietaire {
  properties: PropertyWithDossiers[];
  interactions: OwnerInteraction[];
  stats: {
    totalProperties: number;
    activeDossiers: number;
  };
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
  owners?: Proprietaire[];
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
  postalCode?: string; // Alias for zipCode
  type: string;
  transactionType?: 'location' | 'vente'; // Type of transaction
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
  bedrooms?: number;
  bathrooms?: number;
  floor?: number;
  totalFloors?: number;
  hasParking?: boolean;
  hasCellar?: boolean;
  hasElevator?: boolean;
  rent?: number;
  price?: number;
  charges?: number;
  owners?: Proprietaire[];
  // Features and diagnostics
  features?: string[];
  dpe?: string;
  ges?: string;
  // Agent info
  agentId?: number;
}

/**
 * Multi-party document collection interfaces
 */
export interface DocumentSource {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  color: string;
}

export interface CollectDocument {
  docId: string;
  status: 'pending' | 'received' | 'not_applicable';
  auditStatus?: 'pending' | 'validated' | 'rejected' | 'requested';
  fileName?: string;
  uploadedAt?: string;
  name?: string;
  required?: boolean;
  condition?: string;
  milestone?: 'listing' | 'acte';
}

export interface CollectLink {
  id: number;
  token: string;
  dossierId: number;
  sourceType: string;
  sourceName: string;
  sourceEmail: string;
  templateType: string;
  documents: CollectDocument[];
  sourceInfo: DocumentSource;
  stats: {
    received: number;
    total: number;
    percentage: number;
  };
  createdAt: string;
  expiresAt: string;
  lastAccessedAt: string | null;
}

/**
 * Legal Deadline Type Definition
 * Defines the types of legal deadlines in French real estate
 */
export interface DeadlineType {
  id: string;
  name: string;
  description: string;
  daysFromEvent: number;
  triggerEvent: string;
  applicableTo: 'vente' | 'location' | 'both';
  priority: 'high' | 'medium' | 'low';
}

/**
 * Dossier Deadline
 * A specific deadline associated with a dossier
 */
export interface DossierDeadline {
  id: number;
  dossierId: number;
  deadlineTypeId: string;
  startDate: string;
  dueDate: string;
  status: 'pending' | 'completed' | 'overdue';
  notes?: string;
  // Computed fields (from join with deadlineTypes)
  deadlineType?: DeadlineType;
  dossier?: Dossier;
  daysRemaining?: number;
  urgency?: 'critical' | 'warning' | 'ok';
}

/**
 * Deadline Summary for Dashboard Widget
 */
export interface DeadlineSummary {
  critical: number;    // < 3 days
  warning: number;     // 3-7 days
  ok: number;          // > 7 days
  deadlines: DossierDeadline[];
}

