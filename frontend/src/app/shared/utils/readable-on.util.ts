/**
 * Text color for a control filled with the accent. Light themes have dark accents and dark themes
 * mostly light ones, so it's worked out from the color. White stays while it holds 4:1, since the
 * themes were drawn with white buttons (Terracotta sits at about 4:1 either way); below that,
 * whichever of white and near-black has more contrast.
 */
export function readableOn(hex: string): string {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return '#fff';
  const channel = (offset: number) => {
    const c = parseInt(match[1].slice(offset, offset + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
  // #17171a has a luminance of about 0.009.
  const onWhite = 1.05 / (luminance + 0.05);
  const onDark = (luminance + 0.05) / 0.059;
  return onWhite >= 4 || onWhite >= onDark ? '#fff' : '#17171a';
}
