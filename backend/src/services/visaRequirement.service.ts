import * as fs from 'fs/promises';
import * as path from 'path';

// =============================================================================
// TYPES
// =============================================================================

export type VisaType =
  | 'visa_free'
  | 'visa_exemption'
  | 'visa_on_arrival'
  | 'e_visa'
  | 'eta'
  | 'esta'
  | 'k_eta'
  | 'nzeta'
  | 'visa_required';

export interface VisaRequirement {
  passportCountry: string;
  destinationCountry: string;
  visaRequired: boolean;
  visaType: VisaType;
  maxStayDays: number;
  notes: string;
  sourceUrl: string;
  lastVerified: string;
}

export interface VisaTypeInfo {
  label: string;
  description: string;
  color: 'green' | 'yellow' | 'red';
}

export interface VisaCheckResult {
  passportCountry: string;
  destinationCountry: string;
  found: boolean;
  requirement: VisaRequirement | null;
  visaTypeInfo: VisaTypeInfo | null;
  needsAction: boolean;
  actionRequired: string | null;
}

export interface BulkVisaCheckResult {
  passportCountry: string;
  destinations: VisaCheckResult[];
  requiresVisa: VisaCheckResult[];
  visaFree: VisaCheckResult[];
  unknown: VisaCheckResult[];
}

interface VisaData {
  metadata: {
    description: string;
    lastUpdated: string;
    disclaimer: string;
    sources: string[];
  };
  requirements: VisaRequirement[];
  countryAliases: Record<string, string>;
  visaTypes: Record<string, VisaTypeInfo>;
}

// =============================================================================
// SERVICE
// =============================================================================

class VisaRequirementService {
  private data: VisaData | null = null;
  private requirementMap: Map<string, VisaRequirement> = new Map();
  private knownCountries: Set<string> = new Set();
  private loaded = false;
  private loadPromise: Promise<void> | null = null;

  constructor() {
    // Start loading asynchronously (don't block constructor)
    this.loadPromise = this.loadData();
  }

  /**
   * Load visa requirements data from JSON file (async to avoid blocking event loop)
   */
  private async loadData(): Promise<void> {
    try {
      const dataPath = path.join(__dirname, '../../data/visa-requirements.json');
      const rawData = await fs.readFile(dataPath, 'utf-8');
      this.data = JSON.parse(rawData) as VisaData;

      // Build a lookup map for fast access
      for (const req of this.data.requirements) {
        const key = this.buildKey(req.passportCountry, req.destinationCountry);
        this.requirementMap.set(key, req);
      }

      // Build known countries set for fast lookup (includes aliases)
      for (const alias of Object.keys(this.data.countryAliases)) {
        this.knownCountries.add(alias.toLowerCase());
      }
      for (const req of this.data.requirements) {
        this.knownCountries.add(req.passportCountry.toLowerCase());
        this.knownCountries.add(req.destinationCountry.toLowerCase());
      }

      this.loaded = true;
      console.info(
        `[VisaRequirementService] Loaded ${this.data.requirements.length} visa requirements`
      );
    } catch (error) {
      console.error('[VisaRequirementService] Failed to load visa requirements data:', error);
      this.data = null;
      this.loaded = false;
    }
  }

  /**
   * Ensure data is loaded before accessing it (for callers that need to wait)
   */
  async ensureLoaded(): Promise<boolean> {
    if (this.loadPromise) {
      await this.loadPromise;
    }
    return this.loaded;
  }

  /**
   * Build a lookup key from passport and destination countries
   */
  private buildKey(passportCountry: string, destinationCountry: string): string {
    return `${this.normalizeCountry(passportCountry)}|${this.normalizeCountry(destinationCountry)}`;
  }

  /**
   * Normalize country name (handle aliases and case)
   */
  private normalizeCountry(country: string): string {
    if (!this.data) return country.toLowerCase().trim();

    const trimmed = country.trim();
    const alias = this.data.countryAliases[trimmed];
    if (alias) {
      return alias.toLowerCase();
    }
    return trimmed.toLowerCase();
  }

  /**
   * Get visa type info for a given visa type
   */
  private getVisaTypeInfo(visaType: VisaType): VisaTypeInfo | null {
    if (!this.data) return null;
    return this.data.visaTypes[visaType] || null;
  }

  /**
   * Determine if a visa type requires action before travel
   */
  private requiresAction(visaType: VisaType): boolean {
    // These types require obtaining something before travel
    return ['e_visa', 'eta', 'esta', 'k_eta', 'nzeta', 'visa_required'].includes(visaType);
  }

  /**
   * Get the action required for a visa type
   */
  private getActionRequired(visaType: VisaType): string | null {
    switch (visaType) {
      case 'e_visa':
        return 'Apply for e-Visa online before travel';
      case 'eta':
        return 'Apply for Electronic Travel Authority before travel';
      case 'esta':
        return 'Apply for ESTA before travel';
      case 'k_eta':
        return 'Apply for K-ETA before travel';
      case 'nzeta':
        return 'Apply for NZeTA before travel';
      case 'visa_required':
        return 'Apply for visa at embassy/consulate before travel';
      default:
        return null;
    }
  }

  /**
   * Check visa requirement for a single passport-destination pair
   */
  checkVisaRequirement(passportCountry: string, destinationCountry: string): VisaCheckResult {
    if (!this.loaded || !this.data) {
      return {
        passportCountry,
        destinationCountry,
        found: false,
        requirement: null,
        visaTypeInfo: null,
        needsAction: false,
        actionRequired: null,
      };
    }

    // Same country - no visa needed
    if (this.normalizeCountry(passportCountry) === this.normalizeCountry(destinationCountry)) {
      return {
        passportCountry,
        destinationCountry,
        found: true,
        requirement: {
          passportCountry,
          destinationCountry,
          visaRequired: false,
          visaType: 'visa_free',
          maxStayDays: -1,
          notes: 'No visa required for domestic travel',
          sourceUrl: '',
          lastVerified: new Date().toISOString().split('T')[0],
        },
        visaTypeInfo: this.getVisaTypeInfo('visa_free'),
        needsAction: false,
        actionRequired: null,
      };
    }

    const key = this.buildKey(passportCountry, destinationCountry);
    const requirement = this.requirementMap.get(key);

    if (!requirement) {
      return {
        passportCountry,
        destinationCountry,
        found: false,
        requirement: null,
        visaTypeInfo: null,
        needsAction: false,
        actionRequired: null,
      };
    }

    return {
      passportCountry,
      destinationCountry,
      found: true,
      requirement,
      visaTypeInfo: this.getVisaTypeInfo(requirement.visaType),
      needsAction: this.requiresAction(requirement.visaType),
      actionRequired: this.getActionRequired(requirement.visaType),
    };
  }

  /**
   * Check visa requirements for multiple destinations
   */
  getVisaRequirementsForDestinations(
    passportCountry: string,
    destinations: string[]
  ): BulkVisaCheckResult {
    const results: VisaCheckResult[] = [];
    const requiresVisa: VisaCheckResult[] = [];
    const visaFree: VisaCheckResult[] = [];
    const unknown: VisaCheckResult[] = [];

    // Remove duplicates
    const uniqueDestinations = [...new Set(destinations.map((d) => d.trim()))];

    for (const destination of uniqueDestinations) {
      const result = this.checkVisaRequirement(passportCountry, destination);
      results.push(result);

      if (!result.found) {
        unknown.push(result);
      } else if (result.requirement?.visaRequired || result.needsAction) {
        requiresVisa.push(result);
      } else {
        visaFree.push(result);
      }
    }

    return {
      passportCountry,
      destinations: results,
      requiresVisa,
      visaFree,
      unknown,
    };
  }

  /**
   * Extract country name from an address string
   * Attempts to find a country name in the address
   */
  extractCountryFromAddress(address: string): string | null {
    if (!address) return null;

    // Common pattern: country is usually the last part after a comma
    const parts = address.split(',').map((p) => p.trim());

    // Try the last part first
    if (parts.length > 0) {
      const lastPart = parts[parts.length - 1];
      if (this.isKnownCountry(lastPart)) {
        return this.resolveCountryAlias(lastPart);
      }
    }

    // Try the second-to-last part (sometimes there's a postal code after country)
    if (parts.length > 1) {
      const secondToLast = parts[parts.length - 2];
      if (this.isKnownCountry(secondToLast)) {
        return this.resolveCountryAlias(secondToLast);
      }
    }

    // Try to find any known country in the address
    for (const part of parts) {
      if (this.isKnownCountry(part)) {
        return this.resolveCountryAlias(part);
      }
    }

    return null;
  }

  /**
   * Check if a string matches a known country (in requirements or aliases)
   * Uses pre-built knownCountries set for O(1) lookup instead of O(n) iteration
   */
  private isKnownCountry(name: string): boolean {
    if (!this.data) return false;

    const normalized = name.trim().toLowerCase();
    return this.knownCountries.has(normalized);
  }

  /**
   * Resolve a country alias to its canonical name
   */
  private resolveCountryAlias(name: string): string {
    if (!this.data) return name;

    const trimmed = name.trim();

    // Check aliases first
    for (const [alias, canonical] of Object.entries(this.data.countryAliases)) {
      if (alias.toLowerCase() === trimmed.toLowerCase()) {
        return canonical;
      }
    }

    // Try to match against known countries (case-insensitive)
    const countriesInData = new Map<string, string>();
    for (const req of this.data.requirements) {
      countriesInData.set(req.passportCountry.toLowerCase(), req.passportCountry);
      countriesInData.set(req.destinationCountry.toLowerCase(), req.destinationCountry);
    }

    const canonical = countriesInData.get(trimmed.toLowerCase());
    return canonical || trimmed;
  }

  /**
   * Get list of supported passport countries
   */
  getSupportedPassportCountries(): string[] {
    if (!this.data) return [];

    const countries = new Set<string>();
    for (const req of this.data.requirements) {
      countries.add(req.passportCountry);
    }
    return Array.from(countries).sort();
  }

  /**
   * Get list of supported destination countries
   */
  getSupportedDestinationCountries(): string[] {
    if (!this.data) return [];

    const countries = new Set<string>();
    for (const req of this.data.requirements) {
      countries.add(req.destinationCountry);
    }
    return Array.from(countries).sort();
  }

  /**
   * Check if service is ready (data loaded)
   */
  isReady(): boolean {
    return this.loaded;
  }

  /**
   * Get metadata about the visa data
   */
  getMetadata(): VisaData['metadata'] | null {
    return this.data?.metadata || null;
  }
}

export default new VisaRequirementService();
