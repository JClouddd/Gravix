"use client";

import { useRouter } from "next/navigation";
import ManagementDashboard from "@/components/modules/ManagementModule/ManagementDashboard";

export default function ManagementPage() {
  const router = useRouter();

  const handleSetActiveModule = (module) => {
    if (module === "home") {
      router.push("/");
    } else {
      router.push(`/${module}`);
    }
  };

  return <ManagementDashboard setActiveModule={handleSetActiveModule} />;
}
