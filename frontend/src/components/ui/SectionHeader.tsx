"use client";

import { motion } from "framer-motion";

interface Props {
  title: string;
  subtitle?: string;
  id?: string;
}

export default function SectionHeader({ title, subtitle, id }: Props) {
  return (
    <motion.div
      id={id}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.3 }}
      className="mb-6 scroll-mt-24"
    >
      <h2 className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/40">{title}</h2>
      {subtitle && <p className="text-white/15 text-xs mt-1">{subtitle}</p>}
    </motion.div>
  );
}
