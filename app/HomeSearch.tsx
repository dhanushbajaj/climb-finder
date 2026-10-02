"use client";

import { useRouter } from "next/navigation";
import AreaPicker from "@/components/map/AreaPicker";
import { areaQuery } from "@/lib/geo";

export default function HomeSearch() {
  const router = useRouter();
  return <AreaPicker area={null} onChange={(a) => router.push(`/explore?${areaQuery(a)}`)} />;
}
