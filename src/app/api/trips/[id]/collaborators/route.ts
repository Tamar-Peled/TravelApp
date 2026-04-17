import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { getTripAccess } from "@/lib/trip-access";

function normalizeEmail(raw: string) {
  return raw.trim().toLowerCase();
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id: tripId } = await params;

    const access = await getTripAccess({ prisma, userId, tripId });
    if (!access) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        id: true,
        userId: true,
        owner: { select: { id: true, name: true, email: true } },
        collaborators: {
          select: {
            id: true,
            role: true,
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { id: "asc" },
        },
      },
    });
    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    return NextResponse.json({
      tripId: trip.id,
      viewer: {
        userId,
        isOwner: userId === trip.userId,
      },
      owner: trip.owner,
      collaborators: trip.collaborators.map((c) => ({
        id: c.id,
        role: c.role,
        user: c.user,
      })),
    });
  } catch (e) {
    console.error(e);
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to load collaborators" },
      { status: 500 },
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id: tripId } = await params;
    const body = (await req.json()) as { email?: string; role?: Role };
    const email = normalizeEmail(body.email ?? "");
    const role = body.role;
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    if (role !== "EDITOR" && role !== "VIEWER") {
      return NextResponse.json({ error: "Role is required" }, { status: 400 });
    }

    const access = await getTripAccess({ prisma, userId, tripId });
    if (!access) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }
    if (access.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const invitedUser =
      (await prisma.user.findUnique({ where: { email } })) ??
      (await prisma.user.create({ data: { email } }));

    if (invitedUser.id === access.ownerId) {
      return NextResponse.json(
        { error: "Owner already has access" },
        { status: 400 },
      );
    }

    const collaborator = await prisma.tripCollaborator.upsert({
      where: { tripId_userId: { tripId, userId: invitedUser.id } },
      update: { role },
      create: { tripId, userId: invitedUser.id, role },
      select: {
        id: true,
        role: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ collaborator });
  } catch (e) {
    console.error(e);
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to add collaborator" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id: tripId } = await params;
    const body = (await req.json()) as { collaboratorId?: string; role?: Role };
    if (!body.collaboratorId) {
      return NextResponse.json(
        { error: "collaboratorId is required" },
        { status: 400 },
      );
    }
    if (body.role !== "EDITOR" && body.role !== "VIEWER") {
      return NextResponse.json({ error: "Role is required" }, { status: 400 });
    }

    const access = await getTripAccess({ prisma, userId, tripId });
    if (!access) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }
    if (access.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.tripCollaborator.update({
      where: { id: body.collaboratorId },
      data: { role: body.role },
      select: {
        id: true,
        role: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });
    return NextResponse.json({ collaborator: updated });
  } catch (e) {
    console.error(e);
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to update collaborator" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id: tripId } = await params;
    const { searchParams } = new URL(req.url);
    const collaboratorId = searchParams.get("collaboratorId");
    if (!collaboratorId) {
      return NextResponse.json(
        { error: "collaboratorId is required" },
        { status: 400 },
      );
    }

    const access = await getTripAccess({ prisma, userId, tripId });
    if (!access) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }
    if (access.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.tripCollaborator.delete({ where: { id: collaboratorId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to remove collaborator" },
      { status: 500 },
    );
  }
}

