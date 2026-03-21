import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const island = await prisma.island.findUnique({
    where: { id },
    include: {
      pins: {
        orderBy: { sortOrder: "asc" },
        include: { challenges: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });

  if (!island) {
    return NextResponse.json({ error: "Island not found." }, { status: 404 });
  }

  return NextResponse.json(island);
}
