"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import type { Salon } from "@/types/api";

export function useOwnerSalon(token: string) {
  const [salon, setSalon] = useState<Salon | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSalon() {
      setLoading(true);
      setError("");
      try {
        const data = await apiRequest<Salon>("/salon/me/current", { token });
        setSalon(data);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not load your salon.");
      } finally {
        setLoading(false);
      }
    }

    loadSalon();
  }, [token]);

  return { salon, salonId: salon?.id ?? null, loading, error };
}
