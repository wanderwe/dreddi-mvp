import type { JudgeImage } from "@/lib/ai/judge";

const MAX_IMAGE_SIDE = 1568;

// Browser only: shrinks a photo before upload so a phone picture stays well under the request size limit.
export const toJudgeImage = async (file: File): Promise<JudgeImage> => {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return { mediaType: "image/jpeg", data: dataUrl.slice(dataUrl.indexOf(",") + 1) };
};
