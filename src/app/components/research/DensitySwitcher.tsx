"use client";

import { usePathname, useRouter } from "next/navigation";

import { recordLastModule } from "@/lib/app/lastModule";
import {
  densityFromPathname,
  densityRouteFor,
  lastModuleForDensity,
  PERMANENT_DENSITY_ORDER,
  type PermanentResearchDensity,
} from "@/lib/research/densityNav";

import EdgeSegmentedTabs from "../design-system/EdgeSegmentedTabs";

const SEGMENTS = PERMANENT_DENSITY_ORDER.map((density) => ({
  id: density,
  label: density,
}));

export default function DensitySwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const activeDensity = densityFromPathname(pathname);

  if (!activeDensity) {
    return null;
  }

  const handleChange = (id: string) => {
    const density = id as PermanentResearchDensity;
    const route = densityRouteFor(density);
    if (route === pathname) {
      return;
    }
    recordLastModule(lastModuleForDensity(density));
    router.push(route);
  };

  return (
    <div data-testid="density-switcher" className="hidden min-w-0 sm:block">
      <EdgeSegmentedTabs segments={SEGMENTS} value={activeDensity} onChange={handleChange} />
    </div>
  );
}
