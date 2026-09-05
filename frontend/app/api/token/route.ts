import { NextResponse } from "next/server";
import {
  AccessToken,
  RoomAgentDispatch,
  RoomConfiguration,
} from "livekit-server-sdk";

const API_KEY = process.env.LIVEKIT_API_KEY!;
const API_SECRET = process.env.LIVEKIT_API_SECRET!;
const LIVEKIT_URL = process.env.LIVEKIT_URL!;

export async function POST() {
  const roomName = `buddha-room-${Date.now()}`;
  const agentName = "buddha-agent";
  const identity = `user-${Math.floor(Math.random() * 10_000)}`;

  const at = new AccessToken(API_KEY, API_SECRET, {
    identity,
    ttl: "15m",
  });

  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  at.roomConfig = new RoomConfiguration({
    agents: [new RoomAgentDispatch({ agentName, metadata: JSON.stringify({ identity }) })],
  });

  const token = await at.toJwt();

  return NextResponse.json({
    serverUrl: LIVEKIT_URL,
    participantToken: token,
    participantName: identity,
    roomName,
  });
}
