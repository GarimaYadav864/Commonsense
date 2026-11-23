export async function compressConditionPhoto(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please select an image file.");
  if (! ["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Use a JPEG, PNG or WebP image.");
  const source = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = source;
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("Unable to read this image.")); });
    const scale = Math.min(1, 1280 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image processing is unavailable in this browser.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    let quality = 0.78;
    let data = canvas.toDataURL("image/jpeg", quality);
    while (data.length > 460000 && quality > 0.35) { quality -= 0.1; data = canvas.toDataURL("image/jpeg", quality); }
    if (data.length > 500000) throw new Error("This photo is too large. Choose a smaller image.");
    return data;
  } finally { URL.revokeObjectURL(source); }
}
