"use client";

import { useEffect, useState } from "react";

export function SeedInitializer() {
  const [seeded, setSeeded] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  useEffect(() => {
    // Only seed once per session
    if (seeded || isSeeding) return;

    const initializeSeed = async () => {
      try {
        setIsSeeding(true);
        const response = await fetch("/api/init/seed", {
          method: "POST",
        });

        if (response.ok) {
          const data = await response.json();
          if (data.seeded) {
            console.log("✅ Database seeded on first app start");
          } else if (data.skipped) {
            console.log("ℹ️ Database already seeded");
          }
        } else {
          console.warn("⚠️ Failed to seed database:", await response.text());
        }
      } catch (error) {
        console.error("Error seeding database:", error);
      } finally {
        setIsSeeding(false);
        setSeeded(true);
      }
    };

    // Small delay to avoid blocking initial render
    const timeoutId = setTimeout(initializeSeed, 1000);
    return () => clearTimeout(timeoutId);
  }, [seeded, isSeeding]);

  // This component doesn't render anything
  return null;
}

