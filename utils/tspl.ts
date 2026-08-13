// utils/tspl.ts
import { StoreItem } from "@/data/items";

interface QueueItem extends StoreItem {
  quantity: number;
}

const PACKER_REGN = "544/DEL/EAST/HQ/2003";
const STORE_NAME = "MADHAV DEPARTMENTAL STORE";
const ADDRESS_1 = "30-B, WEST VINOD NAGAR, GALI NO-7";
const ADDRESS_2 = "I.P EXTENSION, DELHI-110092";
const CUST_CARE_NO = "011-47158021";
const CUST_CARE_EMAIL = "deepagg1234@gmail.com";

export function generateTSPL(queue: QueueItem[]): any {
  const encoder = new TextEncoder();
  let finalBuffer = new Uint8Array(0);

  // Helper to safely merge byte arrays
  const append = (buffer: Uint8Array) => {
    const temp = new Uint8Array(finalBuffer.length + buffer.length);
    temp.set(finalBuffer, 0);
    temp.set(buffer, finalBuffer.length);
    finalBuffer = temp;
  };

  // 1. Setup Label Dimensions
  append(
    encoder.encode("SIZE 75 mm, 50 mm\r\nGAP 3 mm, 0 mm\r\nDIRECTION 1\r\n"),
  );

  const today = new Date();
  const pkdStr = `${today.getDate().toString().padStart(2, "0")}/${(today.getMonth() + 1).toString().padStart(2, "0")}/${today.getFullYear()}`;

  // 2. Create the Canvas
  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 400;
  const ctx = canvas.getContext("2d");

  if (!ctx) return finalBuffer;

  for (const item of queue) {
    // Clear printer buffer for each new label design
    append(encoder.encode("CLS\r\n"));

    // Fill white background
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Set up text drawing
    ctx.fillStyle = "black";
    ctx.textBaseline = "top";

    const useBy = new Date(today);
    useBy.setMonth(useBy.getMonth() + item.shelfLife);
    const useByStr = `${useBy.getDate().toString().padStart(2, "0")}/${(useBy.getMonth() + 1).toString().padStart(2, "0")}/${useBy.getFullYear()}`;

    const weightStr =
      item.weight >= 1000 ? `${item.weight / 1000}Kg` : `${item.weight}g`;
    const pricePerG = (item.mrp / item.weight).toFixed(2);

    let y = 16;
    const LEFT = 20,
      RIGHT = 20;

    // --- TEXT LAYOUT HELPERS (With your Regex Fix) ---
    const left = (text: string, font: string, spacing = 4) => {
      ctx.font = font;
      ctx.fillText(text, LEFT, y);
      y += parseInt(font.match(/(\d+)px/)![1]) + spacing;
    };

    const centered = (text: string, font: string, spacing = 4) => {
      ctx.font = font;
      ctx.fillText(text, (canvas.width - ctx.measureText(text).width) / 2, y);
      y += parseInt(font.match(/(\d+)px/)![1]) + spacing;
    };

    const twoCols = (
      leftText: string,
      rightText: string,
      font: string,
      spacing = 4,
    ) => {
      ctx.font = font;
      ctx.fillText(leftText, LEFT, y);
      ctx.fillText(
        rightText,
        canvas.width - RIGHT - ctx.measureText(rightText).width,
        y,
      );
      y += parseInt(font.match(/(\d+)px/)![1]) + spacing;
    };

    const FONT_SMALL = "bold 20px sans-serif";
    const FONT_EMAIL = "bold 22px sans-serif";
    const FONT_MED = "bold 24px sans-serif";
    const FONT_BOLD = "bold 28px sans-serif";
    const FONT_TITLE = "900 34px sans-serif";

    // --- DRAW DYNAMIC LABEL DATA ---
    left(`PACKER REGN. NO. - ${PACKER_REGN}`, FONT_MED, 2);
    left("PACKED BY:", FONT_MED, 10);
    centered(STORE_NAME, FONT_TITLE, 14);
    centered(ADDRESS_1, FONT_MED, 4);
    centered(ADDRESS_2, FONT_MED, 4);
    centered(`CUSTOMER CARE NO- ${CUST_CARE_NO}`, FONT_MED, 4);
    centered(`CUSTOMER CARE EMAIL- ${CUST_CARE_EMAIL}`, FONT_EMAIL, 16);

    twoCols(`ITEM: ${item.name}`, `PKD: ${pkdStr}`, FONT_BOLD, 12);
    twoCols(`NET WEIGHT: ${weightStr}`, `USE BY: ${useByStr}`, FONT_BOLD, 12);

    left(`MRP: ₹ ${item.mrp}.00 (Rs. ${pricePerG} per g)`, FONT_BOLD, 4);
    left("(INCL. OF ALL TAXES)", FONT_SMALL, 0);

    // 3. Extract pixels and convert to TSPL Bitmap
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const widthBytes = Math.ceil(canvas.width / 8);
    const bitmapData = new Uint8Array(widthBytes * canvas.height);

    // Fill with 1s (White Background)
    bitmapData.fill(255);

    for (let py = 0; py < canvas.height; py++) {
      for (let px = 0; px < canvas.width; px++) {
        const idx = (py * canvas.width + px) * 4;
        const r = imgData[idx];
        const a = imgData[idx + 3];

        // If the pixel is dark text, clear the bit to 0 (Black)
        if (r < 128 && a > 128) {
          const byteIndex = py * widthBytes + Math.floor(px / 8);
          const bitIndex = 7 - (px % 8);
          bitmapData[byteIndex] &= ~(1 << bitIndex);
        }
      }
    }

    // 4. Append the BITMAP command, the raw data, and print the requested quantity
    append(encoder.encode(`BITMAP 0,0,${widthBytes},${canvas.height},0,`));
    append(bitmapData);
    append(encoder.encode(`\r\nPRINT ${item.quantity},1\r\n`));
  }

  return finalBuffer;
}
