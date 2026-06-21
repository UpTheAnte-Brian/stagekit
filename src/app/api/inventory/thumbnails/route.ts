import { NextResponse } from "next/server";
import { z } from "zod";

import { listItemThumbnailUrls } from "@/lib/db/inventory";

const thumbnailRequestSchema = z.object({
  itemIds: z.array(z.string().uuid()).max(100),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { itemIds } = thumbnailRequestSchema.parse(body);
    const thumbnailByItemId = await listItemThumbnailUrls(itemIds);

    return NextResponse.json({
      thumbnails: Object.fromEntries(thumbnailByItemId),
    });
  } catch (error) {
    console.error("Failed to build inventory thumbnail response", error);

    return NextResponse.json(
      {
        message: "Failed to load inventory thumbnails.",
      },
      { status: 400 },
    );
  }
}
