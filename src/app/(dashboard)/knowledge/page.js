"use client";

import { useRouter } from "next/navigation";
import KnowledgeModule from "@/components/modules/KnowledgeModule";

export default function KnowledgePage() {
  const router = useRouter();

  const handleSetActiveModule = (module) => {
    if (module === "home") {
      router.push("/");
    } else {
      router.push(`/${module}`);
    }
  };

  return <KnowledgeModule setActiveModule={handleSetActiveModule} />;
}
