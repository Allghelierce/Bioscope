export interface Zone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  grade: string;
  score: number;
  total_species: number;
}

export interface DependencyNode {
  id: string;
  common_name: string;
  trophic_level: string;
  trophic_label: string;
  iconic_taxon: string;
  order: string;
  family: string;
  observations: number;
  zone_count: number;
  decline_trend: number;
  keystone_score: number;
  cascade_victim_count: number;
  trophic_levels_affected: number;
}

export interface DependencyEdge {
  source: string;
  target: string;
  type: string;
  strength: number;
}

export interface GlobalStats {
  totalSpecies: number;
  totalObservations: number;
  totalZones: number;
  zonesAtRisk: number;
  trophicBreakdown: Record<string, number>;
  healthDistribution: Record<string, number>;
  ecosystemCount: number;
}
