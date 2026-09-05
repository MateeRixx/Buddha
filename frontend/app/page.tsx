"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Room, RoomEvent, Track } from "livekit-client";
import { SiriWave } from "@/components/SiriWave";

export default function Home() {
  const roomRef = useRef<Room | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [status, setStatus] = useState<string>("idle");
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [orbVisible, setOrbVisible] = useState(false);

  useEffect(() => {
    const room = roomRef.current;
    if (!room) return;

    const onTrackSub = (track: import("livekit-client").Track) => {
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

  useEffect(() => {
    if (status === "connected") {
      const timer = setTimeout(() => setOrbVisible(true), 200);
      return () => clearTimeout(timer);
    }
    setOrbVisible(false);
  }, [status]);

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
          width: 180,
          height: 180,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: orbVisible ? 1 : 0,
          transform: orbVisible ? "scale(1)" : "scale(0.85)",
          transition: "opacity 0.6s ease, transform 0.6s ease",
        }}
      >
        <SiriWave variant="fluid-dots" size={180} />
      </div>

      <p style={{ color: "rgba(232,228,218,0.5)", fontSize: 14 }}>
        {status}
      </p>

      <div style={{ display: "flex", gap: 16 }}>
        <button
          onClick={connect}
          disabled={status === "connected" || status.startsWith("connecting")}
          className="animated-button"
        >
          <span className="label">Connect</span>
          <span className="ripple" />
        </button>

        <button
          onClick={disconnect}
          disabled={status !== "connected"}
          className="animated-button"
        >
          <span className="label">Disconnect</span>
          <span className="ripple" />
        </button>
      </div>
    </div>
  );
}