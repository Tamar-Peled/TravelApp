import type { PrismaClient, Role } from "@prisma/client";

export type TripAccess = {
  tripId: string;
  ownerId: string;
  role: Role | "OWNER" | null;
};

export async function getTripAccess(input: {
  prisma: PrismaClient;
  userId: string;
  tripId: string;
}): Promise<TripAccess | null> {
  const trip = await input.prisma.trip.findUnique({
    where: { id: input.tripId },
    select: {
      id: true,
      userId: true,
      collaborators: {
        where: { userId: input.userId },
        select: { role: true },
        take: 1,
      },
    },
  });
  if (!trip) return null;
  if (trip.userId === input.userId) {
    return { tripId: trip.id, ownerId: trip.userId, role: "OWNER" };
  }
  const role = trip.collaborators[0]?.role ?? null;
  if (!role) return null;
  return { tripId: trip.id, ownerId: trip.userId, role };
}

