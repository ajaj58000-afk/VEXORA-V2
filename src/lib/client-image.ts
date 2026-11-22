const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

export async function compressImageFile(file: File) {
  const type = file.type.toLowerCase();
  if (!ALLOWED.includes(type)) {
    throw new Error("الصيغ المدعومة: JPG و PNG و WEBP فقط.");
  }
  if (file.size > 8 * 1024 * 1024) throw new Error("الصورة أكبر من 8 ميجا.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 800 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("تعذر قراءة الصورة");
  context.fillStyle = "#101010";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  let quality = 0.85;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  while (dataUrl.length > 380_000 && quality > 0.4) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }
  if (dataUrl.length > 1_500_000) throw new Error("تعذر ضغط الصورة. اختر صورة أصغر.");
  return dataUrl;
}
