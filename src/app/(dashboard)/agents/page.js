"use client";

import { useRouter } from "next/navigation";
import AgentsModule from "@/components/modules/AgentsModule";

export default function AgentsPage() {
  const router = useRouter();

  const handleSetActiveModule = (module) => {
    if (module === "home") {
      router.push("/");
    } else {
      router.push(`/${module}`);
    }
  };

  return <AgentsModule setActiveModule={handleSetActiveModule} />;
}
