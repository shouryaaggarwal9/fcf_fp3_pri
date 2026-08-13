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

export function generateTSPL(queue: QueueItem[]): Uint8Array {
  const encoder = new TextEncoder();
  let tspl = "SIZE 75 mm, 50 mm\r\n";
  tspl += "GAP 3 mm, 0 mm\r\n";
  tspl += "DIRECTION 1\r\n";
  tspl += "CODEPAGE UTF-8\r\n";

  const today = new Date();
  const pkdStr = `${today.getDate().toString().padStart(2, "0")}/${(today.getMonth() + 1).toString().padStart(2, "0")}/${today.getFullYear()}`;

  for (const item of queue) {
    const useBy = new Date(today);
    useBy.setMonth(useBy.getMonth() + item.shelfLife);
    const useByStr = `${useBy.getDate().toString().padStart(2, "0")}/${(useBy.getMonth() + 1).toString().padStart(2, "0")}/${useBy.getFullYear()}`;

    const weightStr =
      item.weight >= 1000 ? `${item.weight / 1000}Kg` : `${item.weight}g`;
    const pricePerG = (item.mrp / item.weight).toFixed(2);

    tspl += "CLS\r\n";

    tspl += `TEXT 20,20,"2",0,1,1,"PACKER REGN. NO. - ${PACKER_REGN}"\r\n`;
    tspl += `TEXT 20,50,"2",0,1,1,"PACKED BY:"\r\n`;
    tspl += `TEXT 20,80,"4",0,1,1,"${STORE_NAME}"\r\n`;
    tspl += `TEXT 20,120,"2",0,1,1,"${ADDRESS_1}"\r\n`;
    tspl += `TEXT 20,150,"2",0,1,1,"${ADDRESS_2}"\r\n`;
    tspl += `TEXT 20,180,"2",0,1,1,"CUSTOMER CARE NO- ${CUST_CARE_NO}"\r\n`;
    tspl += `TEXT 20,210,"2",0,1,1,"CUSTOMER CARE EMAIL- ${CUST_CARE_EMAIL}"\r\n`;

    tspl += `TEXT 20,260,"3",0,1,1,"ITEM: ${item.name}"\r\n`;
    tspl += `TEXT 350,260,"3",0,1,1,"PKD: ${pkdStr}"\r\n`;
    tspl += `TEXT 20,300,"3",0,1,1,"NET WEIGHT: ${weightStr}"\r\n`;
    tspl += `TEXT 350,300,"3",0,1,1,"USE BY: ${useByStr}"\r\n`;
    tspl += `TEXT 20,340,"3",0,1,1,"MRP: Rs. ${item.mrp}.00 (Rs. ${pricePerG} per g)"\r\n`;
    tspl += `TEXT 20,370,"2",0,1,1,"(INCL. OF ALL TAXES)"\r\n`;
    tspl += `PRINT ${item.quantity},1\r\n`;
  }

  return encoder.encode(tspl);
}
