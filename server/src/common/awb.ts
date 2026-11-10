import { prisma } from "../config/prisma";

function dateCode(d = new Date()): string {
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

export async function nextSequence(name: string): Promise<number> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`INSERT INTO counters (name, value) VALUES (${name}, 0) ON DUPLICATE KEY UPDATE name = name`;
    await tx.$executeRaw`UPDATE counters SET value = LAST_INSERT_ID(value + 1) WHERE name = ${name}`;
    const rows = await tx.$queryRaw<{ id: bigint }[]>`SELECT LAST_INSERT_ID() AS id`;
    return Number(rows[0]?.id ?? 0);
  });
}

export async function generateAwb(): Promise<string> {
  const seq = await nextSequence(`awb:${dateCode()}`);
  return `SLX${dateCode()}${String(seq).padStart(6, "0")}`;
}

export async function generateManifestNumber(): Promise<string> {
  const seq = await nextSequence(`manifest:${dateCode()}`);
  return `MNF${dateCode()}${String(seq).padStart(5, "0")}`;
}

export async function generateTicketNumber(): Promise<string> {
  const seq = await nextSequence(`ticket:${dateCode()}`);
  return `TKT${dateCode()}${String(seq).padStart(5, "0")}`;
}
