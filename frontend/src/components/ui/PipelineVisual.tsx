"use client";

import { motion } from "framer-motion";

const steps = [
  { name: "iNaturalist", desc: "10K+ Observations", icon: "🌿", color: "from-green-500 to-emerald-500", detail: "Citizen Science Data" },
  { name: "Databricks", desc: "PySpark Processing", icon: "⚡", color: "from-red-500 to-orange-500", detail: "Clean & Aggregate" },
  { name: "AWS S3", desc: "Parquet Storage", icon: "☁️", color: "from-orange-500 to-amber-500", detail: "Data Lake" },
  { name: "Snowflake", desc: "SQL Analytics", icon: "❄️", color: "from-blue-400 to-cyan-400", detail: "Views & Rankings" },
  { name: "AWS Lambda", desc: "REST API", icon: "⚙️", color: "from-amber-500 to-yellow-500", detail: "Serverless" },
  { name: "Gemini AI", desc: "Explanations", icon: "✨", color: "from-violet-500 to-purple-500", detail: "NLP Analysis" },
  { name: "Next.js", desc: "Dashboard", icon: "🖥️", color: "from-cyan-500 to-teal-500", detail: "DigitalOcean" },
];

export default function PipelineVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="glass rounded-2xl p-8"
    >
      <div className="mb-8">
        <h3 className="text-lg font-semibold">Data Pipeline</h3>
        <p className="text-sm text-white/40 mt-1">End-to-end flow from raw observations to AI-powered insights</p>
      </div>

      <div className="relative">
        <div className="hidden md:block absolute top-8 left-[60px] right-[60px] h-px">
          <div className="h-full bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-violet-500/20" />
          <motion.div
            className="absolute top-0 left-0 h-full w-24 bg-gradient-to-r from-emerald-400/60 to-transparent"
            animate={{ left: ["0%", "85%", "0%"] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-7 gap-4 md:gap-3">
          {steps.map((step, i) => (
            <motion.div
              key={step.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className="group relative flex flex-col items-center text-center"
            >
              <div className={`relative w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center text-2xl mb-3 shadow-lg group-hover:shadow-xl transition-shadow duration-300`}>
                {step.icon}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${step.color} opacity-0 group-hover:opacity-40 blur-xl transition-opacity duration-300`} />
              </div>

              <div className="text-xs font-bold text-white mb-0.5">{step.name}</div>
              <div className="text-[10px] text-white/50 leading-tight">{step.desc}</div>
              <div className="text-[9px] text-white/25 mt-0.5">{step.detail}</div>

              {i < steps.length - 1 && (
                <div className="hidden md:block absolute -right-2 top-7">
                  <motion.svg
                    width="16" height="12" viewBox="0 0 16 12"
                    className="text-white/15"
                    animate={{ x: [0, 3, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                  >
                    <path d="M0 6h12M9 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" />
                  </motion.svg>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-white/5">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-1 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500" />
            <span className="text-[10px] text-white/30 uppercase tracking-wider">Data Flow</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400/40" />
            <span className="text-[10px] text-white/30 uppercase tracking-wider">7 Services</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400/40" />
            <span className="text-[10px] text-white/30 uppercase tracking-wider">Fully Serverless</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-violet-400/40" />
            <span className="text-[10px] text-white/30 uppercase tracking-wider">AI-Powered</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
