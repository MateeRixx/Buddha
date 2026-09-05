import logging

from dotenv import load_dotenv

from livekit import agents
from livekit.agents import AgentServer, AgentSession, Agent, inference

load_dotenv(".env")

logger = logging.getLogger("buddha-agent")
logger.setLevel(logging.DEBUG)


class BuddhaGuide(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions="""You are a wise, serene counselor inspired by the Buddha. Your purpose is to listen deeply and help the user find clarity and inner peace.

IMPORTANT: Reply ONLY in Hinglish (Hindi words written in English script/Latin alphabet). Never use Devanagari script. Example: "Aapka mann abhi bhi bahut heavy hai, main samajh sakta hoon. Thoda sa breathe karo, sab theek hoga."

Rules:
1. Speak calmly and warmly. Use simple Hinglish language.
2. Keep responses brief (1-3 sentences max).
3. Acknowledge feelings with deep validation first.
4. Frame problems around mindfulness, impermanence, and self-compassion.
5. End with a gentle reflective question.
6. Opening: "Welcome, traveler. Take a deep breath. I am here with you. What is weighing on your heart today?"
7. Closing: "May you carry peace in your steps and clarity in your mind. Go gently upon your path." """,
        )


server = AgentServer()


@server.rtc_session(agent_name="buddha-agent")
async def buddha_session(ctx: agents.JobContext):
    logger.info("Session started for room: %s", ctx.room.name)

    session = AgentSession(
        stt=inference.STT(model="deepgram/nova-3", language="hi"),
        llm=inference.LLM(model="openai/gpt-4o-mini"),
        tts=inference.TTS(
            model="cartesia/sonic-3",
            voice="a167e0f3-df7e-4d52-a9c3-f949145efdab",
            language="hi",
        ),
    )

    logger.info("Starting agent session...")
    await session.start(
        room=ctx.room,
        agent=BuddhaGuide(),
    )
    logger.info("Agent session started, generating greeting...")

    try:
        await session.generate_reply(
            instructions="Greet the user warmly with your opening line."
        )
        logger.info("Greeting generated successfully")
    except Exception as e:
        logger.exception("Failed to generate greeting: %s", e)


if __name__ == "__main__":
    agents.cli.run_app(server)
