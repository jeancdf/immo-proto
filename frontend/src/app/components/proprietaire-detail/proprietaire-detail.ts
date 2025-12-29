import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ProprietaireFull, OwnerInteraction } from '../../models/dossier.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-proprietaire-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './proprietaire-detail.html',
  styleUrl: './proprietaire-detail.css'
})
export class ProprietaireDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);

  readonly owner = signal<ProprietaireFull | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly activeTab = signal<'patrimoine' | 'crm'>('patrimoine');

  readonly showInteractionForm = signal(false);
  readonly newInteraction = signal({
    type: 'note' as OwnerInteraction['type'],
    content: ''
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadOwnerData(parseInt(id, 10));
    }
  }

  loadOwnerData(id: number): void {
    this.loading.set(true);
    this.http.get<ProprietaireFull>(`/api/owners/${id}`).subscribe({
      next: (data) => {
        this.owner.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading owner:', err);
        this.error.set('Impossible de charger les données du propriétaire');
        this.loading.set(false);
      }
    });
  }

  setTab(tab: 'patrimoine' | 'crm'): void {
    this.activeTab.set(tab);
  }

  addInteraction(): void {
    const currentOwner = this.owner();
    if (!currentOwner || !this.newInteraction().content) return;

    this.http.post<OwnerInteraction>(`/api/owners/${currentOwner.id}/interactions`, this.newInteraction())
      .subscribe({
        next: (interaction) => {
          this.owner.update(o => {
            if (!o) return o;
            return {
              ...o,
              interactions: [interaction, ...o.interactions]
            };
          });
          this.newInteraction.set({ type: 'note', content: '' });
          this.showInteractionForm.set(false);
        },
        error: (err) => console.error('Error adding interaction:', err)
      });
  }

  goBack(): void {
    window.history.back();
  }

  getInteractionIcon(type: string): string {
    switch (type) {
      case 'email': return '📧';
      case 'appel': return '📞';
      case 'rdv': return '📅';
      default: return '📝';
    }
  }
}
