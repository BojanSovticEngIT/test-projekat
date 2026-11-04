export interface HcCount {
  internal: number;
  b2b: number;
  supplier: number;
}

export interface HcTotals {
  byCountry: Record<string, HcCount>;
  internal: number;
  external: number;
  total: number;
}

export interface HcRow {
  n2: string;
  total: HcTotals;
}

export interface HcGroup {
  n1: string;
  rows: HcRow[];
  total: HcTotals;
}

export interface HcView {
  // Table columns: the selected countries, then "Other countries" when needed.
  countries: string[];
  // Countries from the list that have at least one counted employee.
  availableCountries: string[];
  groups: HcGroup[];
  grandTotal: HcTotals;
}
