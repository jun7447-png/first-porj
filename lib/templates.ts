export interface TemplateInfo {
  id: number;
  name: string;
  description: string;
}

export const TEMPLATE_LIST: TemplateInfo[] = [
  { id: 0, name: "스튜디오 화이트", description: "깔끔한 화이트 배경의 전문 제품 컷" },
  { id: 1, name: "다크 프리미엄", description: "고급스러운 다크 배경으로 제품 부각" },
  { id: 2, name: "브랜드 바이올렛", description: "바이올렛 그라디언트 브랜드 이미지" },
  { id: 3, name: "웜 라이프스타일", description: "따뜻한 톤의 감성 라이프스타일 컷" },
  { id: 4, name: "미니멀 포커스", description: "제품만 돋보이는 미니멀 디자인" },
];

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = reject;
    img.src = url;
  });
}

// 이미지를 박스에 채우기 (cover — 가득 채우고 clip)
function coverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  bx: number, by: number, bw: number, bh: number
) {
  const ir = img.naturalWidth / img.naturalHeight;
  const br = bw / bh;
  let dw: number, dh: number, dx: number, dy: number;
  if (ir > br) {
    dh = bh; dw = bh * ir; dx = bx - (dw - bw) / 2; dy = by;
  } else {
    dw = bw; dh = bw / ir; dx = bx; dy = by - (dh - bh) / 2;
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(bx, by, bw, bh);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

// 이미지를 박스 안에 맞추기 (contain — 여백 허용)
function containImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  bx: number, by: number, bw: number, bh: number
) {
  const ir = img.naturalWidth / img.naturalHeight;
  const br = bw / bh;
  let dw: number, dh: number;
  if (ir > br) {
    dw = bw; dh = bw / ir;
  } else {
    dh = bh; dw = bh * ir;
  }
  const dx = bx + (bw - dw) / 2;
  const dy = by + (bh - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
}

function mk(w = 1080, h = 1080): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return [c, c.getContext("2d")!];
}

// ─── Template 0: Studio White ───────────────────────────────────────────────
function renderStudioWhite(img: HTMLImageElement): string {
  const [c, ctx] = mk();
  ctx.fillStyle = "#F9F9F9"; ctx.fillRect(0, 0, 1080, 1080);
  ctx.fillStyle = "#EFEFEF"; ctx.fillRect(0, 0, 1080, 108);
  ctx.fillStyle = "#555"; ctx.font = "600 26px Arial, sans-serif";
  ctx.textAlign = "center"; ctx.fillText("PRODUCT STUDIO", 540, 64);

  ctx.shadowColor = "rgba(0,0,0,0.13)";
  ctx.shadowBlur = 64; ctx.shadowOffsetY = 32;
  containImage(ctx, img, 130, 120, 820, 730);
  ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

  ctx.fillStyle = "#1A1A1A"; ctx.fillRect(0, 940, 1080, 140);
  ctx.fillStyle = "#FFFFFF"; ctx.font = "bold 36px Arial";
  ctx.fillText("프리미엄 상품", 540, 996);
  ctx.fillStyle = "#AAAAAA"; ctx.font = "22px Arial";
  ctx.fillText("최고 품질 보장  |  무료 배송", 540, 1042);

  return c.toDataURL("image/jpeg", 0.92);
}

// ─── Template 1: Dark Premium ────────────────────────────────────────────────
function renderDarkPremium(img: HTMLImageElement): string {
  const [c, ctx] = mk();

  const bg = ctx.createLinearGradient(0, 0, 1080, 1080);
  bg.addColorStop(0, "#0c0c1e"); bg.addColorStop(1, "#1e0c35");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 1080, 1080);

  const glow = ctx.createRadialGradient(540, 460, 0, 540, 460, 440);
  glow.addColorStop(0, "rgba(139,92,246,0.38)"); glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow; ctx.fillRect(0, 0, 1080, 1080);

  containImage(ctx, img, 140, 90, 800, 790);

  const fade = ctx.createLinearGradient(0, 680, 0, 1080);
  fade.addColorStop(0, "transparent"); fade.addColorStop(1, "rgba(12,12,30,0.98)");
  ctx.fillStyle = fade; ctx.fillRect(0, 680, 1080, 400);

  const line = ctx.createLinearGradient(200, 0, 880, 0);
  line.addColorStop(0, "transparent"); line.addColorStop(0.5, "#8b5cf6"); line.addColorStop(1, "transparent");
  ctx.strokeStyle = line; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(200, 898); ctx.lineTo(880, 898); ctx.stroke();

  ctx.fillStyle = "#E2D8FF"; ctx.font = "500 26px Arial"; ctx.textAlign = "center";
  ctx.fillText("PREMIUM PRODUCT", 540, 938);

  const tg = ctx.createLinearGradient(340, 0, 740, 0);
  tg.addColorStop(0, "#c4b5fd"); tg.addColorStop(1, "#67e8f9");
  ctx.fillStyle = tg; ctx.font = "bold 54px Arial";
  ctx.fillText("COLLECTION", 540, 1004);

  ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.font = "22px Arial";
  ctx.fillText("한정 수량  ·  최상급 소재  ·  프리미엄 케어", 540, 1052);

  return c.toDataURL("image/jpeg", 0.92);
}

// ─── Template 2: Brand Violet ────────────────────────────────────────────────
function renderBrandViolet(img: HTMLImageElement): string {
  const [c, ctx] = mk();

  const bg = ctx.createLinearGradient(0, 0, 1080, 1080);
  bg.addColorStop(0, "#4f1e96"); bg.addColorStop(1, "#0f6e8a");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 1080, 1080);

  const circle = ctx.createRadialGradient(540, 460, 0, 540, 460, 380);
  circle.addColorStop(0, "rgba(255,255,255,0.14)"); circle.addColorStop(1, "transparent");
  ctx.fillStyle = circle; ctx.fillRect(0, 0, 1080, 1080);

  containImage(ctx, img, 150, 90, 780, 790);

  const fade = ctx.createLinearGradient(0, 700, 0, 1080);
  fade.addColorStop(0, "transparent"); fade.addColorStop(1, "rgba(79,30,150,0.97)");
  ctx.fillStyle = fade; ctx.fillRect(0, 700, 1080, 380);

  ctx.fillStyle = "rgba(255,255,255,0.75)"; ctx.font = "600 26px Arial"; ctx.textAlign = "center";
  ctx.fillText("✦  NEW ARRIVAL  ✦", 540, 896);
  ctx.fillStyle = "#FFFFFF"; ctx.font = "bold 54px Arial";
  ctx.fillText("신상품 출시", 540, 964);
  ctx.fillStyle = "rgba(255,255,255,0.65)"; ctx.font = "24px Arial";
  ctx.fillText("지금 만나보세요", 540, 1016);

  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(440 + i * 50, 1058, i === 2 ? 7 : 4, 0, Math.PI * 2);
    ctx.fillStyle = i === 2 ? "#FFFFFF" : "rgba(255,255,255,0.38)";
    ctx.fill();
  }

  return c.toDataURL("image/jpeg", 0.92);
}

// ─── Template 3: Warm Lifestyle ──────────────────────────────────────────────
function renderWarmLifestyle(img: HTMLImageElement): string {
  const [c, ctx] = mk();

  ctx.fillStyle = "#FDF5E8"; ctx.fillRect(0, 0, 1080, 1080);
  ctx.fillStyle = "#E8C98A"; ctx.fillRect(0, 0, 1080, 14);
  ctx.fillStyle = "#C8A050"; ctx.fillRect(0, 14, 1080, 5);
  ctx.fillStyle = "#E6C98A"; ctx.fillRect(0, 0, 8, 1080); ctx.fillRect(1072, 0, 8, 1080);

  ctx.fillStyle = "#7C4A1E";
  ctx.font = "600 27px Georgia, Times, serif";
  ctx.textAlign = "center";
  ctx.fillText("✦  LIFESTYLE COLLECTION  ✦", 540, 78);

  ctx.shadowColor = "rgba(120,70,20,0.18)"; ctx.shadowBlur = 55; ctx.shadowOffsetY = 28;
  containImage(ctx, img, 120, 108, 840, 750);
  ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

  ctx.fillStyle = "#F0E2C4"; ctx.fillRect(0, 942, 1080, 138);
  ctx.fillStyle = "#C8A050"; ctx.fillRect(0, 942, 1080, 3);
  ctx.fillStyle = "#5C3010"; ctx.font = "bold 38px Georgia, serif"; ctx.textAlign = "center";
  ctx.fillText("일상을 특별하게", 540, 1000);
  ctx.fillStyle = "#9B7040"; ctx.font = "600 22px Georgia";
  ctx.fillText("Everyday Premium Lifestyle", 540, 1046);

  return c.toDataURL("image/jpeg", 0.92);
}

// ─── Template 4: Minimal Focus ───────────────────────────────────────────────
function renderMinimalFocus(img: HTMLImageElement): string {
  const [c, ctx] = mk();

  ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, 1080, 1080);
  containImage(ctx, img, 40, 40, 1000, 880);

  ctx.fillStyle = "#111"; ctx.font = "700 20px Arial"; ctx.textAlign = "left";
  ctx.fillText("● SNAP", 56, 50);

  const fade = ctx.createLinearGradient(0, 810, 0, 1080);
  fade.addColorStop(0, "transparent"); fade.addColorStop(0.45, "rgba(255,255,255,0.97)");
  ctx.fillStyle = fade; ctx.fillRect(0, 810, 1080, 270);

  ctx.fillStyle = "#111"; ctx.font = "bold 46px Arial"; ctx.textAlign = "center";
  ctx.fillText("FOCUS ON QUALITY", 540, 948);
  ctx.strokeStyle = "#D4D4D4"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(300, 972); ctx.lineTo(780, 972); ctx.stroke();
  ctx.fillStyle = "#888"; ctx.font = "24px Arial";
  ctx.fillText("단 하나의 선택", 540, 1020);

  return c.toDataURL("image/jpeg", 0.92);
}

const RENDERERS = [
  renderStudioWhite,
  renderDarkPremium,
  renderBrandViolet,
  renderWarmLifestyle,
  renderMinimalFocus,
];

export async function generateAllTemplates(
  files: File[],
  onEach: (index: number, dataUrl: string) => void
): Promise<void> {
  const img = await loadImageFromFile(files[0]);
  for (let i = 0; i < RENDERERS.length; i++) {
    await new Promise<void>((resolve) => setTimeout(resolve, 850 + Math.random() * 650));
    onEach(i, RENDERERS[i](img));
  }
}
