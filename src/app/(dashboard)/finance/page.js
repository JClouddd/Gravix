"use client";

import { useRouter } from "next/navigation";
import FinanceModule from "@/components/modules/FinanceModule";

export default function FinancePage() {
  const router = useRouter();

  const handleSetActiveModule = (module) => {
    if (module === "home") {
      router.push("/");
    } else {
      router.push(`/${module}`);
    }
  };

  return <FinanceModule setActiveModule={handleSetActiveModule} />;
}
