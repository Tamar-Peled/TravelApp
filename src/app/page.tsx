import { AppShell } from "@/components/app-shell";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { MarketingLanding } from "@/components/marketing-landing";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return <MarketingLanding />;
  }
  return <AppShell />;
}
