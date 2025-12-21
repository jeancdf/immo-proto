import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { StateService } from '../../services/state.service';

/**
 * Property Link Component
 * Generates shareable links and QR codes for property applications
 * Allows agents to share links in property listings
 */
@Component({
  selector: 'app-property-link',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './property-link.component.html',
  styleUrl: './property-link.component.css'
})
export class PropertyLinkComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly state = inject(StateService);

  // Property info
  readonly propertyId = signal<number | null>(null);
  readonly property = this.state.properties;

  // Selected property computed
  readonly selectedProperty = () => {
    const id = this.propertyId();
    if (!id) return null;
    return this.state.getPropertyById(id);
  };

  // Link settings
  readonly linkType = signal<'location' | 'vente'>('location');
  readonly expirationDays = signal<number>(30);
  
  // Generated link state
  readonly generatedLink = signal<string>('');
  readonly showQRCode = signal(false);
  readonly copied = signal(false);

  ngOnInit(): void {
    // Load properties if needed
    if (this.state.properties().length === 0) {
      this.state.loadProperties();
    }

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.propertyId.set(parseInt(idParam, 10));
    }
  }

  selectProperty(id: number): void {
    this.propertyId.set(id);
    this.generatedLink.set('');
    this.showQRCode.set(false);
  }

  generateLink(): void {
    const propId = this.propertyId();
    if (!propId) return;

    // Generate unique token for the link
    const token = this.generateToken();
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/candidature/${propId}?type=${this.linkType()}&token=${token}`;
    
    this.generatedLink.set(link);
  }

  private generateToken(): string {
    return Math.random().toString(36).substring(2, 10) + 
           Date.now().toString(36);
  }

  toggleQRCode(): void {
    this.showQRCode.update(v => !v);
  }

  copyLink(): void {
    if (this.generatedLink()) {
      navigator.clipboard.writeText(this.generatedLink());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    }
  }

  goBack(): void {
    const id = this.propertyId();
    if (id) {
      this.router.navigate(['/biens', id]);
    } else {
      this.router.navigate(['/biens']);
    }
  }

  // Generate QR Code SVG (simple implementation)
  getQRCodeUrl(): string {
    const link = encodeURIComponent(this.generatedLink());
    // Using a free QR code API
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${link}`;
  }
}

