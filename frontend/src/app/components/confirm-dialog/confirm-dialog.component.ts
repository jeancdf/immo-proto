import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Confirm Dialog Component
 * Reusable confirmation dialog for destructive actions
 */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen()) {
      <div class="dialog-overlay" (click)="onOverlayClick($event)">
        <div class="dialog-container">
          <div class="dialog-icon" [class]="type()">
            @if (type() === 'danger') {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" 
                   stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            } @else {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" 
                   stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            }
          </div>
          
          <h3 class="dialog-title">{{ title() }}</h3>
          <p class="dialog-message">{{ message() }}</p>
          
          <div class="dialog-actions">
            <button class="btn btn-secondary" (click)="onCancel()">
              {{ cancelText() }}
            </button>
            <button 
              class="btn" 
              [class.btn-danger]="type() === 'danger'"
              [class.btn-primary]="type() !== 'danger'"
              (click)="onConfirm()"
              [disabled]="loading()">
              @if (loading()) {
                <span class="spinner-small"></span>
              }
              {{ confirmText() }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1100;
      padding: 20px;
      animation: fadeIn 0.15s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .dialog-container {
      background: #fff;
      border-radius: 16px;
      padding: 32px;
      width: 100%;
      max-width: 400px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
      animation: scaleIn 0.2s ease;
    }

    @keyframes scaleIn {
      from { 
        opacity: 0;
        transform: scale(0.95);
      }
      to { 
        opacity: 1;
        transform: scale(1);
      }
    }

    .dialog-icon {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
    }

    .dialog-icon svg {
      width: 28px;
      height: 28px;
    }

    .dialog-icon.danger {
      background: #fee2e2;
      color: #dc2626;
    }

    .dialog-icon.warning {
      background: #fef3c7;
      color: #d97706;
    }

    .dialog-icon.info {
      background: #dbeafe;
      color: #2563eb;
    }

    .dialog-title {
      font-size: 18px;
      font-weight: 600;
      color: #1e293b;
      margin: 0 0 8px 0;
    }

    .dialog-message {
      font-size: 14px;
      color: #64748b;
      margin: 0 0 24px 0;
      line-height: 1.5;
    }

    .dialog-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      border: none;
      min-width: 100px;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #f1f5f9;
      color: #475569;
    }

    .btn-secondary:hover:not(:disabled) {
      background: #e2e8f0;
    }

    .btn-primary {
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      color: #fff;
    }

    .btn-danger {
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: #fff;
    }

    .btn-danger:hover:not(:disabled) {
      box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
    }

    .spinner-small {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class ConfirmDialogComponent {
  // Inputs
  isOpen = input<boolean>(false);
  title = input<string>('Confirmation');
  message = input<string>('Êtes-vous sûr ?');
  confirmText = input<string>('Confirmer');
  cancelText = input<string>('Annuler');
  type = input<'danger' | 'warning' | 'info'>('danger');
  loading = input<boolean>(false);

  // Outputs
  confirmed = output<void>();
  cancelled = output<void>();

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('dialog-overlay')) {
      this.onCancel();
    }
  }

  onConfirm(): void {
    this.confirmed.emit();
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}

