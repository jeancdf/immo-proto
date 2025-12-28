import { Component, inject, signal, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../../services/state.service';
import { AuthService, User } from '../../services/auth.service';

interface AgencySettings {
  name: string;
  address: string;
  phone: string;
  email: string;
}

interface ModuleSettings {
  location: boolean;
  vente: boolean;
  partage: boolean;
}

interface SecuritySettings {
  defaultDuration: number;
  codeProtection: boolean;
  allowDownload: boolean;
  accessLog: boolean;
}

interface NotificationSettings {
  agency: {
    newDossier: boolean;
    missingDocuments: boolean;
  };
  clients: {
    autoReminder: boolean;
    confirmReceipt: boolean;
  };
}

interface NewAgentForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: 'admin' | 'agent';
}

/**
 * Parametres Component
 * Settings page for agency configuration
 * Includes agency info, modules, security, notifications, and user management
 */
@Component({
  selector: 'app-parametres',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './parametres.component.html',
  styleUrl: './parametres.component.css'
})
export class ParametresComponent implements OnInit {
  private readonly state = inject(StateService);
  readonly authService = inject(AuthService);

  // Agency info from state
  readonly agency = this.state.agency;
  readonly isAdmin = this.authService.isAdmin;
  
  // Users list (admin only)
  readonly users = signal<User[]>([]);
  readonly loadingUsers = signal(false);

  // Form data
  agencySettings: AgencySettings = {
    name: '',
    address: '',
    phone: '',
    email: ''
  };

  moduleSettings: ModuleSettings = {
    location: true,
    vente: false,
    partage: true
  };

  securitySettings: SecuritySettings = {
    defaultDuration: 30,
    codeProtection: false,
    allowDownload: true,
    accessLog: true
  };

  notificationSettings: NotificationSettings = {
    agency: {
      newDossier: true,
      missingDocuments: false
    },
    clients: {
      autoReminder: true,
      confirmReceipt: true
    }
  };

  // UI State
  readonly saving = signal(false);
  readonly saved = signal(false);
  readonly activeTab = signal<'agency' | 'users' | 'modules' | 'security'>(
    'agency'
  );

  // New agent form
  readonly showNewAgentModal = signal(false);
  readonly savingAgent = signal(false);
  newAgent: NewAgentForm = {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'agent'
  };

  // Edit agent form
  readonly editingUser = signal<User | null>(null);

  constructor() {
    // Watch for agency changes and update form
    effect(() => {
      const agency = this.agency();
      if (agency) {
        this.agencySettings = {
          name: agency.name || '',
          address: agency.address || '',
          phone: agency.phone || '',
          email: agency.email || ''
        };
      }
    });
  }

  ngOnInit(): void {
    // Load agency if not already loaded
    if (!this.agency()) {
      this.state.loadAgency();
    }
    
    // Load users if admin
    if (this.isAdmin()) {
      this.loadUsers();
    }
  }

  // Switch tab
  setTab(tab: 'agency' | 'users' | 'modules' | 'security'): void {
    this.activeTab.set(tab);
    if (tab === 'users' && this.isAdmin()) {
      this.loadUsers();
    }
  }

  // Load users (admin only)
  loadUsers(): void {
    this.loadingUsers.set(true);
    this.authService.getUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loadingUsers.set(false);
      },
      error: () => {
        this.loadingUsers.set(false);
      }
    });
  }

  // Open new agent modal
  openNewAgentModal(): void {
    this.newAgent = {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      role: 'agent'
    };
    this.showNewAgentModal.set(true);
  }

  // Close new agent modal
  closeNewAgentModal(): void {
    this.showNewAgentModal.set(false);
  }

  // Create new agent
  createAgent(): void {
    if (!this.newAgent.firstName || !this.newAgent.lastName || 
        !this.newAgent.email || !this.newAgent.password) {
      return;
    }

    this.savingAgent.set(true);
    this.authService.createUser(this.newAgent).subscribe({
      next: () => {
        this.savingAgent.set(false);
        this.showNewAgentModal.set(false);
        this.loadUsers();
        this.showSavedMessage();
      },
      error: () => {
        this.savingAgent.set(false);
      }
    });
  }

  // Toggle user active status
  toggleUserStatus(user: User): void {
    this.authService.toggleUserStatus(user.id, !user.isActive).subscribe({
      next: () => {
        this.loadUsers();
      }
    });
  }

  // Edit user
  editUser(user: User): void {
    this.editingUser.set({ ...user });
  }

  // Save user edit
  saveUserEdit(): void {
    const user = this.editingUser();
    if (!user) return;

    this.authService.updateUser(user.id, {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role
    }).subscribe({
      next: () => {
        this.editingUser.set(null);
        this.loadUsers();
        this.showSavedMessage();
      }
    });
  }

  // Cancel user edit
  cancelUserEdit(): void {
    this.editingUser.set(null);
  }

  saveAgencySettings(): void {
    this.saving.set(true);
    
    this.state.updateAgency({
      name: this.agencySettings.name,
      address: this.agencySettings.address,
      phone: this.agencySettings.phone,
      email: this.agencySettings.email
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.showSavedMessage();
      },
      error: () => {
        this.saving.set(false);
      }
    });
  }

  cancelAgencyEdit(): void {
    // Reset to original agency data
    const agency = this.agency();
    if (agency) {
      this.agencySettings = {
        name: agency.name || '',
        address: agency.address || '',
        phone: agency.phone || '',
        email: agency.email || ''
      };
    }
  }

  saveAllSettings(): void {
    this.saving.set(true);
    // Save agency settings first
    this.state.updateAgency({
      name: this.agencySettings.name,
      address: this.agencySettings.address,
      phone: this.agencySettings.phone,
      email: this.agencySettings.email
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.showSavedMessage();
      },
      error: () => {
        this.saving.set(false);
      }
    });
  }

  resetSettings(): void {
    this.notificationSettings = {
      agency: {
        newDossier: true,
        missingDocuments: false
      },
      clients: {
        autoReminder: true,
        confirmReceipt: true
      }
    };
  }

  private showSavedMessage(): void {
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 2000);
  }

  toggleModule(module: keyof ModuleSettings): void {
    this.moduleSettings[module] = !this.moduleSettings[module];
  }

  toggleSecurity(setting: keyof SecuritySettings): void {
    if (typeof this.securitySettings[setting] === 'boolean') {
      (this.securitySettings[setting] as boolean) = 
        !this.securitySettings[setting];
    }
  }
}

