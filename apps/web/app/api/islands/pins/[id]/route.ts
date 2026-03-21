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
  const pin = await prisma.pin.findUnique({
    where: { id },
    include: { challenges: { orderBy: { sortOrder: "asc" } } },
  });

  if (!pin) {
    return NextResponse.json({ error: "Pin not found." }, { status: 404 });
  }

  return NextResponse.json(pin);
}
