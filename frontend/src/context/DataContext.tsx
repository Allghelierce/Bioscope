"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  APP_DATA_URL, 
  type GlobalStats, 
  type EcosystemIndex, 
  type DependencyNode, 
  type DependencyEdge, 
  type KeystoneRanking,
  type ZoneKeystoneEntry,
  type CollapsePrediction,
  type Zone
} from "@/lib/speciesData";

interface AppData {
  zones: Zone[];
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  keystone_rankings: KeystoneRanking[];
  zone_keystone_rankings: Record<string, ZoneKeystoneEntry[]>;
  collapse_predictions: CollapsePrediction[];
  ecosystem_index: Record<string, EcosystemIndex>;
  global_stats: GlobalStats;
}

interface DataContextType {
  data: AppData | null;
  loading: boolean;
  error: string | null;
  speciesPhotos: Record<string, string | null>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  const [photos, setPhotos] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [appRes, photoRes] = await Promise.all([
          fetch(APP_DATA_URL),
          fetch("/data/species-photos.json").catch(() => null)
        ]);

        if (!appRes.ok) throw new Error("Failed to load ecosystem data");
        
        const appData = await appRes.json();
        setData(appData);

        if (photoRes && photoRes.ok) {
          setPhotos(await photoRes.json());
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  return (
    <DataContext.Provider value={{ data, loading, error, speciesPhotos: photos }}>
      {children}
    </DataContext.Provider>
  );
}

export function useAppData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useAppData must be used within a DataProvider");
  }
  return context;
}
