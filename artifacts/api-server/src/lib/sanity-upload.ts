import { createClient, type SanityClient } from "@sanity/client";

let client: SanityClient | null = null;

function getSanityClient(): SanityClient {
  if (client) return client;
  const projectId = process.env.SANITY_PROJECT_ID;
  const dataset = process.env.SANITY_DATASET ?? "production";
  const token = process.env.SANITY_API_TOKEN;
  if (!projectId || !token) {
    throw new Error(
      "Sanity is not configured (SANITY_PROJECT_ID, SANITY_API_TOKEN)",
    );
  }
  client = createClient({
    projectId,
    dataset,
    token,
    useCdn: false,
    apiVersion: "2024-01-01",
  });
  return client;
}

export function sanityConfigured(): boolean {
  return Boolean(
    process.env.SANITY_PROJECT_ID && process.env.SANITY_API_TOKEN,
  );
}

export async function uploadImageToSanity(
  buffer: Buffer,
  filename: string,
  contentType: string,
): Promise<string> {
  const sanity = getSanityClient();
  const asset = await sanity.assets.upload("image", buffer, {
    filename,
    contentType,
  });
  return asset.url;
}
