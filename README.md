# Video Streaming Platform

A VOD-focused video streaming platform: creators upload source videos, the backend stores raw uploads in S3, the FFmpeg worker converts them into HLS, and viewers play the processed stream through CloudFront.

## Features

- JWT authentication and email verification
- creator onboarding and channel setup
- direct browser upload to S3 with backend fallback
- Kafka-driven FFmpeg processing pipeline
- HLS output, thumbnails, and CloudFront playback
- public/private video visibility
- subscriptions, comments, analytics, notifications, and admin tools

## Stack

### Backend

- FastAPI app: `backend/app/main.py`
- async SQLAlchemy + PostgreSQL
- Redis for short-lived processing status and counters
- Kafka for upload/processing events
- FFmpeg worker: `backend/ffmpeg_service/consumer.py`
- S3/CloudFront helpers: `backend/app/utils/s3.py`, `backend/app/services/video_assets.py`

### Frontend

- React + Vite app: `frontend/src/app/App.jsx`
- creator upload page: `frontend/src/pages/creator/VideoUpload.jsx`
- public video player: `frontend/src/pages/video/VideoPlayer.jsx`
- channel pages, subscriptions, comments, admin pages

### Infrastructure

- Docker Compose stack: `docker-compose.yml`
- Services: `frontend`, `api`, `ffmpeg`, `postgres`, `redis`, `zookeeper`, `kafka`

LiveKit, LiveKit egress, live recording, premieres, and guest preview limits are not part of the active app path.

## VOD Flow

1. Creator opens `/creator/upload`.
2. Frontend calls `POST /videos/upload` to create a video row and receive a presigned S3 upload URL.
3. Browser uploads the file directly to S3.
4. Frontend calls `POST /videos/{video_id}/complete`.
5. API verifies the raw S3 object and publishes `video.processing.started` to Kafka.
6. FFmpeg worker downloads the raw source, creates a thumbnail, transcodes to HLS, and uploads outputs to S3.
7. Worker marks the video `READY` and emits `video.ready`.
8. Public pages use GraphQL to receive the CloudFront HLS URL.
9. Browser plays HLS through `hls.js`.

## Run The Stack

From the project root:

```bash
docker compose up -d --build
```

Main URLs:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- Health check: `http://localhost:8000/health`

Useful logs:

```bash
docker compose logs -f api
docker compose logs -f ffmpeg
docker compose logs -f frontend
```

## Required Environment

Set these in `.env` for local or deployed runtime:

- `DATABASE_URL`
- `JWT_SECRET`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `S3_BUCKET`
- `CLOUDFRONT_DOMAIN`
- `CORS_ORIGINS`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USERNAME`
- `SMTP_PASSWORD`
- `EMAIL_FROM`

For deployed frontend builds, also set:

- `VITE_API_BASE_URL`

## AWS Requirements

The IAM principal used by the API/worker needs permissions for the configured bucket:

- `s3:PutObject`
- `s3:GetObject`
- `s3:HeadObject`
- `s3:DeleteObject`
- `s3:ListBucket`

The S3 bucket CORS configuration must allow the frontend origin and `PUT`, `GET`, `HEAD`. CloudFront must be able to read `videos/hls/` and `videos/thumbnails/` objects and return CORS headers for browser playback.

## Playback Notes

The player uses `hls.js` for browsers that do not natively support HLS. The generated FFmpeg output is browser-oriented: H.264 video, AAC audio, yuv420p pixel format, VOD playlist, and independent HLS segments.

## Troubleshooting

If upload completes but playback is unavailable:

1. Check DB status for the video: it should be `READY`.
2. Confirm S3 contains `videos/hls/{video_id}/master.m3u8` and `.ts` segments.
3. Confirm CloudFront returns `200` for the manifest and segments.
4. Confirm CloudFront responses include `Access-Control-Allow-Origin` for the frontend origin.
5. Check `docker compose logs -f ffmpeg` for transcode/upload failures.

If upload verification fails with S3 access denied, rotate the AWS key and remove any explicit deny or quarantine policy from the IAM user.
