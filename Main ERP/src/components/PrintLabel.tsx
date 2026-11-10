import { useState } from "react";
import { Printer } from "lucide-react";
import { formatCurrency, formatDateTime } from "../lib/format";
import type { ShipmentDetail } from "../api/types";
import { Button } from "./ui/Button";

export function PrintLabel({ shipment, compact = false }: { shipment: ShipmentDetail; compact?: boolean }) {
  const [printing, setPrinting] = useState(false);

  const print = () => {
    setPrinting(true);
    try {
      const win = window.open("", "_blank", "width=460,height=680");
      if (!win) return;
      const html = `<!doctype html>
<html><head><title>Label ${shipment.awbNumber}</title>
<style>
  @page { size: 4in 6in; margin: 0.18in; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; color: #0B1220; width: 3.64in; }
  .hdr { display:flex; justify-content:space-between; align-items:flex-end; border-bottom: 2px solid #0B1220; padding-bottom: 4px; }
  .brand { font-size: 13px; font-weight: 700; letter-spacing: 0.08em; }
  .svc { font-size: 10px; font-weight: 700; border: 1px solid #0B1220; padding: 1px 6px; border-radius: 3px; }
  .awb { font-size: 20px; font-weight: 800; letter-spacing: 0.04em; margin: 6px 0 2px; }
  .meta { font-size: 9px; color: #334155; }
  .sec { border: 1px solid #0B1220; margin-top: 6px; padding: 5px 6px; }
  .sec h4 { font-size: 8px; letter-spacing: 0.12em; text-transform: uppercase; color: #64748b; margin-bottom: 2px; }
  .name { font-size: 12px; font-weight: 700; }
  .line { font-size: 10px; line-height: 1.35; }
  .grid { display:flex; gap: 6px; }
  .grid > div { flex: 1; }
  .barcode { margin-top: 8px; text-align: center; font-size: 22px; font-weight: 800; letter-spacing: 0.18em; border-top: 1px dashed #0B1220; border-bottom: 1px dashed #0B1220; padding: 4px 0; }
  .cod { margin-top: 6px; border: 2px solid #0B1220; padding: 3px 6px; font-size: 12px; font-weight: 800; text-align: center; }
  .foot { margin-top: 6px; font-size: 8px; color: #64748b; display:flex; justify-content:space-between; }
</style></head><body>
  <div class="hdr"><div class="brand">SWIFTLOGIX</div><div class="svc">${shipment.serviceType}</div></div>
  <div class="awb">${shipment.awbNumber}</div>
  <div class="meta">Booked ${formatDateTime(shipment.createdAt)} &nbsp;|&nbsp; ${shipment.parcel.category} &nbsp;|&nbsp; ${shipment.parcel.chargeableWeight} kg</div>
  <div class="grid">
    <div class="sec"><h4>From</h4>
      <div class="name">${shipment.sender.name}</div>
      <div class="line">${shipment.sender.address}</div>
      <div class="line">${shipment.sender.city} ${shipment.sender.pincode}</div>
      <div class="line">${shipment.sender.phone}</div>
    </div>
    <div class="sec"><h4>Ship To</h4>
      <div class="name">${shipment.receiver.name}</div>
      <div class="line">${shipment.receiver.address}</div>
      <div class="line">${shipment.receiver.city} ${shipment.receiver.pincode}</div>
      <div class="line">${shipment.receiver.phone}</div>
    </div>
  </div>
  ${compact ? "" : `<div class="sec"><h4>Route</h4><div class="line">${shipment.originLocation?.name ?? "-"} &rarr; ${shipment.destLocation?.name ?? "-"}</div></div>`}
  <div class="cod">${shipment.parcel.codAmount > 0 ? `COLLECT CASH ${formatCurrency(shipment.parcel.codAmount)}` : `PREPAID ${formatCurrency(shipment.charges.total)}`}</div>
  <div class="barcode">${shipment.awbNumber}</div>
  <div class="foot"><span>SwiftLogix Logistics</span><span>${formatDateTime(new Date())}</span></div>
</body></html>`;
      win.document.write(html);
      win.document.close();
      win.focus();
      win.print();
      win.close();
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Button variant="secondary" size="sm" onClick={print} loading={printing} icon={<Printer className="h-3.5 w-3.5" />}>
      Print label
    </Button>
  );
}
