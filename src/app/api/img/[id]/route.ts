import { readImage } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const image = await readImage(id);
  if (!image) return new Response("Not found", { status: 404 });
  const bytes = Buffer.from(image.data, "base64");
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": image.mime,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
