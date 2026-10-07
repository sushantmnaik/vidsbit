export function parseHexColor(color: string): { r: number; g: number; b: number } {
  const value = color.replace("#", "");
  const normalized =
    value.length === 3
      ? value
          .split("")
          .map((char) => char + char)
          .join("")
      : value.padEnd(6, "0").slice(0, 6);

  const numeric = Number.parseInt(normalized, 16);
  return {
    r: (numeric >> 16) & 255,
    g: (numeric >> 8) & 255,
    b: numeric & 255,
  };
}

export function applyChromaKey(
  imageData: ImageData,
  keyColor: string,
  tolerance: number,
  softness: number,
  spill: number,
): ImageData {
  const key = parseHexColor(keyColor);
  const data = imageData.data;
  const maxDistance = Math.max(0.01, tolerance) * 441.67;
  const soft = Math.max(0.001, softness) * 441.67;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const dr = r - key.r;
    const dg = g - key.g;
    const db = b - key.b;
    const distance = Math.sqrt(dr * dr + dg * dg + db * db);

    let alpha = 1;
    if (distance < maxDistance) {
      alpha = 0;
    } else if (distance < maxDistance + soft) {
      alpha = (distance - maxDistance) / soft;
    }

    if (spill > 0 && alpha > 0) {
      const greenSpill = g - Math.max(r, b);
      if (greenSpill > 0) {
        data[i + 1] = Math.max(0, g - greenSpill * spill);
      }
    }

    data[i + 3] = Math.round(data[i + 3] * alpha);
  }

  return imageData;
}

export function isolateSubjectFromCorners(imageData: ImageData, tolerance = 0.28): ImageData {
  const { width, height, data } = imageData;
  const samples: Array<{ r: number; g: number; b: number }> = [];
  const inset = Math.max(2, Math.floor(Math.min(width, height) * 0.04));

  const sample = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    samples.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
  };

  for (let x = 0; x < width; x += 8) {
    sample(x, inset);
    sample(x, height - 1 - inset);
  }
  for (let y = 0; y < height; y += 8) {
    sample(inset, y);
    sample(width - 1 - inset, y);
  }

  const avg = samples.reduce(
    (acc, sampleValue) => {
      acc.r += sampleValue.r;
      acc.g += sampleValue.g;
      acc.b += sampleValue.b;
      return acc;
    },
    { r: 0, g: 0, b: 0 },
  );
  const count = Math.max(1, samples.length);
  avg.r /= count;
  avg.g /= count;
  avg.b /= count;

  const maxDistance = tolerance * 441.67;

  for (let i = 0; i < data.length; i += 4) {
    const dr = data[i] - avg.r;
    const dg = data[i + 1] - avg.g;
    const db = data[i + 2] - avg.b;
    const distance = Math.sqrt(dr * dr + dg * dg + db * db);
    if (distance < maxDistance) {
      data[i + 3] = 0;
    } else if (distance < maxDistance * 1.35) {
      data[i + 3] = Math.round(data[i + 3] * ((distance - maxDistance) / (maxDistance * 0.35)));
    }
  }

  return imageData;
}
