"use client";

import { useRouter } from "next/navigation";
import HomeModule from "@/components/modules/HomeModule";

export default function HomePage() {
  const router = useRouter();

  const handleSetActiveModule = (module) => {
    if (module === "home") {
      router.push("/");
    } else {
      router.push(`/${module}`);
    }
  };

  return <HomeModule setActiveModule={handleSetActiveModule} />;
}
