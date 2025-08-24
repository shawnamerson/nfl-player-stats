// app/pricing/page.tsx
import { redirect } from "next/navigation";

export default function Page() {
  // Free for now: send all pricing traffic to Players
  redirect("/players");
}
