"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Room, RoomEvent, Track } from "livekit-client";

export default function Home() {
  const roomRef = useRef<Room | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [status, setStatus] = useState("idle");
  const [agentSpeaking, setAgentSpeaking] = useState(false);

  useEffect(() => {
    const room = roomRef.current;
    if (!room) return;

    const onTrackSub = (
      track: import("livekit-client").Track,
    ) => {
      if (track.kind === Track.Kind.Audio && audioRef.current) {
        track.attach(audioRef.current);
      }
    };

    const onSpeakers = (speakers: import("livekit-client").Participant[]) => {
      const localId = room.localParticipant?.identity;
      setAgentSpeaking(speakers.some((s) => s.identity !== localId));
    };

    room.on(RoomEvent.TrackSubscribed, onTrackSub);
    room.on(RoomEvent.ActiveSpeakersChanged, onSpeakers);

    return () => {
      room.off(RoomEvent.TrackSubscribed, onTrackSub);
      room.off(RoomEvent.ActiveSpeakersChanged, onSpeakers);
    };
  }, []);

  const connect = useCallback(async () => {
    setStatus("requesting mic...");
    try {
      const res = await fetch("/api/token", { method: "POST" });
      const { serverUrl, participantToken } = await res.json();

      setStatus("connecting...");
      const room = new Room({ adaptiveStream: true, dynacast: true });

      room.on(RoomEvent.Connected, () => setStatus("connected"));
      room.on(RoomEvent.Disconnected, () => {
        setStatus("disconnected");
        setAgentSpeaking(false);
      });

      await room.connect(serverUrl, participantToken);
      await room.localParticipant.setMicrophoneEnabled(true);

      // attach any tracks already published before we connected
      room.remoteParticipants.forEach((p) => {
        p.getTrackPublications().forEach((pub) => {
          if (pub.track && pub.kind === Track.Kind.Audio && audioRef.current) {
            pub.track.attach(audioRef.current);
          }
        });
      });

      roomRef.current = room;
    } catch (err) {
      setStatus("error: " + (err as Error).message);
    }
  }, []);

  const disconnect = useCallback(() => {
    roomRef.current?.disconnect();
    roomRef.current = null;
    setStatus("disconnected");
    setAgentSpeaking(false);
  }, []);

  useEffect(() => {
    return () => {
      roomRef.current?.disconnect();
      roomRef.current = null;
    };
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        gap: 32,
      }}
    >
      <audio ref={audioRef} autoPlay />

      <h1
        style={{
          fontSize: 48,
          fontWeight: 300,
          letterSpacing: "0.08em",
          color: "#e8e4da",
        }}
      >
        Buddha
      </h1>

      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: "50%",
          background: agentSpeaking
            ? "radial-gradient(circle, #fff 0%, #a0dcb4 40%, transparent 70%)"
            : status === "connected"
            ? "radial-gradient(circle, #7fb98a 0%, rgba(127,185,138,0.3) 40%, transparent 70%)"
            : "radial-gradient(circle, rgba(127,185,138,0.2) 0%, transparent 60%)",
          transition: "all 0.3s",
          boxShadow: agentSpeaking
            ? "0 0 60px rgba(255,255,255,0.3)"
            : "0 0 40px rgba(127,185,138,0.15)",
        }}
      />

      <p style={{ color: "rgba(232,228,218,0.5)", fontSize: 14 }}>
        {status}
      </p>

      <div style={{ display: "flex", gap: 16 }}>
        <button
          onClick={connect}
          disabled={status === "connected" || status.startsWith("connecting")}
          style={{
            padding: "12px 32px",
            background: "transparent",
            border: "1px solid #7fb98a",
            color: "#7fb98a",
            cursor: "pointer",
            fontSize: 14,
            letterSpacing: "0.1em",
            textTransform: "uppercase" as const,
          }}
        >
          Connect
        </button>

        <button
          onClick={disconnect}
          disabled={status !== "connected"}
          style={{
            padding: "12px 32px",
            background: "transparent",
            border: "1px solid rgba(232,228,218,0.3)",
            color: "rgba(232,228,218,0.5)",
            cursor: "pointer",
            fontSize: 14,
            letterSpacing: "0.1em",
            textTransform: "uppercase" as const,
          }}
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}
