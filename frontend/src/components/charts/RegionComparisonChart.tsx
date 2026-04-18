"use client";

import { useId } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { Region } from "@/types";

interface Props {
  regions: Region[];
  onRegionClick: (region: Region) => void;
  selectedRegion?: string;
}

function getBarColor(score: number): string {
  if (score >= 4) return "#34d399";
  if (score >= 3.5) return "#6ee7b7";
  if (score >= 3) return "#a3e635";
  if (score >= 2.5) return "#fbbf24";
  if (score >= 2) return "#fb923c";
  return "#f87171";
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload as Region;
  return (
    <div className="bg-gray-900/95 backdrop-blur-sm rounded-xl px-5 py-4 shadow-2xl border border-white/10 min-w-[180px]">
      <p className="text-sm font-semibold text-white mb-2">{data.region}</p>
      <div className="space-y-1.5">
        <div className="flex justify-between gap-4">
          <span className="text-xs text-white/40">Shannon Index</span>
          <span className="text-sm font-bold" style={{ color: getBarColor(data.biodiversity_score) }}>
            {data.biodiversity_score}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-xs text-white/40">Species</span>
          <span className="text-sm font-medium text-white/80">{data.unique_species}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-xs text-white/40">Observations</span>
          <span className="text-sm font-medium text-white/80">{data.total_observations.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

export default function RegionComparisonChart({ regions, onRegionClick, selectedRegion }: Props) {
  const gradientId = useId();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="glass rounded-2xl p-6"
    >
      <div className="mb-6">
        <h3 className="text-lg font-semibold">Regional Comparison</h3>
        <p className="text-sm text-white/40 mt-1">Shannon Diversity Index by region — click any bar for details</p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={regions} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="region"
            tick={{ fontSize: 11, fill: "rgba(255,255,255,0.3)" }}
            axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
            tickLine={false}
            angle={-35}
            textAnchor="end"
            height={60}
            dy={8}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "rgba(255,255,255,0.3)" }}
            axisLine={false}
            tickLine={false}
            domain={[0, 5]}
            width={35}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
          />
          <Bar
            dataKey="biodiversity_score"
            radius={[6, 6, 0, 0]}
            onClick={(data: any) => {
              const region = regions.find((r) => r.region === data.region);
              if (region) onRegionClick(region);
            }}
            cursor="pointer"
            animationDuration={1200}
            animationEasing="ease-out"
          >
            {regions.map((region) => (
              <Cell
                key={region.region}
                fill={getBarColor(region.biodiversity_score)}
                fillOpacity={selectedRegion === region.region ? 1 : 0.7}
                stroke={selectedRegion === region.region ? "#fff" : "transparent"}
                strokeWidth={selectedRegion === region.region ? 2 : 0}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
