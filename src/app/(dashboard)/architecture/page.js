"use client";

import { useRouter } from "next/navigation";
import ArchitectureModule from "@/components/modules/ArchitectureModule";

export default function ArchitecturePage() {
  const router = useRouter();

  const handleSetActiveModule = (module) => {
    if (module === "home") {
      router.push("/");
    } else {
      router.push(`/${module}`);
    }
  };

  return <ArchitectureModule setActiveModule={handleSetActiveModule} />;
}
