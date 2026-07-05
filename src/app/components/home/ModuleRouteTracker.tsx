"use client";

import { useEffect } from "react";
import type { AppModule } from "@/lib/app/lastModule";
import { recordLastModule } from "@/lib/app/lastModule";

type Props = {
  module: AppModule;
};

export default function ModuleRouteTracker({ module }: Props) {
  useEffect(() => {
    recordLastModule(module);
  }, [module]);

  return null;
}
