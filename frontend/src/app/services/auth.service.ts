import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of } from 'rxjs';

/**
 * User interface
 */
export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'agent';
  isActive?: boolean;
  createdAt?: string;
  lastLogin?: string | null;
  dossierCount?: number;
}

/**
 * Login response interface
 */
interface LoginResponse {
  token: string;
  user: User;
}

/**
 * Authentication Service
 * Handles login, logout, and user state management
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly baseUrl = '/api/auth';

  // Token storage key
  private readonly TOKEN_KEY = 'dossierhub_token';
  private readonly USER_KEY = 'dossierhub_user';

  // Current user signal
  private readonly _currentUser = signal<User | null>(null);
  private readonly _isLoading = signal(true);

  // Public computed signals
  readonly currentUser = this._currentUser.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  
  readonly isAuthenticated = computed(() => !!this._currentUser());
  readonly isAdmin = computed(() => this._currentUser()?.role === 'admin');
  readonly isAgent = computed(() => this._currentUser()?.role === 'agent');

  constructor() {
    // Try to restore session on startup
    this.restoreSession();
  }

  /**
   * Restore session from localStorage
   */
  private restoreSession(): void {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const userJson = localStorage.getItem(this.USER_KEY);

    if (token && userJson) {
      try {
        const user = JSON.parse(userJson) as User;
        this._currentUser.set(user);
        
        // Verify token is still valid
        this.getMe().subscribe({
          next: (freshUser) => {
            this._currentUser.set(freshUser);
            localStorage.setItem(this.USER_KEY, JSON.stringify(freshUser));
            this._isLoading.set(false);
          },
          error: () => {
            this.logout();
            this._isLoading.set(false);
          }
        });
      } catch {
        this.logout();
        this._isLoading.set(false);
      }
    } else {
      this._isLoading.set(false);
    }
  }

  /**
   * Login with email and password
   */
  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, { 
      email, 
      password 
    }).pipe(
      tap(response => {
        localStorage.setItem(this.TOKEN_KEY, response.token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
        this._currentUser.set(response.user);
      })
    );
  }

  /**
   * Logout current user
   */
  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this._currentUser.set(null);
    this.router.navigate(['/login']);
  }

  /**
   * Get current user info from server
   */
  getMe(): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/me`);
  }

  /**
   * Get auth token
   */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: 'admin' | 'agent'): boolean {
    return this._currentUser()?.role === role;
  }

  // ============================================
  // ADMIN: User Management
  // ============================================

  /**
   * Get all users (admin only)
   */
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.baseUrl}/users`);
  }

  /**
   * Create new user (admin only)
   */
  createUser(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: 'admin' | 'agent';
  }): Observable<User> {
    return this.http.post<User>(`${this.baseUrl}/users`, userData);
  }

  /**
   * Update user (admin only)
   */
  updateUser(userId: number, updates: Partial<User & { password?: string }>): Observable<User> {
    return this.http.patch<User>(`${this.baseUrl}/users/${userId}`, updates);
  }

  /**
   * Toggle user active status (admin only)
   */
  toggleUserStatus(userId: number, isActive: boolean): Observable<User> {
    return this.http.patch<User>(`${this.baseUrl}/users/${userId}`, { isActive });
  }
}

