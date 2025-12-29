import { Component, signal, OnInit, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

/**
 * Stakeholder document interface
 * Represents a document required from a specific party
 */
interface StakeholderDocument {
  id: string;
  name: string;
  milestone: 'listing' | 'acte';
  status: 'received' | 'missing' | 'verifying' | 'requested';
  responsible: string;
  isBlocker: boolean;
  note?: string;
}

/**
 * Stakeholder interface
 * Represents a party involved in the sale process
 */
interface Stakeholder {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  accentColor: string;
  documents: StakeholderDocument[];
  preAnnounceStatus: string;
  linkExpiry?: string;
  linkType?: string;
}

/**
 * Vente Dashboard Component
 * Full-page Swiss Real Estate Document Collection Dashboard
 * Shows all documents needed for a property sale (bill of sale)
 */
@Component({
  selector: 'app-vente-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './vente-dashboard.component.html',
  styleUrl: './vente-dashboard.component.css'
})
export class VenteDashboardComponent implements OnInit {
  private readonly route: ActivatedRoute;
  private readonly router: Router;

  @Input() dossierId?: number;

  // Property information
  readonly propertyAddress = signal('12 Rue des Lilas, Lausanne');
  readonly clientName = signal('Famille Morel');

  // Track which stakeholder sections are expanded (all collapsed by default)
  readonly expandedSections = signal<Set<string>>(new Set());

  // All stakeholders with their documents
  readonly stakeholders = signal<Stakeholder[]>([
    {
      id: 'vendeur',
      name: 'Vendeur',
      subtitle: 'Famille Morel · Personnels & preuves de propriété',
      icon: 'user',
      accentColor: '#f97316',
      preAnnounceStatus: 'Pré-annonce : incomplet',
      linkExpiry: '5 j',
      linkType: 'Lien dépôt',
      documents: [
        {
          id: 'v1',
          name: 'Titre de propriété',
          milestone: 'listing',
          status: 'received',
          responsible: 'Vendeur',
          isBlocker: false
        },
        {
          id: 'v2',
          name: 'Pièce d\'identité (tous les copropriétaires)',
          milestone: 'listing',
          status: 'missing',
          responsible: 'Vendeur',
          isBlocker: true,
          note: 'Blocant pour l\'annonce'
        },
        {
          id: 'v3',
          name: 'Dernière taxe foncière',
          milestone: 'listing',
          status: 'missing',
          responsible: 'Vendeur',
          isBlocker: true,
          note: 'Blocant pour l\'annonce'
        },
        {
          id: 'v4',
          name: 'Attestation de non-poursuite',
          milestone: 'acte',
          status: 'verifying',
          responsible: 'Vendeur',
          isBlocker: false,
          note: 'Pour acte chez notaire'
        },
        {
          id: 'v5',
          name: 'Justificatif de domicile',
          milestone: 'acte',
          status: 'missing',
          responsible: 'Vendeur',
          isBlocker: false
        },
        {
          id: 'v6',
          name: 'Attestation de propriété',
          milestone: 'listing',
          status: 'received',
          responsible: 'Vendeur',
          isBlocker: false
        },
        {
          id: 'v7',
          name: 'Mandat de vente signé',
          milestone: 'listing',
          status: 'received',
          responsible: 'Vendeur',
          isBlocker: false
        }
      ]
    },
    {
      id: 'syndic',
      name: 'Syndic / Administration',
      subtitle: 'Copropriété & vie de l\'immeuble',
      icon: 'building',
      accentColor: '#f97316',
      preAnnounceStatus: 'Pré-annonce : blocants syndic',
      linkExpiry: '12 j',
      linkType: 'Lien upload',
      documents: [
        {
          id: 's1',
          name: 'Règlement de copropriété (PPE)',
          milestone: 'listing',
          status: 'received',
          responsible: 'Syndic',
          isBlocker: false
        },
        {
          id: 's2',
          name: '3 derniers PV d\'AG',
          milestone: 'listing',
          status: 'missing',
          responsible: 'Syndic',
          isBlocker: true,
          note: 'Blocant pour l\'annonce'
        },
        {
          id: 's3',
          name: 'Carnet d\'entretien',
          milestone: 'listing',
          status: 'missing',
          responsible: 'Syndic',
          isBlocker: true,
          note: 'Blocant pour l\'annonce'
        },
        {
          id: 's4',
          name: 'Appels de fonds & budget prévisionnel',
          milestone: 'acte',
          status: 'verifying',
          responsible: 'Syndic',
          isBlocker: false,
          note: 'Pour acte'
        },
        {
          id: 's5',
          name: 'État des charges copropriété',
          milestone: 'listing',
          status: 'received',
          responsible: 'Syndic',
          isBlocker: false
        },
        {
          id: 's6',
          name: 'Attestation de non-opposition',
          milestone: 'acte',
          status: 'missing',
          responsible: 'Syndic',
          isBlocker: false
        }
      ]
    },
    {
      id: 'banque',
      name: 'Banque',
      subtitle: 'Crédit hypothécaire & mainlevée',
      icon: 'bank',
      accentColor: '#10b981',
      preAnnounceStatus: 'Pré-annonce : OK · Acte à préparer',
      documents: [
        {
          id: 'b1',
          name: 'Solde restant dû',
          milestone: 'acte',
          status: 'received',
          responsible: 'Banque',
          isBlocker: false
        },
        {
          id: 'b2',
          name: 'Tableau d\'amortissement',
          milestone: 'acte',
          status: 'received',
          responsible: 'Banque',
          isBlocker: false,
          note: 'Pour acte'
        },
        {
          id: 'b3',
          name: 'Accord de mainlevée',
          milestone: 'acte',
          status: 'verifying',
          responsible: 'Banque',
          isBlocker: false,
          note: 'En traitement banque · À suivre avec la banque'
        }
      ]
    },
    {
      id: 'diagnostiqueur',
      name: 'Diagnostiqueur',
      subtitle: 'Audits techniques & CECB',
      icon: 'clipboard',
      accentColor: '#64748b',
      preAnnounceStatus: 'Pré-annonce : manque 1 diagnostic clé',
      documents: [
        {
          id: 'd1',
          name: 'Certificat énergétique (CECB)',
          milestone: 'listing',
          status: 'received',
          responsible: 'Diagnostiqueur',
          isBlocker: false
        },
        {
          id: 'd2',
          name: 'Diagnostic Amiante',
          milestone: 'listing',
          status: 'missing',
          responsible: 'Diagnostiqueur',
          isBlocker: true,
          note: 'Blocant pour l\'annonce'
        },
        {
          id: 'd3',
          name: 'Contrôle OIBT',
          milestone: 'listing',
          status: 'verifying',
          responsible: 'Diagnostiqueur',
          isBlocker: false,
          note: 'Bloc non critique'
        },
        {
          id: 'd4',
          name: 'État des risques naturels',
          milestone: 'listing',
          status: 'received',
          responsible: 'Diagnostiqueur',
          isBlocker: false
        }
      ]
    },
    {
      id: 'notaire',
      name: 'Notaire',
      subtitle: 'Vérifications légales & acte',
      icon: 'scale',
      accentColor: '#6366f1',
      preAnnounceStatus: 'Acte à préparer · pas bloquant pour l\'annonce',
      documents: [
        {
          id: 'n1',
          name: 'Projet d\'acte de vente',
          milestone: 'acte',
          status: 'received',
          responsible: 'Notaire',
          isBlocker: false
        },
        {
          id: 'n2',
          name: 'État hypothécaire',
          milestone: 'acte',
          status: 'missing',
          responsible: 'Notaire',
          isBlocker: false,
          note: 'Blocant pour signature'
        },
        {
          id: 'n3',
          name: 'Certificat d\'urbanisme',
          milestone: 'acte',
          status: 'requested',
          responsible: 'Notaire',
          isBlocker: false,
          note: 'Demandé · À suivre avec notaire'
        }
      ]
    }
  ]);

  // Computed: Stats for each stakeholder
  readonly stakeholderStats = computed(() => {
    return this.stakeholders().map(s => {
      const total = s.documents.length;
      const received = s.documents.filter(
        d => d.status === 'received'
      ).length;
      const blockers = s.documents.filter(
        d => d.isBlocker && d.status !== 'received'
      ).length;
      const percentage = total > 0 ? Math.round((received / total) * 100) : 0;
      
      return {
        id: s.id,
        received,
        total,
        blockers,
        percentage
      };
    });
  });

  // Computed: Global document stats
  readonly globalStats = computed(() => {
    const allDocs = this.stakeholders().flatMap(s => s.documents);
    const total = allDocs.length;
    const received = allDocs.filter(d => d.status === 'received').length;
    const blockers = allDocs.filter(
      d => d.isBlocker && d.status !== 'received'
    ).length;
    
    return {
      received,
      total,
      blockers,
      percentage: total > 0 ? Math.round((received / total) * 100) : 0
    };
  });

  // Computed: Milestone stats
  readonly milestones = computed(() => {
    const allDocs = this.stakeholders().flatMap(s => s.documents);
    
    const listingDocs = allDocs.filter(d => d.milestone === 'listing');
    const listingReceived = listingDocs.filter(
      d => d.status === 'received'
    ).length;
    const listingBlockers = listingDocs.filter(
      d => d.isBlocker && d.status !== 'received'
    );

    const acteDocs = allDocs.filter(d => d.milestone === 'acte');
    const acteReceived = acteDocs.filter(d => d.status === 'received').length;
    const acteMissing = acteDocs.filter(d => d.status !== 'received');

    return {
      listing: {
        total: listingDocs.length,
        received: listingReceived,
        blockers: listingBlockers,
        percentage: listingDocs.length > 0 
          ? Math.round((listingReceived / listingDocs.length) * 100) 
          : 0
      },
      acte: {
        total: acteDocs.length,
        received: acteReceived,
        missing: acteMissing,
        percentage: acteDocs.length > 0 
          ? Math.round((acteReceived / acteDocs.length) * 100) 
          : 0
      }
    };
  });

  constructor(route: ActivatedRoute, router: Router) {
    this.route = route;
    this.router = router;
  }

  ngOnInit(): void {
    if (!this.dossierId) {
      const id = this.route.snapshot.paramMap.get('id');
      if (id) this.dossierId = parseInt(id, 10);
    }
  }

  // Get stats for a specific stakeholder
  getStakeholderStats(stakeholderId: string) {
    return this.stakeholderStats().find(s => s.id === stakeholderId);
  }

  // Get status display class
  getStatusClass(status: string): string {
    switch (status) {
      case 'received': return 'status-received';
      case 'missing': return 'status-missing';
      case 'verifying': return 'status-verifying';
      case 'requested': return 'status-requested';
      default: return 'status-pending';
    }
  }

  // Get status display label
  getStatusLabel(status: string): string {
    switch (status) {
      case 'received': return 'Reçu & validé';
      case 'missing': return 'Manquant';
      case 'verifying': return 'À vérifier';
      case 'requested': return 'Demandé';
      default: return 'En attente';
    }
  }

  // Navigation
  goBack(): void {
    if (this.dossierId) {
      this.router.navigate(['/dossier', this.dossierId]);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  // Copy deposit link
  copyLink(stakeholderId: string): void {
    const url = `${window.location.origin}/collect/${stakeholderId}`;
    navigator.clipboard.writeText(url).then(() => {
      alert('Lien copié !');
    });
  }

  // Send reminder
  sendReminder(stakeholderName: string): void {
    alert(`Relance envoyée à ${stakeholderName}`);
  }

  // Generate link for stakeholder
  generateLink(stakeholderId: string): void {
    alert(`Lien généré pour ${stakeholderId}`);
  }

  // Check if stakeholder has pending acte documents
  hasActeBlockers(stakeholder: Stakeholder): boolean {
    return stakeholder.documents.some(
      d => d.milestone === 'acte' && d.status !== 'received'
    );
  }

  // Toggle section expand/collapse
  toggleSection(stakeholderId: string): void {
    const current = this.expandedSections();
    const newSet = new Set(current);
    if (newSet.has(stakeholderId)) {
      newSet.delete(stakeholderId);
    } else {
      newSet.add(stakeholderId);
    }
    this.expandedSections.set(newSet);
  }

  // Check if section is expanded
  isSectionExpanded(stakeholderId: string): boolean {
    return this.expandedSections().has(stakeholderId);
  }

  // Expand all sections
  expandAll(): void {
    const allIds = this.stakeholders().map(s => s.id);
    this.expandedSections.set(new Set(allIds));
  }

  // Collapse all sections
  collapseAll(): void {
    this.expandedSections.set(new Set());
  }
}
