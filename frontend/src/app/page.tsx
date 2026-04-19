"use client";

import dynamic from "next/dynamic";
import SectionHeader from "@/components/ui/SectionHeader";
import CollapseTimeline from "@/components/ui/CollapseTimeline";
import ConservationReport from "@/components/ui/ConservationReport";

const CascadeGraph = dynamic(() => import("@/components/charts/CascadeGraph"), { ssr: false });

export default function Home() {
  return (
    <main className="min-h-screen bg-[#080f0b]">
      <div className="max-w-7xl mx-auto px-6 py-12 space-y-16">
        <section>
          <SectionHeader
            id="cascade"
            title="Dependency Cascade Simulator"
            subtitle="Explore how removing one species triggers a chain reaction through the food web"
          />
          <CascadeGraph />
        </section>

        <section>
          <SectionHeader
            id="report"
            title="Conservation Priority Report"
            subtitle="Keystone species ranked by cascade impact — high-keystone + declining = critical priority"
          />
          <ConservationReport />
        </section>

        <section>
          <SectionHeader
            id="warnings"
            title="Collapse Early Warnings"
            subtitle="Zones where ecosystem breakdown indicators are already present"
          />
          <CollapseTimeline />
        </section>
      </div>
    </main>
  );
}
