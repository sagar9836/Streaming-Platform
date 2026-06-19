# ffmpeg_service/consumer.py

import asyncio
import json
import logging

from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import update

import redis.asyncio as redis

from config import settings
from models import Video, VideoStatus
from processor import process_video_pipeline

# 🔥 EXISTING EVENTS
VIDEO_PROCESSING_STARTED = "video.processing.started"
VIDEO_READY = "video.ready"
VIDEO_FAILED = "video.failed"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ffmpeg-worker")

redis_client = redis.from_url(settings.redis_url, decode_responses=True)

engine = create_async_engine(settings.database_url, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

producer = None


# ---------------- PRODUCER ----------------
async def get_producer():
    global producer
    if producer:
        return producer

    producer = AIOKafkaProducer(
        bootstrap_servers=settings.kafka_bootstrap_servers,
        value_serializer=lambda v: json.dumps(v).encode(),
    )
    await producer.start()
    return producer


# ---------------- DB UPDATE ----------------
async def update_status(video_id, status, thumbnail=None):
    async with AsyncSessionLocal() as session:
        values = {"status": status.value}
        if thumbnail:
            values["thumbnail_key"] = thumbnail

        await session.execute(
            update(Video).where(Video.id == video_id).values(**values)
        )
        await session.commit()


# ---------------- REDIS ----------------
async def set_redis(video_id, status, error=None):
    await redis_client.set(f"video:{video_id}:status", status, ex=3600)
    if error:
        await redis_client.set(f"video:{video_id}:error", error[:300], ex=3600)


# ---------------- CONSUMER ----------------
async def consume():
    consumer = AIOKafkaConsumer(
        VIDEO_PROCESSING_STARTED,
        bootstrap_servers=settings.kafka_bootstrap_servers,
        group_id="ffmpeg-worker",
        enable_auto_commit=False,
        max_poll_records=1,
        max_poll_interval_ms=settings.kafka_max_poll_interval_ms,
        session_timeout_ms=settings.kafka_session_timeout_ms,
        heartbeat_interval_ms=settings.kafka_heartbeat_interval_ms,
        value_deserializer=lambda v: json.loads(v.decode()),
    )

    await consumer.start()
    logger.info(
        "🚀 FFmpeg consumer started | max_poll_interval_ms=%s session_timeout_ms=%s heartbeat_interval_ms=%s",
        settings.kafka_max_poll_interval_ms,
        settings.kafka_session_timeout_ms,
        settings.kafka_heartbeat_interval_ms,
    )

    producer = await get_producer()

    try:
        async for msg in consumer:
            data = msg.value

            # =========================
            # 📦 VOD PROCESSING
            # =========================
            video_id = data["video_id"]
            s3_key = data["s3_key"]
            creator_id = data.get("creator_id")

            logger.info(f"📩 VOD job | video_id={video_id}")

            try:
                thumbnail_key = await process_video_pipeline(video_id, s3_key)

                await update_status(video_id, VideoStatus.READY, thumbnail_key)
                await set_redis(video_id, "READY")

                await producer.send_and_wait(
                    VIDEO_READY,
                    {
                        "video_id": video_id,
                        "creator_id": creator_id,
                    },
                )

                logger.info(f"✅ Video READY | id={video_id}")

                await consumer.commit()

            except Exception as e:
                logger.exception(f"❌ Processing failed | video_id={video_id}")

                await update_status(video_id, VideoStatus.FAILED)
                await set_redis(video_id, "FAILED", str(e))

                await producer.send_and_wait(
                    VIDEO_FAILED,
                    {
                        "video_id": video_id,
                        "creator_id": creator_id,
                    },
                )

                await consumer.commit()

    finally:
        await consumer.stop()


if __name__ == "__main__":
    asyncio.run(consume())
