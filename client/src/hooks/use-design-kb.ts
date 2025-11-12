import { useQuery } from "@tanstack/react-query";

// ===== TYPES =====

export interface Concept {
  id: number;
  title: string;
  summary: string;
  bodyMd: string;
  tags: string[];
  difficulty: "intro" | "intermediate" | "advanced";
  category: string;
  createdAt: string;
  updatedAt: string;
  relatedEquations?: number[];
  relatedExamples?: number[];
}

export interface Equation {
  id: number;
  name: string;
  latex: string;
  description: string;
  variables: {
    symbol: string;
    name: string;
    unit_si: string;
    unit_source?: string;
    description: string;
    typical_range?: string;
  }[];
  assumptions?: string;
  domain?: string;
  references?: string[];
  unitTests?: {
    name: string;
    inputs: Record<string, number>;
    expected_output: number;
    tolerance: number;
  }[];
  validationStatus?: {
    totalTests: number;
    passed: number;
    failed: number;
  };
}

export interface TelescopeExample {
  id: number;
  title: string;
  telescopeType: string;
  apertureMm: number;
  focalRatio: number;
  focalLengthMm: number;
  obstructionPct?: number;
  illuminatedFieldMm?: number;
  focuserType: string;
  printVolumeMm: { x: number; y: number; z: number };
  totalMassKg?: number;
  billOfMaterials: {
    part: string;
    qty: number;
    material?: string;
    vendor?: string;
    sku?: string;
    unit_cost?: number;
    link?: string;
  }[];
  printSettings: {
    nozzle_mm: number;
    layer_mm: number;
    walls: number;
    infill_pct: number;
    material: string;
    anneal?: boolean;
  };
  notesMd?: string;
  dimensions?: any[];
  partFiles?: any[];
  procedures?: any[];
  figures?: any[];
  feasibilityChecks?: {
    secondarySizeValid: boolean;
    focuserTravelValid: boolean;
    obstructionValid: boolean;
    notes: string[];
  };
}

export interface Procedure {
  id: number;
  title: string;
  bodyMd: string;
  type: string;
  estimatedTimeMin?: number;
  tools?: string[];
  steps: {
    order: number;
    description: string;
    figure_id?: number;
    safety_note?: string;
  }[];
  hazardsMd?: string;
  exampleId?: number;
}

export interface RuleOfThumb {
  id: number;
  statementMd: string;
  contextMd?: string;
  sourceRefId?: number;
  tags: string[];
}

// ===== CONCEPT HOOKS =====

export function useConcepts(filters?: {
  q?: string;
  category?: string;
  tag?: string;
  difficulty?: string;
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.q) params.append("q", filters.q);
  if (filters?.category) params.append("category", filters.category);
  if (filters?.tag) params.append("tag", filters.tag);
  if (filters?.difficulty) params.append("difficulty", filters.difficulty);
  if (filters?.limit) params.append("limit", filters.limit.toString());
  if (filters?.offset) params.append("offset", filters.offset.toString());

  return useQuery<{ data: Concept[]; pagination: any }>({
    queryKey: ["/astrodb/v1/designs/concepts", filters],
    queryFn: async () => {
      const response = await fetch(`/astrodb/v1/designs/concepts?${params}`);
      if (!response.ok) throw new Error("Failed to fetch concepts");
      return response.json();
    },
    enabled: true,
  });
}

export function useConcept(id: number | null) {
  return useQuery<{ data: Concept }>({
    queryKey: ["/astrodb/v1/designs/concepts", id],
    queryFn: async () => {
      const response = await fetch(`/astrodb/v1/designs/concepts/${id}`);
      if (!response.ok) throw new Error("Failed to fetch concept");
      return response.json();
    },
    enabled: !!id,
  });
}

// ===== EQUATION HOOKS =====

export function useEquations(filters?: {
  name?: string;
  symbol?: string;
  has_tests?: boolean;
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.name) params.append("name", filters.name);
  if (filters?.symbol) params.append("symbol", filters.symbol);
  if (filters?.has_tests) params.append("has_tests", "true");
  if (filters?.limit) params.append("limit", filters.limit.toString());
  if (filters?.offset) params.append("offset", filters.offset.toString());

  return useQuery<{ data: Equation[]; pagination: any }>({
    queryKey: ["/astrodb/v1/designs/equations", filters],
    queryFn: async () => {
      const response = await fetch(`/astrodb/v1/designs/equations?${params}`);
      if (!response.ok) throw new Error("Failed to fetch equations");
      return response.json();
    },
    enabled: true,
  });
}

export function useEquation(id: number | null) {
  return useQuery<{ data: Equation }>({
    queryKey: ["/astrodb/v1/designs/equations", id],
    queryFn: async () => {
      const response = await fetch(`/astrodb/v1/designs/equations/${id}`);
      if (!response.ok) throw new Error("Failed to fetch equation");
      return response.json();
    },
    enabled: !!id,
  });
}

// ===== EXAMPLE HOOKS =====

export function useTelescopeExamples(filters?: {
  type?: string;
  aperture_min?: number;
  aperture_max?: number;
  f_ratio_min?: number;
  f_ratio_max?: number;
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.type) params.append("type", filters.type);
  if (filters?.aperture_min) params.append("aperture_min", filters.aperture_min.toString());
  if (filters?.aperture_max) params.append("aperture_max", filters.aperture_max.toString());
  if (filters?.f_ratio_min) params.append("f_ratio_min", filters.f_ratio_min.toString());
  if (filters?.f_ratio_max) params.append("f_ratio_max", filters.f_ratio_max.toString());
  if (filters?.limit) params.append("limit", filters.limit.toString());
  if (filters?.offset) params.append("offset", filters.offset.toString());

  return useQuery<{ data: TelescopeExample[]; pagination: any }>({
    queryKey: ["/astrodb/v1/designs/examples", filters],
    queryFn: async () => {
      const response = await fetch(`/astrodb/v1/designs/examples?${params}`);
      if (!response.ok) throw new Error("Failed to fetch examples");
      return response.json();
    },
    enabled: true,
  });
}

export function useTelescopeExample(id: number | null) {
  return useQuery<{ data: TelescopeExample }>({
    queryKey: ["/astrodb/v1/designs/examples", id],
    queryFn: async () => {
      const response = await fetch(`/astrodb/v1/designs/examples/${id}`);
      if (!response.ok) throw new Error("Failed to fetch example");
      return response.json();
    },
    enabled: !!id,
  });
}

// ===== PROCEDURE HOOKS =====

export function useProcedures(filters?: {
  type?: string;
  example_id?: number;
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.type) params.append("type", filters.type);
  if (filters?.example_id) params.append("example_id", filters.example_id.toString());
  if (filters?.limit) params.append("limit", filters.limit.toString());
  if (filters?.offset) params.append("offset", filters.offset.toString());

  return useQuery<{ data: Procedure[]; pagination: any }>({
    queryKey: ["/astrodb/v1/designs/procedures", filters],
    queryFn: async () => {
      const response = await fetch(`/astrodb/v1/designs/procedures?${params}`);
      if (!response.ok) throw new Error("Failed to fetch procedures");
      return response.json();
    },
    enabled: true,
  });
}

// ===== RULES OF THUMB HOOKS =====

export function useRulesOfThumb(filters?: {
  tag?: string;
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.tag) params.append("tag", filters.tag);
  if (filters?.limit) params.append("limit", filters.limit.toString());
  if (filters?.offset) params.append("offset", filters.offset.toString());

  return useQuery<{ data: RuleOfThumb[]; pagination: any }>({
    queryKey: ["/astrodb/v1/designs/rules", filters],
    queryFn: async () => {
      const response = await fetch(`/astrodb/v1/designs/rules?${params}`);
      if (!response.ok) throw new Error("Failed to fetch rules");
      return response.json();
    },
    enabled: true,
  });
}
