"use client";

import { motion } from "framer-motion";
import { useAppData } from "@/context/DataContext";

function gradeColor(grade: string): string {
  switch (grade) {
    case "D": return "rgba(255,255,255,0.25)";
    case "F": return "rgba(239,68,68,0.5)";
    default: return "rgba(255,255,255,0.15)";
  }
}

export default function CollapseTimeline() {
  const { data, loading } = useAppData();
  const COLLAPSE_PREDICTIONS = data?.collapse_predictions ?? [];

  if (loading) {
    return <div className="animate-pulse h-32 bg-white/[0.02] rounded-lg" />;
  }
  return (
    <div className="space-y-1">
      <div className="text-[9px] text-white/10 font-mono mb-3">
        {COLLAPSE_PREDICTIONS.length} zones flagged
      </div>

      {COLLAPSE_PREDICTIONS.map((pred, i) => (
        <motion.div
          key={pred.zone_id}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.03 }}
          className="border border-white/[0.04] p-4 hover:bg-white/[0.015] transition-colors"
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
                <div className="text-xs font-medium text-white/50">{pred.zone}</div>
                <div className="text-[9px] text-white/12 font-mono">{pred.score}/100</div>
              </div>
            </div>
            {pred.missing_levels.length > 0 && (
              <div className="flex items-center gap-1">
                {pred.missing_levels.map((level) => (
                  <span
                    key={level}
                    className="px-1.5 py-0.5 text-[8px] text-red-400/40 border border-red-500/8 font-mono uppercase"
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
                <div key={j} className="text-[10px] text-white/20">
                  {risk.message}
                </div>
              ))}
            </div>
          )}

          {pred.at_risk_species.length > 0 && (
            <div className="ml-10">
              <div className="flex flex-wrap gap-1">
                {pred.at_risk_species.map((sp) => (
                  <span
                    key={sp}
                    className="px-1.5 py-0.5 text-[9px] text-white/20 border border-white/[0.04] italic font-mono"
                  >
                    {sp}
                  </span>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
