import { 
  Component, inject, signal, OnInit, computed 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';

interface ClientStats {
  total: number;
  active: number;
  completed: number;
  archived: number;
}

interface ClientDossier {
  id: number;
  reference: string;
  type: string;
  status: string;
  score?: number;
  property: {
    address: string;
    city: string;
    zipCode: string;
  };
  agentName: string;
  createdAtFormatted: string;
  updatedAtFormatted: string;
}

interface Interaction {
  id: number;
  type: 'note' | 'call' | 'email' | 'meeting' | 'reminder';
  content: string;
  createdAt: string;
  createdAtFormatted: string;
  agentName: string;
  dueDate?: string;
  completed?: boolean;
}

interface ClientPreferences {
  budget?: { min: number; max: number };
  surface?: { min: number; max: number };
  rooms?: number;
  zones?: string[];
  criteria?: string[];
  notes?: string;
}

interface Client {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  type: string;
  profession?: string;
  income?: number;
  dossiers: ClientDossier[];
  interactions: Interaction[];
  preferences: ClientPreferences | null;
  stats: ClientStats;
  interactionsCount?: number;
  hasPreferences?: boolean;
  lastActivity: string;
  lastActivityFormatted?: string;
  firstContact: string;
}

/**
 * Clients CRM Component
 * Full CRM view for managing client relationships
 */
@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './clients.component.html',
  styleUrl: './clients.component.css'
})
export class ClientsComponent implements OnInit {
  private readonly http = inject(HttpClient);

  // State
  readonly clients = signal<Client[]>([]);
  readonly selectedClient = signal<Client | null>(null);
  readonly loading = signal(true);
  readonly loadingDetail = signal(false);
  
  // UI State
  readonly activeTab = signal<'dossiers' | 'timeline' | 'preferences'>(
    'timeline'
  );
  readonly showAddInteraction = signal(false);
  readonly searchQuery = signal('');

  // New interaction form
  newInteraction = {
    type: 'note' as 'note' | 'call' | 'email' | 'meeting' | 'reminder',
    content: '',
    dueDate: ''
  };

  // Computed: filtered clients
  readonly filteredClients = computed(() => {
    const query = this.searchQuery().toLowerCase();
    if (!query) return this.clients();
    
    return this.clients().filter(c => 
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(query) ||
      c.email.toLowerCase().includes(query) ||
      c.phone.includes(query)
    );
  });

  // Computed: pending reminders for selected client
  readonly pendingReminders = computed(() => {
    const client = this.selectedClient();
    if (!client) return [];
    return client.interactions.filter(
      i => i.type === 'reminder' && !i.completed
    );
  });

  ngOnInit(): void {
    this.loadClients();
  }

  loadClients(): void {
    this.loading.set(true);
    this.http.get<Client[]>('/api/clients').subscribe({
      next: (clients) => {
        this.clients.set(clients);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  selectClient(client: Client): void {
    this.loadingDetail.set(true);
    this.http.get<Client>(`/api/clients/${encodeURIComponent(client.email)}`)
      .subscribe({
        next: (fullClient) => {
          this.selectedClient.set(fullClient);
          this.loadingDetail.set(false);
        },
        error: () => this.loadingDetail.set(false)
      });
  }

  closeDetail(): void {
    this.selectedClient.set(null);
    this.showAddInteraction.set(false);
  }

  setTab(tab: 'dossiers' | 'timeline' | 'preferences'): void {
    this.activeTab.set(tab);
  }

  toggleAddInteraction(): void {
    this.showAddInteraction.update(v => !v);
    if (!this.showAddInteraction()) {
      this.resetInteractionForm();
    }
  }

  addInteraction(): void {
    const client = this.selectedClient();
    if (!client || !this.newInteraction.content.trim()) return;

    const payload: any = {
      type: this.newInteraction.type,
      content: this.newInteraction.content
    };

    if (this.newInteraction.type === 'reminder' && this.newInteraction.dueDate) {
      payload.dueDate = new Date(this.newInteraction.dueDate).toISOString();
    }

    this.http.post<Interaction>(
      `/api/clients/${encodeURIComponent(client.email)}/interactions`,
      payload
    ).subscribe({
      next: (interaction) => {
        // Add to local state
        this.selectedClient.update(c => c ? {
          ...c,
          interactions: [interaction, ...c.interactions]
        } : null);
        this.resetInteractionForm();
        this.showAddInteraction.set(false);
      }
    });
  }

  completeReminder(interaction: Interaction): void {
    this.http.patch<Interaction>(
      `/api/interactions/${interaction.id}`,
      { completed: true }
    ).subscribe({
      next: () => {
        this.selectedClient.update(c => c ? {
          ...c,
          interactions: c.interactions.map(i => 
            i.id === interaction.id ? { ...i, completed: true } : i
          )
        } : null);
      }
    });
  }

  private resetInteractionForm(): void {
    this.newInteraction = {
      type: 'note',
      content: '',
      dueDate: ''
    };
  }

  getInteractionIcon(type: string): string {
    const icons: Record<string, string> = {
      note: 'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7',
      call: 'M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 ' +
            '19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 ' +
            '014.11 2h3a2 2 0 012 1.72',
      email: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2' +
             'V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6',
      meeting: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 7a4 4 0 100-8 ' +
               '4 4 0 000 8 M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75',
      reminder: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 ' +
                '10 10 10z M12 6v6l4 2'
    };
    return icons[type] || icons['note'];
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      a_completer: 'À compléter',
      complet: 'Complet',
      en_cours: 'En cours',
      archive: 'Archivé'
    };
    return labels[status] || status;
  }

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      locataire: 'Locataire',
      vendeur: 'Vendeur',
      acheteur: 'Acheteur'
    };
    return labels[type] || type;
  }

  getInteractionTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      note: 'Note',
      call: 'Appel',
      email: 'Email',
      meeting: 'Rendez-vous',
      reminder: 'Rappel'
    };
    return labels[type] || type;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(value);
  }
}

