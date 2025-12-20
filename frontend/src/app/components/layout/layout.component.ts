import { Component, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { StateService } from '../../services/state.service';

/**
 * Layout Component
 * Main application shell with sidebar navigation and header
 * Uses StateService signals for reactive data display
 */
@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css'
})
export class LayoutComponent implements OnInit {
  readonly state = inject(StateService);

  // Expose signals from state service
  readonly agency = this.state.agency;
  readonly currentUser = this.state.currentUser;

  // Computed user initials
  readonly userInitials = computed(() => {
    const name = this.currentUser()?.name || '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  });

  ngOnInit(): void {
    // Initialize all app data on layout load
    this.state.initializeAppData();
  }
}
