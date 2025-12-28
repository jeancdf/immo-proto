import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { PropertyWithDossiers } from '../../models/dossier.model';

/**
 * Interface pour les templates d'annonces
 */
interface AnnonceTemplate {
  id: string;
  name: string;
  icon: string;
  maxLength: number | null;
  description: string;
}

/**
 * Générateur d'annonces automatique
 * Crée des annonces formatées pour différentes plateformes
 */
@Component({
  selector: 'app-annonce-generator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './annonce-generator.component.html',
  styleUrl: './annonce-generator.component.css'
})
export class AnnonceGeneratorComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly apiService = inject(ApiService);

  // State
  readonly property = signal<PropertyWithDossiers | null>(null);
  readonly isLoading = signal(true);
  readonly selectedTemplate = signal<string>('seloger');
  readonly generatedAnnonce = signal<string>('');
  readonly copySuccess = signal(false);
  readonly includePrice = signal(true);
  readonly includeContact = signal(true);
  readonly customIntro = signal('');

  // Templates disponibles
  readonly templates: AnnonceTemplate[] = [
    {
      id: 'seloger',
      name: 'SeLoger',
      icon: '🏠',
      maxLength: 4000,
      description: 'Format complet pour SeLoger/Logic-Immo'
    },
    {
      id: 'leboncoin',
      name: 'LeBonCoin',
      icon: '🟠',
      maxLength: 4000,
      description: 'Format optimisé pour LeBonCoin'
    },
    {
      id: 'agence',
      name: 'Site Agence',
      icon: '🏢',
      maxLength: null,
      description: 'Format long et détaillé pour votre site'
    },
    {
      id: 'social',
      name: 'Réseaux Sociaux',
      icon: '📱',
      maxLength: 280,
      description: 'Format court pour Twitter/Instagram'
    },
    {
      id: 'email',
      name: 'Email Client',
      icon: '✉️',
      maxLength: null,
      description: 'Format personnalisé pour envoi par email'
    }
  ];

  // Computed: template actuel
  readonly currentTemplate = computed(() => {
    return this.templates.find(t => t.id === this.selectedTemplate());
  });

  // Computed: compteur de caractères
  readonly charCount = computed(() => {
    return this.generatedAnnonce().length;
  });

  // Computed: dépassement de limite
  readonly isOverLimit = computed(() => {
    const template = this.currentTemplate();
    if (!template?.maxLength) return false;
    return this.charCount() > template.maxLength;
  });

  ngOnInit(): void {
    const propertyId = this.route.snapshot.paramMap.get('id');
    if (propertyId) {
      this.loadProperty(+propertyId);
    }
  }

  /**
   * Charge les données du bien
   */
  private loadProperty(id: number): void {
    this.isLoading.set(true);
    this.apiService.getProperties().subscribe({
      next: (properties) => {
        const property = properties.find(p => p.id === id);
        if (property) {
          this.property.set(property);
          this.generateAnnonce();
        } else {
          this.router.navigate(['/biens']);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.router.navigate(['/biens']);
      }
    });
  }

  /**
   * Sélectionne un template et régénère l'annonce
   */
  selectTemplate(templateId: string): void {
    this.selectedTemplate.set(templateId);
    this.generateAnnonce();
  }

  /**
   * Génère l'annonce selon le template sélectionné
   */
  generateAnnonce(): void {
    const property = this.property();
    if (!property) return;

    let annonce = '';

    switch (this.selectedTemplate()) {
      case 'seloger':
        annonce = this.generateSeLoger(property);
        break;
      case 'leboncoin':
        annonce = this.generateLeBonCoin(property);
        break;
      case 'agence':
        annonce = this.generateAgence(property);
        break;
      case 'social':
        annonce = this.generateSocial(property);
        break;
      case 'email':
        annonce = this.generateEmail(property);
        break;
    }

    this.generatedAnnonce.set(annonce);
  }

  /**
   * Helper: Get postal code (zipCode or postalCode)
   */
  private getPostalCode(p: PropertyWithDossiers): string {
    return p.postalCode || p.zipCode || '';
  }

  /**
   * Helper: Get transaction type from dossierTypes
   */
  private getTransactionType(p: PropertyWithDossiers): 'location' | 'vente' {
    if (p.transactionType) return p.transactionType;
    // Infer from dossierTypes if available
    if (p.dossierTypes) {
      if (p.dossierTypes.location > 0 && p.dossierTypes.vente === 0) {
        return 'location';
      }
      if (p.dossierTypes.vente > 0 && p.dossierTypes.location === 0) {
        return 'vente';
      }
    }
    // Default to location if has rent, otherwise vente
    return p.rent ? 'location' : 'vente';
  }

  /**
   * Helper: Get price (rent or price based on transaction type)
   */
  private getPrice(p: PropertyWithDossiers): number {
    const transactionType = this.getTransactionType(p);
    if (transactionType === 'location') {
      return p.rent || p.price || 0;
    }
    return p.price || 0;
  }

  /**
   * Helper: Get features array from boolean properties
   */
  private getFeatures(p: PropertyWithDossiers): string[] {
    const features: string[] = p.features || [];
    // Add features from boolean properties if not already in features
    if (p.hasParking && !features.includes('Parking')) {
      features.push('Parking');
    }
    if (p.hasCellar && !features.includes('Cave')) {
      features.push('Cave');
    }
    if (p.hasElevator && !features.includes('Ascenseur')) {
      features.push('Ascenseur');
    }
    return features;
  }

  /**
   * Template SeLoger - Format professionnel complet
   */
  private generateSeLoger(p: PropertyWithDossiers): string {
    const type = p.type === 'appartement' ? 'Appartement' : 'Maison';
    const transactionType = this.getTransactionType(p);
    const transaction = transactionType === 'location' ? 'À louer' : 'À vendre';
    const intro = this.customIntro() || this.getDefaultIntro(p);
    const postalCode = this.getPostalCode(p);
    const features = this.getFeatures(p);
    const price = this.getPrice(p);

    let annonce = `${type} ${p.rooms || ''}${p.rooms ? ' pièces' : ''}`;
    if (p.surface) annonce += ` - ${p.surface}m²`;
    annonce += `\n\n`;
    annonce += `${intro}\n\n`;

    // Description principale
    annonce += `📍 LOCALISATION\n`;
    annonce += `${p.address}, ${postalCode} ${p.city}\n\n`;

    annonce += `📐 CARACTÉRISTIQUES\n`;
    if (p.surface) annonce += `• Surface : ${p.surface}m²\n`;
    if (p.rooms) annonce += `• Pièces : ${p.rooms}\n`;
    if (p.bedrooms) annonce += `• Chambres : ${p.bedrooms}\n`;
    if (p.bathrooms) annonce += `• Salles de bain : ${p.bathrooms}\n`;
    if (p.floor !== undefined) {
      annonce += `• Étage : ${p.floor === 0 ? 'RDC' : p.floor}\n`;
    }
    if (p.totalFloors) annonce += `• Étages immeuble : ${p.totalFloors}\n`;
    annonce += '\n';

    // Équipements
    if (features.length > 0) {
      annonce += `✨ ÉQUIPEMENTS\n`;
      features.forEach(f => {
        annonce += `• ${f}\n`;
      });
      annonce += '\n';
    }

    // Diagnostics
    if (p.dpe || p.ges) {
      annonce += `🌱 PERFORMANCE ÉNERGÉTIQUE\n`;
      if (p.dpe) annonce += `• DPE : ${p.dpe}\n`;
      if (p.ges) annonce += `• GES : ${p.ges}\n`;
      annonce += '\n';
    }

    // Prix
    if (this.includePrice()) {
      annonce += `💰 ${transaction.toUpperCase()}\n`;
      if (transactionType === 'location') {
        annonce += `• Loyer : ${this.formatPrice(price)}€/mois\n`;
        if (p.charges) annonce += `• Charges : ${p.charges}€/mois\n`;
      } else {
        annonce += `• Prix : ${this.formatPrice(price)}€\n`;
        if (p.charges) annonce += `• Charges copro : ${p.charges}€/mois\n`;
      }
      annonce += '\n';
    }

    // Contact
    if (this.includeContact()) {
      annonce += `📞 CONTACT\n`;
      annonce += `Référence : ${p.id}\n`;
      annonce += `Contactez-nous pour organiser une visite !\n`;
    }

    return annonce;
  }

  /**
   * Template LeBonCoin - Format accrocheur
   */
  private generateLeBonCoin(p: PropertyWithDossiers): string {
    const type = p.type === 'appartement' ? 'Appartement' : 'Maison';
    const transactionType = this.getTransactionType(p);
    const transaction = transactionType === 'location' ? 'À LOUER' : 'À VENDRE';
    const postalCode = this.getPostalCode(p);
    const features = this.getFeatures(p);
    const price = this.getPrice(p);

    let annonce = `🔥 ${transaction} - ${type}`;
    if (p.rooms) annonce += ` ${p.rooms}P`;
    if (p.surface) annonce += ` ${p.surface}m²`;
    annonce += ` 🔥\n\n`;

    const intro = this.customIntro() || this.getAccroche(p);
    annonce += `${intro}\n\n`;

    annonce += `📍 ${p.city} (${postalCode})\n\n`;

    annonce += `Ce que vous allez adorer :\n`;
    if (p.surface) annonce += `✅ ${p.surface}m² de surface\n`;
    if (p.rooms) annonce += `✅ ${p.rooms} pièces\n`;
    if (p.bedrooms) annonce += `✅ ${p.bedrooms} chambre(s)\n`;
    
    if (features.length > 0) {
      features.slice(0, 5).forEach(f => {
        annonce += `✅ ${f}\n`;
      });
    }
    annonce += '\n';

    if (p.dpe) {
      annonce += `🏷️ DPE : ${p.dpe}\n\n`;
    }

    if (this.includePrice()) {
      if (transactionType === 'location') {
        annonce += `💰 ${this.formatPrice(price)}€/mois`;
        if (p.charges) annonce += ` (+ ${p.charges}€ charges)`;
      } else {
        annonce += `💰 ${this.formatPrice(price)}€`;
      }
      annonce += '\n\n';
    }

    annonce += `📸 Plus de photos sur demande\n`;
    annonce += `📞 Visite possible rapidement\n`;
    annonce += `\nRéf: ${p.id}`;

    return annonce;
  }

  /**
   * Template Site Agence - Format long et détaillé
   */
  private generateAgence(p: PropertyWithDossiers): string {
    const type = p.type === 'appartement' ? 'Appartement' : 'Maison';
    const transactionType = this.getTransactionType(p);
    const transaction = transactionType === 'location' ? 'Location' : 'Vente';
    const postalCode = this.getPostalCode(p);
    const features = this.getFeatures(p);
    const price = this.getPrice(p);

    let annonce = `${type} ${transaction} - ${p.city}\n`;
    annonce += `${'='.repeat(40)}\n\n`;

    const intro = this.customIntro() || this.getDefaultIntro(p);
    annonce += `${intro}\n\n`;

    annonce += `DESCRIPTION DÉTAILLÉE\n`;
    annonce += `${'-'.repeat(20)}\n\n`;

    annonce += `Situé à ${p.address}, ${postalCode} ${p.city}, `;
    if (p.surface) {
      annonce += `ce ${type.toLowerCase()} de ${p.surface}m² `;
    } else {
      annonce += `ce ${type.toLowerCase()} `;
    }
    
    if (p.rooms) {
      annonce += `comprend ${p.rooms} pièce${p.rooms > 1 ? 's' : ''} `;
    }
    if (p.bedrooms) {
      annonce += `dont ${p.bedrooms} chambre${p.bedrooms > 1 ? 's' : ''} `;
    }
    annonce += `et offre un cadre de vie idéal.\n\n`;

    if (p.floor !== undefined) {
      annonce += `L'appartement se situe au `;
      annonce += p.floor === 0 ? 'rez-de-chaussée' : `${p.floor}ème étage`;
      if (p.totalFloors) annonce += ` d'un immeuble de ${p.totalFloors} étages`;
      annonce += '.\n\n';
    }

    if (features.length > 0) {
      annonce += `PRESTATIONS\n`;
      annonce += `${'-'.repeat(20)}\n`;
      features.forEach(f => {
        annonce += `• ${f}\n`;
      });
      annonce += '\n';
    }

    annonce += `INFORMATIONS TECHNIQUES\n`;
    annonce += `${'-'.repeat(20)}\n`;
    if (p.surface) annonce += `• Surface habitable : ${p.surface}m²\n`;
    if (p.rooms) annonce += `• Nombre de pièces : ${p.rooms}\n`;
    if (p.bedrooms) annonce += `• Nombre de chambres : ${p.bedrooms}\n`;
    if (p.bathrooms) annonce += `• Salle(s) de bain : ${p.bathrooms}\n`;
    if (p.dpe) annonce += `• Diagnostic énergétique (DPE) : ${p.dpe}\n`;
    if (p.ges) annonce += `• Émissions GES : ${p.ges}\n`;
    annonce += '\n';

    if (this.includePrice()) {
      annonce += `CONDITIONS FINANCIÈRES\n`;
      annonce += `${'-'.repeat(20)}\n`;
      if (transactionType === 'location') {
        annonce += `• Loyer mensuel : ${this.formatPrice(price)} €\n`;
        if (p.charges) {
          annonce += `• Charges mensuelles : ${p.charges} €\n`;
          const total = price + (p.charges || 0);
          annonce += `• Total mensuel : ${this.formatPrice(total)} €\n`;
        }
      } else {
        annonce += `• Prix de vente : ${this.formatPrice(price)} €\n`;
        if (p.charges) {
          annonce += `• Charges de copropriété : ${p.charges} €/mois\n`;
        }
      }
      annonce += '\n';
    }

    if (this.includeContact()) {
      annonce += `CONTACT\n`;
      annonce += `${'-'.repeat(20)}\n`;
      annonce += `Référence annonce : ${p.id}\n`;
      annonce += `N'hésitez pas à nous contacter pour obtenir plus `;
      annonce += `d'informations ou organiser une visite.\n`;
    }

    return annonce;
  }

  /**
   * Template Réseaux Sociaux - Format ultra court
   */
  private generateSocial(p: PropertyWithDossiers): string {
    const type = p.type === 'appartement' ? 'Appart' : 'Maison';
    const transactionType = this.getTransactionType(p);
    const emoji = transactionType === 'location' ? '🔑' : '🏡';
    const features = this.getFeatures(p);
    const price = this.getPrice(p);

    let annonce = `${emoji} ${type}`;
    if (p.surface) annonce += ` ${p.surface}m²`;
    if (p.rooms) annonce += ` ${p.rooms}P`;
    annonce += ` - ${p.city}`;

    if (this.includePrice() && price) {
      if (transactionType === 'location') {
        annonce += ` | ${this.formatPrice(price)}€/mois`;
      } else {
        annonce += ` | ${this.formatPrice(price)}€`;
      }
    }

    // Ajouter les meilleurs atouts
    const highlights: string[] = [];
    if (features.includes('Balcon')) highlights.push('🌿');
    if (features.includes('Parking') || p.hasParking) highlights.push('🚗');
    if (features.includes('Terrasse')) highlights.push('☀️');
    if (features.includes('Cave') || p.hasCellar) highlights.push('📦');

    if (highlights.length > 0) {
      annonce += ` ${highlights.join('')}`;
    }

    annonce += `\n\n📞 DM pour + d'infos !`;
    annonce += `\n#immobilier #${p.city.toLowerCase().replace(/\s/g, '')}`;
    annonce += ` #${transactionType}`;

    return annonce;
  }

  /**
   * Template Email Client - Format personnalisé
   */
  private generateEmail(p: PropertyWithDossiers): string {
    const type = p.type === 'appartement' ? 'appartement' : 'maison';
    const transactionType = this.getTransactionType(p);
    const transaction = transactionType === 'location' 
      ? 'à la location' : 'à la vente';
    const postalCode = this.getPostalCode(p);
    const features = this.getFeatures(p);
    const price = this.getPrice(p);

    let annonce = `Bonjour,\n\n`;
    annonce += `Suite à notre échange, je vous présente ce ${type} `;
    annonce += `${transaction} qui pourrait correspondre à vos critères :\n\n`;

    annonce += `📍 ${p.address}, ${postalCode} ${p.city}\n\n`;

    annonce += `Caractéristiques principales :\n`;
    if (p.surface) annonce += `• Surface : ${p.surface}m²\n`;
    if (p.rooms) annonce += `• ${p.rooms} pièce${p.rooms > 1 ? 's' : ''}\n`;
    if (p.bedrooms) {
      annonce += `• ${p.bedrooms} chambre${p.bedrooms > 1 ? 's' : ''}\n`;
    }

    if (features.length > 0) {
      annonce += `• Atouts : ${features.slice(0, 4).join(', ')}\n`;
    }

    if (p.dpe) annonce += `• DPE : ${p.dpe}\n`;
    annonce += '\n';

    if (this.includePrice() && price) {
      if (transactionType === 'location') {
        annonce += `💰 Loyer : ${this.formatPrice(price)}€/mois`;
        if (p.charges) annonce += ` (+ ${p.charges}€ de charges)`;
      } else {
        annonce += `💰 Prix : ${this.formatPrice(price)}€`;
      }
      annonce += '\n\n';
    }

    annonce += `Ce bien vous intéresse ? Je suis disponible pour organiser `;
    annonce += `une visite à votre convenance.\n\n`;

    annonce += `N'hésitez pas à me contacter pour toute question.\n\n`;
    annonce += `Cordialement,\n`;
    annonce += `[Votre signature]`;

    return annonce;
  }

  /**
   * Génère une introduction par défaut
   */
  private getDefaultIntro(p: PropertyWithDossiers): string {
    const type = p.type === 'appartement' ? 'appartement' : 'maison';
    const transactionType = this.getTransactionType(p);
    const surface = p.surface || 0;
    const qualite = surface > 80 ? 'spacieux' : 'fonctionnel';
    
    if (transactionType === 'location') {
      return `Découvrez ce ${qualite} ${type}` +
        (surface ? ` de ${surface}m²` : '') +
        ` idéalement situé à ${p.city}. Un bien lumineux et agréable ` +
        `qui n'attend plus que vous !`;
    } else {
      return `Opportunité rare à ${p.city} ! Ce ${qualite} ${type}` +
        (surface ? ` de ${surface}m²` : '') +
        ` offre un excellent rapport qualité-prix ` +
        `dans un secteur recherché.`;
    }
  }

  /**
   * Génère une accroche percutante pour LeBonCoin
   */
  private getAccroche(p: PropertyWithDossiers): string {
    const surface = p.surface ? `${p.surface}m²` : 'ce bien';
    const accroches = [
      `Ne passez pas à côté de cette pépite à ${p.city} !`,
      `Coup de cœur assuré pour ce bien d'exception !`,
      `Rare sur le marché : ${surface} en plein ${p.city} !`,
      `Votre futur chez-vous vous attend à ${p.city} !`,
      `À saisir rapidement : ${surface} bien agencés !`
    ];
    return accroches[Math.floor(Math.random() * accroches.length)];
  }

  /**
   * Formate un prix avec séparateur de milliers
   */
  private formatPrice(price: number | undefined): string {
    if (!price) return '0';
    return price.toLocaleString('fr-FR');
  }

  /**
   * Copie l'annonce dans le presse-papier
   */
  async copyToClipboard(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.generatedAnnonce());
      this.copySuccess.set(true);
      setTimeout(() => this.copySuccess.set(false), 2000);
    } catch (err) {
      console.error('Erreur copie:', err);
    }
  }

  /**
   * Régénère l'annonce avec les options actuelles
   */
  regenerate(): void {
    this.generateAnnonce();
  }

  /**
   * Retour à la page du bien
   */
  goBack(): void {
    const propertyId = this.property()?.id;
    if (propertyId) {
      this.router.navigate(['/biens', propertyId]);
    } else {
      this.router.navigate(['/biens']);
    }
  }
}

