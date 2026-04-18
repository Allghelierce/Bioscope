"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDownIcon } from "@heroicons/react/24/outline";

interface Props {
  totalSpecies: number;
  totalObservations: number;
  totalRegions: number;
}

function useCountUp(target: number, duration = 2000, delay = 600) {
  const [count, setCount] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const timeout = setTimeout(() => {
      const start = performance.now();
      const step = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setCount(Math.round(eased * target));
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, delay);

    return () => clearTimeout(timeout);
  }, [target, duration, delay]);

  return count;
}

function formatNumber(n: number): string {
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`;
  if (n >= 1000) return n.toLocaleString();
  return String(n);
}

export default function Hero({ totalSpecies, totalObservations, totalRegions }: Props) {
  const speciesCount = useCountUp(totalSpecies, 2200, 800);
  const obsCount = useCountUp(totalObservations, 2200, 1000);
  const regionCount = useCountUp(totalRegions, 1500, 1200);

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/30 via-gray-950 to-gray-950" />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-emerald-500/[0.03] rounded-full blur-[120px]" />
        <div className="absolute top-20 right-1/4 w-[400px] h-[400px] bg-cyan-500/[0.03] rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-teal-500/[0.02] rounded-full blur-[120px]" />
      </div>

      <div className="absolute inset-0 overflow-hidden">
        {[...Array(40)].map((_, i) => {
          const size = 1 + (i % 3);
          return (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: size,
                height: size,
                left: `${(i * 2.5) % 100}%`,
                top: `${(i * 7.3) % 100}%`,
                backgroundColor: i % 3 === 0 ? "rgba(52,211,153,0.3)" : i % 3 === 1 ? "rgba(34,211,238,0.2)" : "rgba(167,139,250,0.15)",
              }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1.8, 0],
                y: [0, -30],
              }}
              transition={{
                duration: 4 + (i % 5),
                repeat: Infinity,
                delay: (i * 0.37) % 7,
                ease: "easeOut",
              }}
            />
          );
        })}
      </div>

      <div className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass mb-8"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="text-sm text-white/60">Powered by iNaturalist & Google Gemini</span>
          </motion.div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6 leading-[1.05]">
            Understand{" "}
            <span className="gradient-text animated-gradient bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
              Biodiversity
            </span>
            <br />
            <span className="text-white/90">Like Never Before</span>
          </h1>

          <p className="text-lg md:text-xl text-white/40 max-w-2xl mx-auto mb-14 leading-relaxed">
            Transforming millions of citizen science observations into actionable
            biodiversity intelligence with cloud-native data pipelines and AI.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="grid grid-cols-3 gap-6 md:gap-12 max-w-xl mx-auto mb-16"
        >
          <StatBubble value={speciesCount} display={formatNumber(speciesCount)} label="Species Tracked" />
          <StatBubble value={obsCount} display={formatNumber(obsCount)} label="Observations" />
          <StatBubble value={regionCount} display={String(regionCount)} label="Regions" />
        </motion.div>

        <motion.a
          href="#map"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="group inline-flex flex-col items-center gap-2 text-white/30 hover:text-white/70 transition-colors duration-300"
        >
          <span className="text-xs uppercase tracking-[0.2em]">Explore the data</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-8 h-12 rounded-full border border-white/10 group-hover:border-white/20 flex items-start justify-center pt-2 transition-colors"
          >
            <motion.div
              animate={{ opacity: [1, 0.3, 1], y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="w-1 h-2 rounded-full bg-white/40"
            />
          </motion.div>
        </motion.a>
      </div>
    </section>
  );
}

function StatBubble({ value, display, label }: { value: number; display: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl md:text-4xl font-bold gradient-text tabular-nums">
        {display}
      </div>
      <div className="text-[10px] md:text-xs text-white/30 uppercase tracking-[0.15em] mt-2">{label}</div>
    </div>
  );
}
