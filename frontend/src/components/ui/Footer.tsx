"use client";

import { motion } from "framer-motion";
import { GlobeAltIcon } from "@heroicons/react/24/outline";

const techStack = [
  { name: "Databricks", category: "Data" },
  { name: "Snowflake", category: "Data" },
  { name: "AWS Lambda", category: "Cloud" },
  { name: "AWS S3", category: "Cloud" },
  { name: "API Gateway", category: "Cloud" },
  { name: "Google Gemini", category: "AI" },
  { name: "Next.js", category: "Frontend" },
  { name: "TypeScript", category: "Frontend" },
  { name: "DigitalOcean", category: "Hosting" },
  { name: "iNaturalist", category: "Data" },
];

const categoryColors: Record<string, string> = {
  Data: "border-emerald-500/20 text-emerald-400/60 hover:border-emerald-500/40",
  Cloud: "border-amber-500/20 text-amber-400/60 hover:border-amber-500/40",
  AI: "border-violet-500/20 text-violet-400/60 hover:border-violet-500/40",
  Frontend: "border-cyan-500/20 text-cyan-400/60 hover:border-cyan-500/40",
  Hosting: "border-blue-500/20 text-blue-400/60 hover:border-blue-500/40",
};

export default function Footer() {
  return (
    <footer className="relative border-t border-white/5 mt-16 overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[200px] bg-emerald-500/[0.02] rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-[300px] h-[150px] bg-cyan-500/[0.02] rounded-full blur-[80px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <p className="text-[10px] text-white/15 uppercase tracking-[0.4em] mb-6">Built With</p>

          <div className="flex flex-wrap items-center justify-center gap-2 mb-10 max-w-2xl mx-auto">
            {techStack.map((tech) => (
              <span
                key={tech.name}
                className={`px-3 py-1.5 rounded-lg text-xs border transition-colors duration-200 ${categoryColors[tech.category]}`}
              >
                {tech.name}
              </span>
            ))}
          </div>

          <div className="w-px h-8 bg-gradient-to-b from-white/10 to-transparent mx-auto mb-8" />

          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg">
              <GlobeAltIcon className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <span className="text-base font-bold tracking-tight">
                Bio<span className="gradient-text">Scope</span>
              </span>
              <p className="text-[9px] uppercase tracking-[0.2em] text-white/20">Biodiversity Intelligence</p>
            </div>
          </div>

          <p className="text-xs text-white/20 mt-4">
            Built at DataHacks 2026 — UC San Diego
          </p>
          <p className="text-[10px] text-white/10 mt-2">
            Data sourced from iNaturalist citizen science observations — Cloud track + Data Analytics track
          </p>
        </motion.div>
      </div>
    </footer>
  );
}
