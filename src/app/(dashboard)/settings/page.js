"use client";

import { useRouter } from "next/navigation";
import SettingsModule from "@/components/modules/SettingsModule";

export default function SettingsPage() {
  const router = useRouter();

  const handleSetActiveModule = (module) => {
    if (module === "home") {
      router.push("/");
    } else {
      router.push(`/${module}`);
    }
  };

  return <SettingsModule setActiveModule={handleSetActiveModule} />;
}
