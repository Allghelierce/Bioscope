"use client";

import { useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppData } from "@/context/DataContext";
import { ECOSYSTEM_INDEX } from "@/lib/speciesData";

function gradeColor(grade: string): string {
  switch (grade) {
    case "D": return "rgba(255,255,255,0.5)";
    case "F": return "rgba(239,68,68,0.7)";
    default: return "rgba(255,255,255,0.3)";
  }
}

interface Props {
  ecosystem?: string | null;
}

export default function CollapseTimeline({ ecosystem }: Props) {
  const { data, loading } = useAppData();
  const allPredictions = data?.collapse_predictions ?? [];
  const [expandedZone, setExpandedZone] = useState<string | null>(null);
  const [zoneAssessments, setZoneAssessments] = useState<Record<string, string>>({});
  const [assessmentLoading, setAssessmentLoading] = useState<string | null>(null);

  const predictions = useMemo(() => {
    if (!ecosystem || !ECOSYSTEM_INDEX[ecosystem]) return allPredictions;
    const zoneIds = new Set(ECOSYSTEM_INDEX[ecosystem].zones.map((z) => z.id));
    return allPredictions.filter((p: any) => zoneIds.has(p.zone_id));
  }, [ecosystem, allPredictions]);

  const fetchZoneAssessment = useCallback(async (pred: any) => {
    if (zoneAssessments[pred.zone_id]) return;
    setAssessmentLoading(pred.zone_id);
    try {
      const params = new URLSearchParams({
        action: "zone_risk",
        zone: pred.zone,
        species_count: String(pred.at_risk_species?.length || 0),
        missing_levels: pred.missing_levels.join(", ") || "none",
        decline_pct: String(pred.score),
      });
      const res = await fetch(`/api/snowflake?${params}`);
      const data = await res.json();
      if (data.assessment) {
        setZoneAssessments((prev) => ({ ...prev, [pred.zone_id]: data.assessment }));
      }
    } catch {
      setZoneAssessments((prev) => ({ ...prev, [pred.zone_id]: "Assessment unavailable." }));
    }
    setAssessmentLoading(null);
  }, [zoneAssessments]);

  if (loading) {
    return <div className="animate-pulse h-32 bg-white/[0.02] rounded-lg" />;
  }

  if (predictions.length === 0) {
    return (
      <div className="text-xs text-white/40 font-mono py-6 text-center">
        No collapse warnings for this ecosystem.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="text-[9px] text-white/40 font-mono mb-3">
        {predictions.length} zones flagged
      </div>

      {predictions.map((pred: any, i: number) => (
        <motion.div
          key={pred.zone_id}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.03 }}
          className="border border-white/[0.06] p-4 hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-3">
              <span
                className="text-lg font-bold font-mono w-7 text-center"
                style={{ color: gradeColor(pred.grade) }}
              >
                {pred.grade}
              </span>
              <div>
                <div className="text-xs font-medium text-white/80">{pred.zone}</div>
                <div className="text-[9px] text-white/40 font-mono">{pred.score}/100</div>
              </div>
            </div>
            {pred.missing_levels.length > 0 && (
              <div className="flex items-center gap-1">
                {pred.missing_levels.map((level: string) => (
                  <span
                    key={level}
                    className="px-1.5 py-0.5 text-[8px] text-red-400/60 border border-red-500/15 font-mono uppercase"
                  >
                    no {level}
                  </span>
                ))}
              </div>
            )}
          </div>

          {pred.risks.length > 0 && (
            <div className="space-y-0.5 mb-2 ml-10">
              {pred.risks.slice(0, 2).map((risk: any, j: number) => (
                <div key={j} className="text-[10px] text-white/50">
                  {risk.message}
                </div>
              ))}
            </div>
          )}

          {pred.at_risk_species.length > 0 && (
            <div className="ml-10">
              <div className="flex flex-wrap gap-1">
                {pred.at_risk_species.map((sp: string) => (
                  <span
                    key={sp}
                    className="px-1.5 py-0.5 text-[9px] text-white/50 border border-white/[0.08] italic font-mono"
                  >
                    {sp}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="ml-10 mt-3">
            <button
              onClick={() => {
                const isExpanded = expandedZone === pred.zone_id;
                setExpandedZone(isExpanded ? null : pred.zone_id);
                if (!isExpanded) fetchZoneAssessment(pred);
              }}
              className="text-[9px] text-emerald-400/40 hover:text-emerald-400/70 font-mono uppercase tracking-wider transition"
            >
              {expandedZone === pred.zone_id ? "hide" : "analyze"} with cortex ai
            </button>
            <AnimatePresence>
              {expandedZone === pred.zone_id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 border border-emerald-500/[0.06] p-3 overflow-hidden"
                >
                  {assessmentLoading === pred.zone_id ? (
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[9px] text-white/20 font-mono">querying snowflake cortex...</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <div className="w-1 h-1 bg-emerald-400/60" />
                        <span className="text-[8px] text-emerald-400/30 font-mono uppercase tracking-widest">snowflake cortex</span>
                      </div>
                      <p className="text-[11px] text-white/50 leading-relaxed">
                        {zoneAssessments[pred.zone_id] || "No assessment available."}
                      </p>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
