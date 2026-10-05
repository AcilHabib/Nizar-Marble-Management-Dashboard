import { prisma } from "@workspace/db";

export async function saveMarbleImage(
  buffer: Buffer,
  contentType: string,
  filename: string,
): Promise<string> {
  const row = await prisma.marbleImage.create({
    data: {
      contentType: contentType || "image/jpeg",
      filename: filename || "marble.jpg",
      data: buffer,
    },
    select: { id: true },
  });
  return `/api/uploads/marble-image/${row.id}`;
}

export async function loadMarbleImage(id: string) {
  return prisma.marbleImage.findUnique({
    where: { id },
    select: { data: true, contentType: true },
  });
}
