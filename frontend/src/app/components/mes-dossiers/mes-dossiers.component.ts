import { Component, inject, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StateService } from '../../services/state.service';
import { Dossier } from '../../models/dossier.model';

/**
 * Interface for activity statistics
 */
interface ActivityStats {
  created: number;
  completed: number;
  inProgress: number;
  overdue: number;
  completionRate: number;
}

/**
 * Interface for alert items
 */
interface AlertItem {
  id: number;
  type: 'warning' | 'danger' | 'info';
  clientName: string;
  message: string;
  daysInactive: number;
  dossierId: number;
}

/**
 * Mes Dossiers Component - Analytics Dashboard
 * Displays KPIs, charts, and alerts for the agent's dossiers
 */
@Component({
  selector: 'app-mes-dossiers',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mes-dossiers.component.html',
  styleUrl: './mes-dossiers.component.css'
})
export class MesDossiersComponent implements OnInit {
  private readonly router = inject(Router);
  readonly state = inject(StateService);

  // Signals from state
  readonly allDossiers = this.state.dossiers;
  readonly loading = this.state.loadingDossiers;
  readonly currentUser = this.state.currentUser;

  // Local signals
  readonly selectedPeriod = signal<'week' | 'month' | 'year'>('month');

  // Filter dossiers for current agent (simulated - in real app would use auth)
  readonly myDossiers = computed(() => {
    const dossiers = this.allDossiers();
    // For demo, show all dossiers (in real app: filter by current user's agent ID)
    return dossiers;
  });

  // Activity statistics
  readonly activityStats = computed<ActivityStats>(() => {
    const dossiers = this.myDossiers();
    const now = new Date();
    const periodStart = this.getPeriodStart(now, this.selectedPeriod());

    // Filter by period
    const periodDossiers = dossiers.filter(d => 
      new Date(d.createdAt) >= periodStart
    );

    const completed = dossiers.filter(d => d.status === 'complet').length;
    const inProgress = dossiers.filter(d => 
      d.status === 'en_cours' || d.status === 'a_completer'
    ).length;

    // Calculate overdue (inactive for more than 7 days)
    const overdue = dossiers.filter(d => {
      if (d.status === 'complet' || d.status === 'archive') return false;
      const lastUpdate = new Date(d.updatedAt);
      const daysSince = Math.floor(
        (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSince > 7;
    }).length;

    const total = dossiers.length;
    const completionRate = total > 0 
      ? Math.round((completed / total) * 100) 
      : 0;

    return {
      created: periodDossiers.length,
      completed,
      inProgress,
      overdue,
      completionRate
    };
  });

  // Type distribution
  readonly typeDistribution = computed(() => {
    const dossiers = this.myDossiers();
    const location = dossiers.filter(d => d.type === 'location').length;
    const vente = dossiers.filter(d => d.type === 'vente').length;
    const total = dossiers.length || 1;

    return {
      location: { count: location, percent: Math.round((location / total) * 100) },
      vente: { count: vente, percent: Math.round((vente / total) * 100) }
    };
  });

  // Status distribution
  readonly statusDistribution = computed(() => {
    const dossiers = this.myDossiers();
    const total = dossiers.length || 1;

    return {
      a_completer: {
        count: dossiers.filter(d => d.status === 'a_completer').length,
        percent: 0
      },
      en_cours: {
        count: dossiers.filter(d => d.status === 'en_cours').length,
        percent: 0
      },
      complet: {
        count: dossiers.filter(d => d.status === 'complet').length,
        percent: 0
      },
      archive: {
        count: dossiers.filter(d => d.status === 'archive').length,
        percent: 0
      }
    };
  });

  // Alerts for stagnant or problematic dossiers
  readonly alerts = computed<AlertItem[]>(() => {
    const dossiers = this.myDossiers();
    const now = new Date();
    const alerts: AlertItem[] = [];

    dossiers.forEach(d => {
      if (d.status === 'complet' || d.status === 'archive') return;

      const lastUpdate = new Date(d.updatedAt);
      const daysSince = Math.floor(
        (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Inactive for more than 14 days
      if (daysSince > 14) {
        alerts.push({
          id: d.id,
          type: 'danger',
          clientName: `${d.client.firstName} ${d.client.lastName}`,
          message: `Inactif depuis ${daysSince} jours`,
          daysInactive: daysSince,
          dossierId: d.id
        });
      } else if (daysSince > 7) {
        // Inactive for more than 7 days
        alerts.push({
          id: d.id,
          type: 'warning',
          clientName: `${d.client.firstName} ${d.client.lastName}`,
          message: `Inactif depuis ${daysSince} jours`,
          daysInactive: daysSince,
          dossierId: d.id
        });
      }

      // Missing documents (low score)
      if (d.score !== null && d.score < 5) {
        alerts.push({
          id: d.id + 1000,
          type: 'info',
          clientName: `${d.client.firstName} ${d.client.lastName}`,
          message: `Note faible (${d.score}/10) - Documents manquants`,
          daysInactive: daysSince,
          dossierId: d.id
        });
      }
    });

    // Sort by severity and limit
    return alerts
      .sort((a, b) => {
        const severity = { danger: 0, warning: 1, info: 2 };
        return severity[a.type] - severity[b.type];
      })
      .slice(0, 5);
  });

  // Recent activity (last 5 updated dossiers)
  readonly recentActivity = computed(() => {
    return [...this.myDossiers()]
      .sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      .slice(0, 5);
  });

  // Top performing dossiers (highest scores)
  readonly topDossiers = computed(() => {
    return [...this.myDossiers()]
      .filter(d => d.score !== null)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 5);
  });

  // Monthly trend data (last 6 months simulation)
  readonly monthlyTrend = computed(() => {
    const months = ['Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
    // Simulated data for demo
    return months.map((month, i) => ({
      month,
      created: Math.floor(Math.random() * 10) + 5,
      completed: Math.floor(Math.random() * 8) + 3
    }));
  });

  ngOnInit(): void {
    // Data already loaded via StateService initialization
  }

  // Helper to get period start date
  private getPeriodStart(now: Date, period: 'week' | 'month' | 'year'): Date {
    const start = new Date(now);
    switch (period) {
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        break;
    }
    return start;
  }

  // Set period filter
  setPeriod(period: 'week' | 'month' | 'year'): void {
    this.selectedPeriod.set(period);
  }

  // Navigate to dossier detail
  viewDossier(id: number): void {
    this.router.navigate(['/dossier', id]);
  }

  // Navigate to create new dossier
  createDossier(): void {
    this.router.navigate(['/dossier/new']);
  }

  // Get status label
  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      a_completer: 'À compléter',
      complet: 'Complet',
      en_cours: 'En cours',
      archive: 'Archivé'
    };
    return labels[status] || status;
  }

  // Format date
  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short' 
    });
  }

  // Get alert icon
  getAlertIcon(type: string): string {
    switch (type) {
      case 'danger': return '🔴';
      case 'warning': return '🟠';
      case 'info': return '🔵';
      default: return '⚪';
    }
  }
}

