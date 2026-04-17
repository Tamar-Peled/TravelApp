import { prisma } from "@/lib/db";
import { SharedTripClient } from "./shared-trip-client";

export default async function ShareTripPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const trip = await prisma.trip.findFirst({
    where: { shareToken: token },
    select: {
      id: true,
      name: true,
      region: true,
      city: true,
      linkShareEnabled: true,
      linkShareRole: true,
    },
  });
  if (!trip) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <p className="text-sm font-semibold text-zinc-900">Trip not found</p>
        <p className="mt-2 text-sm text-zinc-500">
          This link may be invalid or has been disabled.
        </p>
      </div>
    );
  }
  if (!trip.linkShareEnabled) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <p className="text-sm font-semibold text-zinc-900">
          This share link is disabled
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          Ask the trip owner to enable link sharing again.
        </p>
      </div>
    );
  }

  const places = await prisma.place.findMany({
    where: { tripId: trip.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      subLocation: true,
      category: true,
      formattedAddress: true,
      photoReference: true,
      sourceUrl: true,
    },
  });

  return (
    <SharedTripClient
      token={token}
      tripName={trip.name}
      role={trip.linkShareRole}
      initialPlaces={places}
    />
  );
}

