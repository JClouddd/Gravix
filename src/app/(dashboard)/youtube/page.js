"use client";

import { useRouter } from "next/navigation";
import YouTubeModule from "@/components/modules/YouTubeModule";

export default function YouTubePage() {
  const router = useRouter();

  const handleSetActiveModule = (module) => {
    if (module === "home") {
      router.push("/");
    } else {
      router.push(`/${module}`);
    }
  };

  return <YouTubeModule setActiveModule={handleSetActiveModule} />;
}
