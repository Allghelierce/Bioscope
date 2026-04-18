import type { Region, MonthlyTrend, DecliningRegion, RegionDetail, TrendPoint } from "@/types";

export const MOCK_REGIONS: Region[] = [
  { region: "California", biodiversity_score: 4.23, unique_species: 342, total_observations: 5210, rank: 1 },
  { region: "Florida", biodiversity_score: 3.98, unique_species: 298, total_observations: 4100, rank: 2 },
  { region: "Texas", biodiversity_score: 3.76, unique_species: 271, total_observations: 3800, rank: 3 },
  { region: "Oregon", biodiversity_score: 3.54, unique_species: 234, total_observations: 2900, rank: 4 },
  { region: "Colorado", biodiversity_score: 3.31, unique_species: 198, total_observations: 2500, rank: 5 },
  { region: "Washington", biodiversity_score: 3.12, unique_species: 187, total_observations: 2300, rank: 6 },
  { region: "Arizona", biodiversity_score: 2.89, unique_species: 165, total_observations: 1900, rank: 7 },
  { region: "New Mexico", biodiversity_score: 2.67, unique_species: 142, total_observations: 1600, rank: 8 },
  { region: "Utah", biodiversity_score: 2.45, unique_species: 128, total_observations: 1400, rank: 9 },
  { region: "Nevada", biodiversity_score: 2.11, unique_species: 98, total_observations: 1100, rank: 10 },
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateSmoothedTrends(
  baseSpecies: number,
  baseObs: number,
  trendSlope: number,
  seed: number,
): TrendPoint[] {
  const rng = seededRandom(seed);
  const points: TrendPoint[] = [];

  for (let i = 0; i < 48; i++) {
    const date = new Date(2022, i, 1);
    const monthInYear = date.getMonth();

    const seasonal = Math.sin(((monthInYear - 2) / 12) * Math.PI * 2) * (baseSpecies * 0.15);
    const trend = i * trendSlope;
    const noise = (rng() - 0.5) * baseSpecies * 0.06;

    const species = Math.round(baseSpecies + seasonal + trend + noise);
    const obsRatio = baseObs / baseSpecies;
    const obsNoise = (rng() - 0.5) * baseObs * 0.08;
    const obs = Math.round(species * obsRatio + obsNoise + seasonal * obsRatio * 0.5);

    points.push({
      year_month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      unique_species: Math.max(10, species),
      observation_count: Math.max(20, obs),
    });
  }

  return points;
}

export const MOCK_TRENDS: MonthlyTrend[] = (() => {
  const rng = seededRandom(42);
  const points: MonthlyTrend[] = [];

  for (let i = 0; i < 48; i++) {
    const date = new Date(2022, i, 1);
    const monthInYear = date.getMonth();
    const seasonal = Math.sin(((monthInYear - 2) / 12) * Math.PI * 2) * 60;
    const trend = i * 1.8;
    const noise = (rng() - 0.5) * 25;

    points.push({
      year_month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      total_unique_species: Math.round(420 + seasonal + trend + noise),
      total_observations: Math.round((420 + seasonal + trend + noise) * 5.5 + (rng() - 0.5) * 100),
      regions_reporting: 10,
    });
  }

  return points;
})();

export const MOCK_DECLINING: DecliningRegion[] = [
  { region: "Nevada", first_year_species: 120, last_year_species: 98, species_change: -22, pct_change: -18.3 },
  { region: "Utah", first_year_species: 145, last_year_species: 128, species_change: -17, pct_change: -11.7 },
  { region: "Arizona", first_year_species: 178, last_year_species: 165, species_change: -13, pct_change: -7.3 },
];

const regionTrendParams: Record<string, { baseSpecies: number; baseObs: number; slope: number; seed: number }> = {
  California:   { baseSpecies: 110, baseObs: 450,  slope: 1.2,  seed: 101 },
  Florida:      { baseSpecies: 95,  baseObs: 380,  slope: 0.9,  seed: 202 },
  Texas:        { baseSpecies: 85,  baseObs: 340,  slope: 0.7,  seed: 303 },
  Oregon:       { baseSpecies: 75,  baseObs: 260,  slope: 0.5,  seed: 404 },
  Colorado:     { baseSpecies: 62,  baseObs: 220,  slope: 0.3,  seed: 505 },
  Washington:   { baseSpecies: 58,  baseObs: 200,  slope: 0.2,  seed: 606 },
  Arizona:      { baseSpecies: 52,  baseObs: 170,  slope: -0.2, seed: 707 },
  "New Mexico": { baseSpecies: 44,  baseObs: 140,  slope: -0.1, seed: 808 },
  Utah:         { baseSpecies: 40,  baseObs: 120,  slope: -0.3, seed: 909 },
  Nevada:       { baseSpecies: 30,  baseObs: 95,   slope: -0.5, seed: 111 },
};

export const MOCK_REGION_DETAIL: Record<string, RegionDetail> = Object.fromEntries(
  MOCK_REGIONS.map((r) => {
    const params = regionTrendParams[r.region] ?? { baseSpecies: 50, baseObs: 200, slope: 0, seed: 999 };
    return [
      r.region,
      {
        region: r,
        trends: generateSmoothedTrends(params.baseSpecies, params.baseObs, params.slope, params.seed),
        decline_info: MOCK_DECLINING.find((d) => d.region === r.region) ?? {
          region: r.region,
          first_year_species: Math.round(r.unique_species * 0.87),
          last_year_species: r.unique_species,
          species_change: Math.round(r.unique_species * 0.13),
          pct_change: 13,
        },
      },
    ];
  })
);
