/**
 * Shared types used across the calculation engine, calculator modules,
 * and the UI. The /core layer is the only thing the calculators are
 * allowed to depend on (no Electron, no DOM, no Node-only APIs).
 */

export type FieldType = 'number' | 'currency' | 'percent' | 'integer' | 'text' | 'select' | 'date';

/**
 * Attached to a FieldDef to declare that the field's value should
 * default to a live IRS Applicable Federal Rate.
 * The renderer uses this metadata to inject AFR defaults and display badges.
 */
export interface AfrLinked {
  /** Term bucket that applies to this field by default. */
  term: 'short' | 'mid' | 'long';
  /** Preferred compounding frequency for this field (global setting overrides). */
  compounding: 'annual' | 'semiannual' | 'quarterly' | 'monthly';
  /**
   * Optional scalar applied after the AFR lookup.
   * Set to 1.2 for §7520 rate fields (= 120% × mid-term AFR).
   */
  multiplier?: number;
}

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  default?: number | string;
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
  help?: string;
  options?: { value: string | number; label: string }[];
  /** When present, the renderer will default this field to a live IRS AFR. */
  afrLinked?: AfrLinked;
}

export interface CalculatorMetadata {
  id: string;
  name: string;
  category: string;          // tab id, e.g. "investment"
  description: string;
  inputs: FieldDef[];
}

export interface CalculatorResult {
  /** Primary outputs, displayed as KPI cards. */
  summary: Record<string, number | string>;
  /** Optional schedule/table rows for amortization, projections, etc. */
  schedule?: Array<Record<string, number | string>>;
  /** Free-form notes the engine may emit (e.g. assumptions). */
  notes?: string[];
}

export type CalculatorRunner = (inputs: Record<string, any>) => CalculatorResult;

export interface Calculator extends CalculatorMetadata {
  run: CalculatorRunner;
}

export interface Scenario {
  id: string;
  name: string;
  createdAt: string;
  calculatorId: string;
  inputs: Record<string, any>;
  result?: CalculatorResult;
}
