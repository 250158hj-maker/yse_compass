import { NextResponse } from "next/server";
import { Pool } from "pg";

export async function GET() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    await pool.query("SELECT 1");
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: (error as Error).message },
      { status: 500 },
    );
  } finally {
    await pool.end();
  }
}
