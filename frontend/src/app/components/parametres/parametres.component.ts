import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../../services/state.service';

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

/**
 * Parametres Component
 * Settings page for agency configuration
 * Includes agency info, modules, security, and notifications
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

  // Agency info from state
  readonly agency = this.state.agency;
  readonly currentUser = this.state.currentUser;

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

  ngOnInit(): void {
    // Initialize with agency data
    const agency = this.agency();
    if (agency) {
      this.agencySettings.name = agency.name;
      this.agencySettings.address = agency.address;
    }
  }

  saveAgencySettings(): void {
    this.saving.set(true);
    // Simulate save
    setTimeout(() => {
      this.saving.set(false);
      this.showSavedMessage();
    }, 500);
  }

  saveAllSettings(): void {
    this.saving.set(true);
    // Simulate save
    setTimeout(() => {
      this.saving.set(false);
      this.showSavedMessage();
    }, 500);
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

