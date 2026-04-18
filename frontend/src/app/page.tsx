"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence } from "framer-motion";
import type { Region, RegionDetail as RegionDetailType, MonthlyTrend, DecliningRegion } from "@/types";
import { getRegions, getRegionDetail, getTrends } from "@/lib/api";
import { MOCK_REGIONS, MOCK_TRENDS, MOCK_DECLINING, MOCK_REGION_DETAIL } from "@/lib/mockData";
import Navbar from "@/components/ui/Navbar";
import Hero from "@/components/ui/Hero";
import SectionHeader from "@/components/ui/SectionHeader";
import StatsGrid from "@/components/ui/StatsGrid";
import TrendChart from "@/components/charts/TrendChart";
import RegionComparisonChart from "@/components/charts/RegionComparisonChart";
import SpeciesDonutChart from "@/components/charts/SpeciesDonutChart";
import RankingsTable from "@/components/ui/RankingsTable";
import RegionDetailPanel from "@/components/ui/RegionDetail";
import PipelineVisual from "@/components/ui/PipelineVisual";
import ScrollToTop from "@/components/ui/ScrollToTop";
import Footer from "@/components/ui/Footer";

const BiodiversityMap = dynamic(() => import("@/components/map/BiodiversityMap"), { ssr: false });

export default function Home() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<RegionDetailType | null>(null);
  const [globalTrends, setGlobalTrends] = useState<MonthlyTrend[]>([]);
  const [decliningRegions, setDecliningRegions] = useState<DecliningRegion[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [regionsData, trendsData] = await Promise.all([getRegions(), getTrends()]);
        setRegions(regionsData);
        setGlobalTrends(trendsData.monthly_trends);
        setDecliningRegions(trendsData.declining_regions);
      } catch {
        setRegions(MOCK_REGIONS);
        setGlobalTrends(MOCK_TRENDS);
        setDecliningRegions(MOCK_DECLINING);
        setUsingMock(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleRegionClick = async (region: Region) => {
    if (usingMock) {
      setSelectedDetail(MOCK_REGION_DETAIL[region.region] ?? null);
      return;
    }
    const regionId = region.region.toLowerCase().replace(/\s+/g, "-");
    try {
      const detail = await getRegionDetail(regionId);
      setSelectedDetail(detail);
    } catch {
      setSelectedDetail(MOCK_REGION_DETAIL[region.region] ?? null);
    }
  };

  const totalSpecies = regions.reduce((s, r) => s + r.unique_species, 0);
  const totalObs = regions.reduce((s, r) => s + r.total_observations, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 animate-pulse" />
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 opacity-30 blur-xl animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center text-3xl">🌿</div>
          </div>
          <div className="text-white/30 text-sm tracking-wider">Loading BioScope</div>
          <div className="mt-4 w-32 h-1 bg-white/5 rounded-full mx-auto overflow-hidden">
            <div className="h-full w-1/2 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full animate-[shimmer_1.5s_ease-in-out_infinite]"
              style={{ animation: "shimmer 1.5s ease-in-out infinite", }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950">
      <Navbar />
      <Hero totalSpecies={totalSpecies} totalObservations={totalObs} totalRegions={regions.length} />

      <div className="max-w-7xl mx-auto px-6 space-y-16 pb-8">
        {usingMock && (
          <div className="glass rounded-xl px-5 py-3.5 border-amber-500/20 bg-amber-500/5 text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
              </span>
              <span className="text-amber-400/80 text-sm">
                Demo mode — showing sample data. Connect the API for live biodiversity data.
              </span>
            </div>
          </div>
        )}

        <section>
          <SectionHeader
            title="Key Insights"
            subtitle="Overview of biodiversity metrics across monitored regions"
          />
          <StatsGrid regions={regions} decliningRegions={decliningRegions} />
        </section>

        <section>
          <SectionHeader
            id="map"
            title="Biodiversity Map"
            subtitle="Click a region to explore its biodiversity profile"
          />
          <BiodiversityMap
            regions={regions}
            onRegionClick={handleRegionClick}
            selectedRegion={selectedDetail?.region.region}
          />
          <div className="flex items-center gap-6 mt-4 justify-center">
            {[
              { color: "bg-emerald-400", label: "High (4+)" },
              { color: "bg-lime-400", label: "Good (3-4)" },
              { color: "bg-amber-400", label: "Moderate (2-3)" },
              { color: "bg-red-400", label: "Low (<2)" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                <span className="text-[11px] text-white/30">{item.label}</span>
              </div>
            ))}
          </div>
        </section>

        <AnimatePresence>
          {selectedDetail && (
            <section>
              <RegionDetailPanel detail={selectedDetail} onClose={() => setSelectedDetail(null)} />
            </section>
          )}
        </AnimatePresence>

        <section>
          <SectionHeader
            id="trends"
            title="Global Trends"
            subtitle="Tracking species diversity across all monitored regions over time"
          />
          <div className="space-y-6">
            <TrendChart
              data={globalTrends}
              title="Species Diversity Over Time"
              subtitle="Unique species observed per month across all regions"
              color="#34d399"
              height={360}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RegionComparisonChart
                regions={regions}
                onRegionClick={handleRegionClick}
                selectedRegion={selectedDetail?.region.region}
              />
              <SpeciesDonutChart
                regions={regions}
                onRegionClick={handleRegionClick}
              />
            </div>
          </div>
        </section>

        <section>
          <SectionHeader
            id="rankings"
            title="Region Rankings"
            subtitle="Ranked by Shannon Diversity Index — click any region for details"
          />
          <RankingsTable
            regions={regions}
            onRegionClick={handleRegionClick}
            selectedRegion={selectedDetail?.region.region}
          />
        </section>

        <section>
          <SectionHeader
            title="How It Works"
            subtitle="Our cloud-native data pipeline from raw observations to AI insights"
          />
          <PipelineVisual />
        </section>
      </div>

      <Footer />
      <ScrollToTop />
    </main>
  );
}
