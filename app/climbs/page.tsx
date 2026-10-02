import type { Metadata } from "next";
import MyClimbs from "./MyClimbs";

export const metadata: Metadata = { title: "My climbs" };

export default function Page() {
  return <MyClimbs />;
}
