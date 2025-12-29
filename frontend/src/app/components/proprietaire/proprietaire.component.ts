import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Proprietaire } from '../../models/dossier.model';
import { Router } from '@angular/router';

/**
 * Proprietaire Component
 * Displays information about a property owner
 */
@Component({
  selector: 'app-proprietaire',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './proprietaire.component.html',
  styleUrl: './proprietaire.component.css'
})
export class ProprietaireComponent {
  private readonly router = inject(Router);
  
  @Input({ required: true }) proprietaire!: Proprietaire;
  @Input() showActions = true;

  @Output() edit = new EventEmitter<Proprietaire>();
  @Output() delete = new EventEmitter<Proprietaire>();

  viewDetail(): void {
    this.router.navigate(['/proprietaires', this.proprietaire.id]);
  }

  onEdit(event: Event): void {
    event.stopPropagation();
    this.edit.emit(this.proprietaire);
  }

  onDelete(event: Event): void {
    event.stopPropagation();
    this.delete.emit(this.proprietaire);
  }
}

