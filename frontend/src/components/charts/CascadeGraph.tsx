"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  forceX,
  forceY,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";
import { zoom as d3Zoom, zoomIdentity, type ZoomTransform } from "d3-zoom";
import { select } from "d3-selection";
import "d3-transition";
import {
  DEPENDENCY_NODES,
  DEPENDENCY_EDGES,
  ZONE_DEPENDENCY_GRAPHS,
  type DependencyEdge,
  type Zone,
} from "@/lib/speciesData";
import { SPECIES_PHOTOS } from "@/lib/speciesPhotos";

// ── types ──────────────────────────────────────────────────────
interface GraphNode {
  id: string;
  common_name: string;
  trophic_level: string;
  observations: number;
  decline_trend: number;
  keystone_score: number;
  zone_count?: number;
  zone_keystone_score?: number;
  family?: string;
  order?: string;
}

interface SimNode extends SimulationNodeDatum {
  data: GraphNode;
  radius: number;
}

interface SimLink extends SimulationLinkDatum<SimNode> {
  edgeType: string;
}

interface Props {
  zone?: Zone | null;
}

// ── constants ──────────────────────────────────────────────────
const LEVEL_COLORS: Record<string, string> = {
  producer: "#6ee7b7",
  pollinator: "#fda4af",
  primary_consumer: "#fcd34d",
  secondary_consumer: "#67e8f9",
  tertiary_consumer: "#a5b4fc",
  apex_predator: "#fca5a5",
  decomposer: "#c4b5fd",
};

const EDGE_COLORS: Record<string, string> = {
  "food source": "rgba(110,231,183,0.08)",
  pollination: "rgba(253,164,175,0.08)",
  prey: "rgba(253,186,116,0.08)",
  "nutrient cycling": "rgba(196,181,253,0.08)",
};

const EDGE_COLORS_BRIGHT: Record<string, string> = {
  "food source": "#6ee7b7",
  pollination: "#fda4af",
  prey: "#fdba74",
  "nutrient cycling": "#c4b5fd",
};

// ── component ──────────────────────────────────────────────────
export default function CascadeGraph({ zone }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const simRef = useRef<ReturnType<typeof forceSimulation<SimNode>> | null>(null);
  const transformRef = useRef<ZoomTransform>(zoomIdentity);
  const animFrameRef = useRef<number>(0);

  const [dims, setDims] = useState({ w: 900, h: 600 });
  const [simNodes, setSimNodes] = useState<SimNode[]>([]);
  const [simLinks, setSimLinks] = useState<SimLink[]>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTrophicFilters, setActiveTrophicFilters] = useState<Set<string>>(
    new Set(Object.keys(LEVEL_COLORS))
  );
  const [removedNodes, setRemovedNodes] = useState<Set<string>>(new Set());
  const [cascadeAnimating, setCascadeAnimating] = useState(false);
  const [animatedVictims, setAnimatedVictims] = useState<Set<string>>(new Set());
  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity);
  const [aiInterpretation, setAiInterpretation] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // ── resize ───────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      setDims({ w: width, h: Math.max(550, width * 0.6) });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // ── data ─────────────────────────────────────────────────────
  const { graphNodes, graphEdges } = useMemo(() => {
    if (zone) {
      const zg = ZONE_DEPENDENCY_GRAPHS[zone.id];
      if (zg) return { graphNodes: zg.nodes as GraphNode[], graphEdges: zg.edges as DependencyEdge[] };
    }
    return {
      graphNodes: DEPENDENCY_NODES as unknown as GraphNode[],
      graphEdges: DEPENDENCY_EDGES as unknown as DependencyEdge[],
    };
  }, [zone]);

  // ── cascade logic ────────────────────────────────────────────
  const getCascadeVictims = useCallback(
    (removedId: string): Set<string> => {
      const victims = new Set<string>();
      const queue = [removedId];
      while (queue.length > 0) {
        const current = queue.shift()!;
        for (const edge of graphEdges) {
          if (
            edge.source === current &&
            !victims.has(edge.target) &&
            !removedNodes.has(edge.target)
          ) {
            const altSources = graphEdges
              .filter((e) => e.target === edge.target && e.source !== current)
              .map((e) => e.source)
              .filter((s) => !removedNodes.has(s) && s !== removedId && !victims.has(s));
            if (altSources.length === 0) {
              victims.add(edge.target);
              queue.push(edge.target);
            }
          }
        }
      }
      return victims;
    },
    [removedNodes, graphEdges]
  );

  const cascadeVictims = hoveredNode ? getCascadeVictims(hoveredNode) : new Set<string>();
  const cascadeImpactPct = hoveredNode
    ? ((cascadeVictims.size + 1) / graphNodes.length) * 100
    : 0;

  const animateCascade = useCallback(
    (removedId: string) => {
      const victims = getCascadeVictims(removedId);
      setCascadeAnimating(true);
      setAnimatedVictims(new Set());

      const trophicOrder = [
        "producer", "decomposer", "pollinator", "primary_consumer",
        "secondary_consumer", "tertiary_consumer", "apex_predator",
      ];
      const sorted = Array.from(victims).sort((a, b) => {
        const na = graphNodes.find((n) => n.id === a);
        const nb = graphNodes.find((n) => n.id === b);
        return trophicOrder.indexOf(na?.trophic_level ?? "") - trophicOrder.indexOf(nb?.trophic_level ?? "");
      });

      const levels = new Map<number, string[]>();
      sorted.forEach((v) => {
        const n = graphNodes.find((nd) => nd.id === v);
        const depth = trophicOrder.indexOf(n?.trophic_level ?? "");
        if (!levels.has(depth)) levels.set(depth, []);
        levels.get(depth)!.push(v);
      });

      let delay = 0;
      const accumulated = new Set<string>([removedId]);
      const sortedEntries = Array.from(levels.entries()).sort(([a], [b]) => a - b);
      for (const [, levelNodes] of sortedEntries) {
        const d = delay;
        setTimeout(() => {
          setAnimatedVictims((prev) => {
            const next = new Set(prev);
            for (const v of levelNodes) next.add(v);
            return next;
          });
        }, d);
        for (const v of levelNodes) accumulated.add(v);
        delay += 400;
      }

      setTimeout(() => {
        setRemovedNodes((prev) => {
          const next = new Set(prev);
          accumulated.forEach((v) => next.add(v));
          return next;
        });
        setAnimatedVictims(new Set());
        setCascadeAnimating(false);
        const removedNode = graphNodes.find((n) => n.id === removedId);
        const victimList = Array.from(accumulated).filter((vid) => vid !== removedId).map((vid) => graphNodes.find((n) => n.id === vid)).filter(Boolean) as GraphNode[];
        if (removedNode) { generateInterpretation(removedNode, victimList, accumulated.size, graphNodes.length); }
      }, delay + 300);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getCascadeVictims, graphNodes]
  );

  const generateInterpretation = async (removed: GraphNode, victims: GraphNode[], totalCollapsed: number, totalSpecies: number) => {
    setAiLoading(true);
    setAiInterpretation(null);
    const impactPct = ((totalCollapsed / totalSpecies) * 100).toFixed(1);
    const trophicLevelsHit = Array.from(new Set(victims.map((v) => v.trophic_level)));
    const victimSummary = victims.slice(0, 8).map((v) => `${v.common_name || v.id} (${v.trophic_level.replace(/_/g, " ")})`).join(", ");
    const zoneName = zone?.name ?? "San Diego County";
    const prompt = `You are a conservation ecologist. A cascade simulation removed "${removed.common_name || removed.id}" (${removed.trophic_level.replace(/_/g, " ")}, ${removed.observations} observations) from the ${zoneName} food web. This caused ${totalCollapsed - 1} additional species to collapse (${impactPct}% of the ecosystem), affecting trophic levels: ${trophicLevelsHit.join(", ")}. Collapsed species include: ${victimSummary}${victims.length > 8 ? ` and ${victims.length - 8} more` : ""}. Write a 2-3 sentence ecological impact assessment. Be specific about what ecological functions are lost and what real-world consequences would follow. End with one concrete conservation action. No headers or bullet points, just flowing text.`;
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (apiKey) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 200, temperature: 0.7 } }) });
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) { setAiInterpretation(text); setAiLoading(false); return; }
      } catch { /* fallback */ }
    }
    const roleMap: Record<string, string> = { producer: "primary production and habitat structure", pollinator: "pollination services for plant reproduction", primary_consumer: "herbivore-level energy transfer", secondary_consumer: "mid-level predation balance", tertiary_consumer: "upper food chain regulation", apex_predator: "top-down population control", decomposer: "nutrient recycling and decomposition" };
    const lostFunctions = trophicLevelsHit.map((l) => roleMap[l] || l.replace(/_/g, " ")).join(", ");
    setAiInterpretation(`Removing ${removed.common_name || removed.id} from ${zoneName}'s ecosystem triggers a cascade collapse affecting ${totalCollapsed - 1} species across ${trophicLevelsHit.length} trophic level${trophicLevelsHit.length > 1 ? "s" : ""}, representing ${impactPct}% of the local food web. The loss eliminates critical ecological functions including ${lostFunctions}. Priority action: establish protected habitat corridors for ${removed.common_name || removed.id} populations in ${zoneName} to prevent this scenario.`);
    setAiLoading(false);
  };

  // preserve positions across simulation rebuilds so removals don't explode
  const prevPositions = useRef<Map<string, { x: number; y: number }>>(new Map());

  // ── simulation ───────────────────────────────────────────────
  useEffect(() => {
    if (simRef.current) simRef.current.stop();
    cancelAnimationFrame(animFrameRef.current);

    const filteredNodes = graphNodes
      .filter((n) => !removedNodes.has(n.id))
      .filter((n) => activeTrophicFilters.has(n.trophic_level));

    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    const hasExistingPositions = prevPositions.current.size > 0;

    const sNodes: SimNode[] = filteredNodes.map((n) => {
      const prev = prevPositions.current.get(n.id);
      return {
        data: n,
        radius: Math.max(4, Math.min(16, Math.sqrt(n.observations) * 0.6)),
        x: prev?.x ?? dims.w / 2 + (Math.random() - 0.5) * dims.w * 0.5,
        y: prev?.y ?? dims.h / 2 + (Math.random() - 0.5) * dims.h * 0.5,
        vx: 0,
        vy: 0,
      };
    });

    const nodeMap = new Map(sNodes.map((n) => [n.data.id, n]));

    const sLinks: SimLink[] = graphEdges
      .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
      .map((e) => ({
        source: nodeMap.get(e.source)!,
        target: nodeMap.get(e.target)!,
        edgeType: e.type,
      }))
      .filter((l) => l.source && l.target);

    const sim = forceSimulation<SimNode>(sNodes)
      .force(
        "link",
        forceLink<SimNode, SimLink>(sLinks)
          .id((d) => d.data.id)
          .distance(100)
          .strength(0.12)
      )
      .force("charge", forceManyBody<SimNode>().strength(-120).distanceMax(350))
      .force("center", forceCenter(dims.w / 2, dims.h / 2).strength(0.015))
      .force("collide", forceCollide<SimNode>().radius((d) => d.radius + 14).strength(0.7))
      .force("x", forceX<SimNode>(dims.w / 2).strength(0.012))
      .force("y", forceY<SimNode>(dims.h / 2).strength(0.012))
      .alphaDecay(0.05)
      .velocityDecay(0.6);

    // gentle reheat when removing nodes, full energy only on first layout
    if (hasExistingPositions) {
      sim.alpha(0.12).alphaTarget(0);
    }

    simRef.current = sim;

    const runSim = () => {
      sim.tick();
      sNodes.forEach((n) => {
        if (n.x != null && n.y != null) {
          prevPositions.current.set(n.data.id, { x: n.x, y: n.y });
        }
      });
      setSimNodes([...sNodes]);
      setSimLinks([...sLinks]);
      if (sim.alpha() > 0.001) {
        animFrameRef.current = requestAnimationFrame(runSim);
      }
    };
    animFrameRef.current = requestAnimationFrame(runSim);

    return () => {
      sim.stop();
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [graphNodes, graphEdges, dims, removedNodes, activeTrophicFilters]);

  // ── zoom ─────────────────────────────────────────────────────
  const zoomRef = useRef<ReturnType<typeof d3Zoom<SVGSVGElement, unknown>> | null>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const zoomBehavior = d3Zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 5])
      .filter((event) => {
        if (event.type === "wheel") return false;
        return true;
      })
      .on("zoom", (event) => {
        transformRef.current = event.transform;
        setTransform(event.transform);
      });

    zoomRef.current = zoomBehavior;
    select(svg).call(zoomBehavior);
    select(svg).on("dblclick.zoom", null);

    return () => {
      select(svg).on(".zoom", null);
    };
  }, []);

  const handleZoomSlider = useCallback((newScale: number) => {
    const svg = svgRef.current;
    const zb = zoomRef.current;
    if (!svg || !zb) return;
    const currentT = transformRef.current;
    const cx = dims.w / 2;
    const cy = dims.h / 2;
    const ratio = newScale / currentT.k;
    const newX = cx - (cx - currentT.x) * ratio;
    const newY = cy - (cy - currentT.y) * ratio;
    const newTransform = zoomIdentity.translate(newX, newY).scale(newScale);
    select(svg).transition().duration(150).call(zb.transform, newTransform);
  }, [dims]);

  // ── reset on zone change ─────────────────────────────────────
  useEffect(() => {
    prevPositions.current.clear();
    setRemovedNodes(new Set());
    setSelectedNode(null);
    setHoveredNode(null);
    setSearchQuery("");
    setAnimatedVictims(new Set());
    setActiveTrophicFilters(new Set(Object.keys(LEVEL_COLORS)));
    setAiInterpretation(null);
    if (svgRef.current) {
      select(svgRef.current).call(
        d3Zoom<SVGSVGElement, unknown>().transform,
        zoomIdentity
      );
    }
    setTransform(zoomIdentity);
  }, [zone]);

  // ── search ───────────────────────────────────────────────────
  const searchMatch = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    return simNodes.find(
      (n) =>
        n.data.common_name.toLowerCase().includes(q) ||
        n.data.id.toLowerCase().includes(q)
    ) ?? null;
  }, [searchQuery, simNodes]);

  useEffect(() => {
    if (!searchMatch || !svgRef.current) return;
    const x = searchMatch.x ?? 0;
    const y = searchMatch.y ?? 0;
    const newTransform = zoomIdentity.translate(dims.w / 2 - x * 2, dims.h / 2 - y * 2).scale(2);
    select(svgRef.current)
      .transition()
      .duration(600)
      .call(d3Zoom<SVGSVGElement, unknown>().transform, newTransform);
    setSelectedNode(searchMatch.data.id);
  }, [searchMatch, dims]);

  // ── helpers ──────────────────────────────────────────────────
  const connectedTo = useMemo(() => {
    const active = hoveredNode ?? selectedNode;
    if (!active) return new Set<string>();
    const s = new Set<string>();
    for (const l of simLinks) {
      const src = (l.source as SimNode).data.id;
      const tgt = (l.target as SimNode).data.id;
      if (src === active) s.add(tgt);
      if (tgt === active) s.add(src);
    }
    return s;
  }, [hoveredNode, selectedNode, simLinks]);

  const activeId = hoveredNode ?? selectedNode;

  const selectedData = selectedNode
    ? graphNodes.find((n) => n.id === selectedNode) ?? null
    : null;

  const selectedCascadeCount = selectedNode ? getCascadeVictims(selectedNode).size : 0;
  const selectedCascadePct = selectedNode
    ? ((selectedCascadeCount + 1) / graphNodes.length) * 100
    : 0;

  const toggleFilter = (level: string) => {
    setActiveTrophicFilters((prev) => {
      const next = new Set(prev);
      if (next.has(level)) {
        if (next.size > 1) next.delete(level);
      } else {
        next.add(level);
      }
      return next;
    });
  };

  const totalRemoved = removedNodes.size;

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="glass rounded-2xl p-6"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-semibold">
            Ecosystem Dependency Graph
            {zone && (
              <span className="text-sm font-normal text-white/40 ml-2">
                — {zone.name}
              </span>
            )}
          </h3>
          <p className="text-sm text-white/40 mt-1">
            Explore species connections — drag to pan, scroll to zoom, click to inspect
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {hoveredNode && cascadeVictims.size > 0 && (
            <span className="text-sm text-orange-400 font-medium animate-pulse">
              cascade impact: {cascadeImpactPct.toFixed(1)}%
            </span>
          )}
          {totalRemoved > 0 && (
            <>
              <span className="text-sm text-red-400 font-medium">
                {totalRemoved} removed
              </span>
              <button
                onClick={() => {
                  setRemovedNodes(new Set());
                  setSelectedNode(null);
                  setAiInterpretation(null);
                }}
                className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 transition"
              >
                Reset
              </button>
            </>
          )}
        </div>
      </div>

      {/* Controls bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search species..."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/25"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedNode(null);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
            >
              ×
            </button>
          )}
        </div>

        {/* Trophic filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {Object.entries(LEVEL_COLORS).map(([level, color]) => {
            const active = activeTrophicFilters.has(level);
            return (
              <button
                key={level}
                onClick={() => toggleFilter(level)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] transition border ${
                  active
                    ? "border-white/15 bg-white/5"
                    : "border-transparent bg-white/[0.02] opacity-40"
                }`}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: active ? color : color + "40" }}
                />
                <span className="text-white/50 capitalize hidden sm:inline">
                  {level.replace("_", " ")}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Edge legend */}
      <div className="flex items-center justify-center gap-4 mb-3">
        {Object.entries(EDGE_COLORS_BRIGHT).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 rounded" style={{ backgroundColor: color }} />
            <span className="text-[10px] text-white/30 capitalize">{type}</span>
          </div>
        ))}
      </div>

      {/* Graph */}
      <div className="relative rounded-xl overflow-hidden border border-white/[0.04]" style={{ background: "#060a07" }}>
        {/* Vignette overlay */}
        <div className="absolute inset-0 pointer-events-none z-[1]" style={{
          background: "radial-gradient(ellipse 70% 60% at 50% 50%, transparent 40%, rgba(0,0,0,0.6) 100%)",
        }} />
        <svg
          ref={svgRef}
          width={dims.w}
          height={dims.h}
          className="w-full cursor-grab active:cursor-grabbing"
          onClick={() => setSelectedNode(null)}
        >
          <defs>
            <filter id="node-glow">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="bloom">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <radialGradient id="bg-gradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(16,70,32,0.04)" />
              <stop offset="60%" stopColor="rgba(6,10,7,0)" />
            </radialGradient>
          </defs>

          <rect width={dims.w} height={dims.h} fill="#060a07" />
          <rect width={dims.w} height={dims.h} fill="url(#bg-gradient)" />
          {/* Subtle dot grid like Obsidian */}
          <pattern id="dot-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="12" cy="12" r="0.4" fill="rgba(110,231,183,0.06)" />
          </pattern>
          <rect width={dims.w} height={dims.h} fill="url(#dot-grid)" />

          <g ref={gRef} transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
            {/* Edges */}
            {simLinks.map((link, i) => {
              const src = link.source as SimNode;
              const tgt = link.target as SimNode;
              if (src.x == null || tgt.x == null) return null;

              const isFocused =
                activeId === src.data.id || activeId === tgt.data.id;
              const isCascadeEdge =
                hoveredNode === src.data.id && cascadeVictims.has(tgt.data.id);
              const isAnimCascade =
                animatedVictims.has(src.data.id) && animatedVictims.has(tgt.data.id);
              const dimmed = activeId && !isFocused;

              const midX = ((src.x ?? 0) + (tgt.x ?? 0)) / 2;
              const midY = ((src.y ?? 0) + (tgt.y ?? 0)) / 2;
              const dx = (tgt.x ?? 0) - (src.x ?? 0);
              const dy = (tgt.y ?? 0) - (src.y ?? 0);
              const dist = Math.sqrt(dx * dx + dy * dy);
              const curvature = Math.min(30, dist * 0.15);
              const nx = -dy / (dist || 1);
              const ny = dx / (dist || 1);
              const cx = midX + nx * curvature;
              const cy = midY + ny * curvature;
              const path = `M ${src.x} ${src.y} Q ${cx} ${cy} ${tgt.x} ${tgt.y}`;

              return (
                <g key={i}>
                  <path
                    d={path}
                    fill="none"
                    stroke={
                      isCascadeEdge || isAnimCascade
                        ? "#ef4444"
                        : isFocused
                        ? EDGE_COLORS_BRIGHT[link.edgeType] || "#fff"
                        : dimmed
                        ? "rgba(255,255,255,0.015)"
                        : EDGE_COLORS[link.edgeType] || "rgba(255,255,255,0.04)"
                    }
                    strokeWidth={isCascadeEdge || isAnimCascade ? 1.5 : isFocused ? 0.8 : 0.3}
                    opacity={dimmed ? 0.15 : 1}
                    strokeDasharray={isCascadeEdge ? "5 3" : "none"}
                  />
                  {isCascadeEdge && (
                    <circle r="2.5" fill="#ef4444" opacity={0.9}>
                      <animateMotion dur="1.2s" repeatCount="indefinite" path={path} />
                    </circle>
                  )}
                </g>
              );
            })}

            {/* Nodes — species photos */}
            {simNodes.map((node) => {
              if (node.x == null || node.y == null) return null;

              const color = LEVEL_COLORS[node.data.trophic_level] || "#64748b";
              const isHovered = hoveredNode === node.data.id;
              const isSelected = selectedNode === node.data.id;
              const isConnected = connectedTo.has(node.data.id);
              const isCascadeVictim = cascadeVictims.has(node.data.id);
              const isAnimVictim = animatedVictims.has(node.data.id);
              const isDeclining = node.data.decline_trend < -30;
              const dimmed = activeId && !isHovered && !isSelected && !isConnected && !isCascadeVictim;
              const r = isHovered || isSelected ? node.radius + 6 : node.radius + 2;
              const showLabel = isHovered || isSelected;
              const photoUrl = SPECIES_PHOTOS[node.data.id];
              const clipId = `photo-${node.data.id.replace(/\s+/g, "-")}`;

              return (
                <g
                  key={node.data.id}
                  onMouseEnter={() => setHoveredNode(node.data.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!cascadeAnimating) {
                      setSelectedNode(selectedNode === node.data.id ? null : node.data.id);
                    }
                  }}
                  className="cursor-pointer"
                  style={{ transition: "opacity 0.3s ease" }}
                  opacity={dimmed ? 0.07 : 1}
                >
                  <defs>
                    <clipPath id={clipId}>
                      <circle cx={node.x} cy={node.y} r={r - 1.5} />
                    </clipPath>
                  </defs>

                  {!dimmed && (
                    <circle cx={node.x} cy={node.y} r={r + 12} fill={color}
                      opacity={isHovered || isSelected ? 0.18 : 0.06} filter="url(#node-glow)" />
                  )}

                  {isDeclining && !dimmed && !isCascadeVictim && (
                    <circle cx={node.x} cy={node.y} r={r + 5} fill="none"
                      stroke="#f97316" strokeWidth={0.8} strokeDasharray="2 2" opacity={0.4}>
                      <animate attributeName="opacity" values="0.2;0.5;0.2" dur="3s" repeatCount="indefinite" />
                    </circle>
                  )}

                  {isAnimVictim && (
                    <circle cx={node.x} cy={node.y} r={r} fill="none"
                      stroke="#ef4444" strokeWidth={2} opacity={0}>
                      <animate attributeName="r" from={String(r)} to={String(r + 30)} dur="0.7s" fill="freeze" />
                      <animate attributeName="opacity" from="0.8" to="0" dur="0.7s" fill="freeze" />
                    </circle>
                  )}

                  <circle cx={node.x} cy={node.y} r={r}
                    fill={isCascadeVictim || isAnimVictim ? "rgba(239,68,68,0.3)" : "#0a0f0b"}
                    stroke={isSelected ? "#fff" : isHovered ? "rgba(255,255,255,0.7)" : isCascadeVictim ? "#ef4444" : color}
                    strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 1.5}
                    opacity={isCascadeVictim ? 0.4 : 1} />

                  {photoUrl && (
                    <image href={photoUrl}
                      x={node.x - r + 1.5} y={node.y - r + 1.5}
                      width={(r - 1.5) * 2} height={(r - 1.5) * 2}
                      clipPath={`url(#${clipId})`}
                      preserveAspectRatio="xMidYMid slice"
                      opacity={isCascadeVictim || isAnimVictim ? 0.15 : dimmed ? 0.5 : 1}
                      style={{ pointerEvents: "none" }} />
                  )}

                  {!photoUrl && (
                    <circle cx={node.x} cy={node.y} r={r - 2} fill={`${color}30`}
                      style={{ pointerEvents: "none" }} />
                  )}

                  {(isCascadeVictim || isAnimVictim) && (
                    <text x={node.x} y={(node.y ?? 0) + r * 0.35} textAnchor="middle"
                      fill="#ef4444" fontSize={r * 1.4} fontWeight="bold"
                      style={{ pointerEvents: "none" }}>\u00d7</text>
                  )}

                  {showLabel && (
                    <text x={node.x} y={(node.y ?? 0) + r + 12} textAnchor="middle"
                      fill={dimmed ? "rgba(255,255,255,0.08)" : isCascadeVictim ? "rgba(239,68,68,0.6)" : isHovered || isSelected ? "#fff" : "rgba(255,255,255,0.5)"}
                      fontSize={isHovered || isSelected ? 10 : 8}
                      fontWeight={isHovered || isSelected ? "600" : "400"}
                      letterSpacing="0.01em" paintOrder="stroke"
                      stroke="rgba(6,10,7,0.9)" strokeWidth={isHovered || isSelected ? 4 : 3}
                      style={{ textDecoration: isCascadeVictim ? "line-through" : "none" }}>
                      {node.data.common_name || node.data.id}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Info panel */}
        <AnimatePresence>
          {selectedData && !removedNodes.has(selectedNode!) && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="absolute top-4 right-4 w-72 border border-white/[0.06] rounded-xl p-4 backdrop-blur-xl z-10"
              style={{ background: "rgba(6,14,8,0.92)" }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {SPECIES_PHOTOS[selectedData.id] ? (
                    <img src={SPECIES_PHOTOS[selectedData.id]!} alt={selectedData.common_name || selectedData.id}
                      className="w-10 h-10 rounded-full object-cover border-2 shrink-0"
                      style={{ borderColor: LEVEL_COLORS[selectedData.trophic_level] }} />
                  ) : (
                    <div className="w-10 h-10 rounded-full border-2 shrink-0 flex items-center justify-center text-white/30"
                      style={{ borderColor: LEVEL_COLORS[selectedData.trophic_level] }}>?</div>
                  )}
                  <div>
                    <h4 className="text-sm font-semibold text-white">
                      {selectedData.common_name || selectedData.id}
                    </h4>
                    <p className="text-xs text-white/40 italic">{selectedData.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-white/30 hover:text-white/60 text-lg leading-none shrink-0"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-white/5 rounded-lg p-2">
                  <div className="text-[10px] text-white/30 uppercase">Observations</div>
                  <div className="text-sm font-semibold text-white">
                    {selectedData.observations.toLocaleString()}
                  </div>
                </div>
                {selectedData.zone_count != null && (
                  <div className="bg-white/5 rounded-lg p-2">
                    <div className="text-[10px] text-white/30 uppercase">Zones</div>
                    <div className="text-sm font-semibold text-white">
                      {selectedData.zone_count}
                    </div>
                  </div>
                )}
                <div className="bg-white/5 rounded-lg p-2">
                  <div className="text-[10px] text-white/30 uppercase">Trophic Level</div>
                  <div
                    className="text-sm font-semibold capitalize"
                    style={{ color: LEVEL_COLORS[selectedData.trophic_level] }}
                  >
                    {selectedData.trophic_level.replace("_", " ")}
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-2">
                  <div className="text-[10px] text-white/30 uppercase">
                    {zone ? "Zone Keystone" : "Keystone"}
                  </div>
                  <div
                    className={`text-sm font-semibold ${
                      ((zone ? selectedData.zone_keystone_score : selectedData.keystone_score) ?? 0) > 0.02
                        ? "text-orange-400"
                        : "text-white/60"
                    }`}
                  >
                    {(((zone ? selectedData.zone_keystone_score : selectedData.keystone_score) ?? 0) * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-2">
                  <div className="text-[10px] text-white/30 uppercase">YoY Trend</div>
                  <div
                    className={`text-sm font-semibold ${
                      selectedData.decline_trend < -30
                        ? "text-red-400"
                        : selectedData.decline_trend < 0
                        ? "text-orange-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {selectedData.decline_trend > 0 ? "+" : ""}
                    {selectedData.decline_trend.toFixed(1)}%
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-2">
                  <div className="text-[10px] text-white/30 uppercase">Cascade</div>
                  <div
                    className={`text-sm font-semibold ${
                      selectedCascadePct > 30
                        ? "text-red-400"
                        : selectedCascadePct > 15
                        ? "text-orange-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {selectedCascadePct.toFixed(1)}%
                  </div>
                </div>
              </div>

              {selectedData.family && (
                <div className="text-xs text-white/40 mb-3">
                  {selectedData.family} · {selectedData.order}
                </div>
              )}

              {selectedData.decline_trend < -30 && selectedData.keystone_score > 0 && (
                <div className="text-[10px] px-2 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-300 mb-3">
                  Critical — high keystone AND declining
                </div>
              )}

              <div className="text-xs text-white/30 mb-2">
                {connectedTo.size} direct connections
              </div>

              <button
                onClick={() => animateCascade(selectedNode!)}
                disabled={cascadeAnimating}
                className="w-full text-xs px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Simulate Removal
                {selectedCascadeCount > 0 && (
                  <span className="ml-1 text-red-400/60">
                    — cascades to {selectedCascadeCount}
                  </span>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Zoom slider */}
        <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2 px-3 py-2 rounded-lg border border-white/[0.06]" style={{ background: "rgba(6,14,8,0.85)" }}>
          <button
            onClick={() => handleZoomSlider(Math.max(0.2, transform.k - 0.3))}
            className="text-white/40 hover:text-white/70 text-sm font-mono w-5 h-5 flex items-center justify-center transition"
          >
            −
          </button>
          <input
            type="range"
            min={0.2}
            max={5}
            step={0.05}
            value={transform.k}
            onChange={(e) => handleZoomSlider(parseFloat(e.target.value))}
            className="w-24 h-1 appearance-none bg-white/10 rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-400/70 [&::-webkit-slider-thumb]:cursor-pointer"
          />
          <button
            onClick={() => handleZoomSlider(Math.min(5, transform.k + 0.3))}
            className="text-white/40 hover:text-white/70 text-sm font-mono w-5 h-5 flex items-center justify-center transition"
          >
            +
          </button>
          <span className="text-[10px] text-white/25 ml-1 w-8 text-right tabular-nums">
            {(transform.k * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* AI Interpretation */}
      <AnimatePresence>
        {(aiLoading || aiInterpretation) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 rounded-xl border border-emerald-500/10 overflow-hidden"
            style={{ background: "rgba(6,14,8,0.6)" }}
          >
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ animation: aiLoading ? "pulse 1.5s infinite" : "none" }} />
                <span className="text-[10px] uppercase tracking-wider text-emerald-400/70 font-medium">
                  {aiLoading ? "Generating ecological assessment..." : "AI Ecological Assessment"}
                </span>
                <span className="text-[9px] text-white/20 ml-auto">Powered by Gemini</span>
              </div>
              {aiLoading ? (
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-2 rounded-full bg-white/5 animate-pulse" style={{ width: `${30 + i * 20}%`, animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-white/60 leading-relaxed">{aiInterpretation}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between text-xs text-white/30">
        <span>
          Drag to pan · Click to inspect ·{" "}
          <span className="text-orange-400/50">◌ = declining</span>
        </span>
        <span>
          {simNodes.length} species · {simLinks.length} connections
          {zone && ` in ${zone.name}`}
        </span>
      </div>
    </motion.div>
  );
}
