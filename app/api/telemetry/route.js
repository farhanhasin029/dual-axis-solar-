import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

const redis = Redis.fromEnv();

// POST: Receives sensor telemetry from ESP32 every 2 seconds
export async function POST(request) {
  try {
    const body = await request.json();

    const payload = {
      temp: Number(body.temp) || 0,
      hum: Number(body.hum) || 0,
      gas: Number(body.gas) || 0,
      pan: Number(body.pan) ?? 90,
      tilt: Number(body.tilt) ?? 90,
      ldr: Array.isArray(body.ldr) ? body.ldr : [1, 1, 1, 1], // [TL, TR, BL, BR]
      updatedAt: Date.now(),
    };

    await redis.set('solar_tracker:latest', payload);
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }
}

// GET: Serves the latest snapshot to the frontend dashboard
export async function GET() {
  const data = await redis.get('solar_tracker:latest');
  return NextResponse.json(data || { offline: true });
}
