"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Room, RoomEvent, Track } from "livekit-client";
import { SiriWave } from "@/components/SiriWave";

const BG_MUSIC_URL = "https://res.cloudinary.com/dujqqwfym/video/upload/v1788619810/bgmusic_lwsieq.mp3";
const BG_MUSIC_URL_2 = "https://res.cloudinary.com/dujqqwfym/video/upload/v1788619809/music_lcxywy.mp3";
const BG_VIDEO_URL = "https://res.cloudinary.com/dujqqwfym/video/upload/v1788619270/sakura-tree-lake-neverness-to-everness-moewalls-com_tcdxou.mp4";

export default function Home() {
  const roomRef = useRef<Room | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const bgMusicRef = useRef<HTMLAudioElement>(null);
  const bgMusicRef2 = useRef<HTMLAudioElement>(null);
  const [status, setStatus] = useState<string>("idle");
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [orbVisible, setOrbVisible] = useState(false);
  const [musicOn, setMusicOn] = useState(true);

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

  useEffect(() => {
    if (bgMusicRef.current) {
      bgMusicRef.current.volume = 0.12;
      if (musicOn) {
        bgMusicRef.current.play().catch(() => {});
      } else {
        bgMusicRef.current.pause();
      }
    }
    if (bgMusicRef2.current) {
      bgMusicRef2.current.volume = 0.1;
      if (musicOn) {
        bgMusicRef2.current.play().catch(() => {});
      } else {
        bgMusicRef2.current.pause();
      }
    }
  }, [musicOn]);

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

  const toggleMusic = () => setMusicOn((m) => !m);

  return (
    <>
      <video
        autoPlay
        loop
        muted
        playsInline
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: -2,
        }}
        src={BG_VIDEO_URL}
      />
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(0,0,0,0.1)",
          zIndex: -1,
        }}
      />
      <audio
        ref={bgMusicRef2}
        src={BG_MUSIC_URL_2}
        loop
        autoPlay
      />
      <audio
        ref={bgMusicRef}
        src={BG_MUSIC_URL}
        loop
        autoPlay
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          gap: 32,
          position: "relative",
          zIndex: 1,
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

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
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

          <button
            onClick={toggleMusic}
            className="animated-button"
            style={{ padding: "12px", minWidth: "56px" }}
            aria-label={musicOn ? "Mute background music" : "Unmute background music"}
          >
            <span className="label" style={{ fontSize: 18 }}>
              {musicOn ? "🔊" : "🔇"}
            </span>
            <span className="ripple" />
          </button>
        </div>
      </div>
    </>
  );
}