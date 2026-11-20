import { BACKEND_URL } from "../../config/api";

/**
 * Fetch the rendered pitch image for one possession.
 * Resolves to { image } on success or { error } on failure; never rejects.
 */
export async function fetchPossessionScene(matchFile, possession, noImageMessage = "No image returned") {
  try {
    const res = await fetch(`${BACKEND_URL}/match/${matchFile}/possession_scene?possession=${possession}`);
    const data = await res.json();
    if (data.image_base64) return { image: data.image_base64 };
    return { error: data.error || noImageMessage };
  } catch {
    return { error: "Failed to fetch possession scene" };
  }
}
