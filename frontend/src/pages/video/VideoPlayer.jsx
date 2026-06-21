import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Hls from "hls.js";

import { fetchVideoPageGraphql } from "../../api/graphql.api";
import CommentsSection from "../../components/common/CommentsSection";

import {
  registerView,
  registerWatch,
  likeVideo,
  getVideoStats,
} from "../../api/analytics.api";

import {
  subscribeCreator,
  unSubscribe,
} from "../../api/subscription.api";

import { useAuth } from "../../auth/AuthContext";

import {
  Box,
  Typography,
  Avatar,
  Button,
  Chip,
  Stack,
  Divider,
  CircularProgress,
  Alert,
} from "@mui/material";

import ThumbUpOutlinedIcon from "@mui/icons-material/ThumbUpOutlined";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";

export default function VideoPlayer() {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const videoRef = useRef(null);
  const watchStartRef = useRef(null);

  const [videoUrl, setVideoUrl] = useState(null);
  const [video, setVideo] = useState(null);
  const [creator, setCreator] = useState(null);

  const [stats, setStats] = useState({
    views: 0,
    likes: 0,
    liked: false,
  });

  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [playerError, setPlayerError] = useState("");
  const [isBuffering, setIsBuffering] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [subLoading, setSubLoading] = useState(false);

  useEffect(() => {
    if (videoId) {
      registerView(videoId).catch(() => {});
    }
  }, [videoId]);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !videoUrl) return undefined;

    setPlayerError("");
    setIsBuffering(true);

    const handleLoaded = () => setIsBuffering(false);
    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => setIsBuffering(false);
    const handleVideoError = () => {
      setIsBuffering(false);
      setPlayerError("Video playback failed. Please refresh and try again.");
    };

    videoEl.addEventListener("loadeddata", handleLoaded);
    videoEl.addEventListener("canplay", handleLoaded);
    videoEl.addEventListener("waiting", handleWaiting);
    videoEl.addEventListener("playing", handlePlaying);
    videoEl.addEventListener("error", handleVideoError);

    let hls;

    if (videoEl.canPlayType("application/vnd.apple.mpegurl")) {
      videoEl.src = videoUrl;
    } else if (Hls.isSupported()) {
      hls = new Hls({
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: 60,
        maxMaxBufferLength: 120,
      });
      hls.loadSource(videoUrl);
      hls.attachMedia(videoEl);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsBuffering(false);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data?.fatal) return;

        setIsBuffering(false);

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          setPlayerError("Video network error. Retrying...");
          hls.startLoad();
          return;
        }

        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          setPlayerError("Video media error. Recovering...");
          hls.recoverMediaError();
          return;
        }

        setPlayerError("This video cannot be played in this browser.");
        hls.destroy();
      });
    } else {
      setPlayerError("This browser does not support HLS playback.");
      videoEl.src = videoUrl;
    }

    return () => {
      videoEl.pause();
      videoEl.removeEventListener("loadeddata", handleLoaded);
      videoEl.removeEventListener("canplay", handleLoaded);
      videoEl.removeEventListener("waiting", handleWaiting);
      videoEl.removeEventListener("playing", handlePlaying);
      videoEl.removeEventListener("error", handleVideoError);
      videoEl.removeAttribute("src");
      videoEl.load();
      if (hls) hls.destroy();
    };
  }, [videoUrl]);

  const loadVideoPage = useCallback(async () => {
    const data = await fetchVideoPageGraphql(videoId);

    setVideoUrl(data?.playback?.hlsUrl || null);
    setVideo({
      id: data.id,
      title: data.title,
      description: data.description,
      creator: data.creator,
    });
    setCreator(data.creator || null);
    setStats({
      views: data?.stats?.views ?? 0,
      likes: data?.stats?.likes ?? 0,
      liked: data?.stats?.liked ?? false,
    });
    setSubscribed(Boolean(data?.isSubscribed));
  }, [videoId]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        await loadVideoPage();
      } catch (err) {
        console.error("Failed to load video", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [videoId, user, loadVideoPage]);

  const handlePlay = () => {
    watchStartRef.current = Date.now();
  };

  const handlePauseOrEnd = () => {
    if (!watchStartRef.current) return;

    const seconds = (Date.now() - watchStartRef.current) / 1000;

    if (seconds >= 5) {
      registerWatch(videoId).catch(() => {});
    }

    watchStartRef.current = null;
  };

  const handleLike = async () => {
    if (!user || stats.liked || likeLoading) return;

    try {
      setLikeLoading(true);
      await likeVideo(videoId);
      const updated = await getVideoStats(videoId);
      setStats((prev) => ({
        ...prev,
        views: updated.views,
        likes: updated.likes,
        liked: true,
      }));
    } finally {
      setLikeLoading(false);
    }
  };

  const toggleSubscribe = async () => {
    if (!user || !creator || subLoading) return;

    try {
      setSubLoading(true);

      if (subscribed) {
        await unSubscribe(creator.id);
        setSubscribed(false);
      } else {
        await subscribeCreator(creator.id);
        setSubscribed(true);
      }
    } finally {
      setSubLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!videoUrl) {
    return (
      <Typography align="center" sx={{ mt: 6 }}>
        Video not available
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        maxWidth: 1180,
        mx: "auto",
        mt: 3,
        px: 2,
        pb: 5,
      }}
    >
      <Box
        sx={{
          position: "relative",
          backgroundColor: "#000",
          borderRadius: 4,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.36)",
        }}
      >
        <video
          ref={videoRef}
          controls
          playsInline
          preload="metadata"
          crossOrigin="anonymous"
          width="100%"
          style={{ display: "block", backgroundColor: "#000" }}
          onPlay={handlePlay}
          onPause={handlePauseOrEnd}
          onEnded={handlePauseOrEnd}
        />

        {isBuffering && !playerError && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
              background: "rgba(0,0,0,0.28)",
            }}
          >
            <CircularProgress sx={{ color: "#fff" }} />
          </Box>
        )}
      </Box>

      {playerError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {playerError}
        </Alert>
      )}

      <Typography variant="h4" fontWeight="bold" mt={2.5} sx={{ letterSpacing: "-0.03em" }}>
        {video?.title}
      </Typography>

      <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
        <Chip
          label={`${stats.views} views`}
          sx={{ bgcolor: "rgba(255,255,255,0.06)", color: "#fff" }}
        />
        <Chip
          label={creator?.channelName || "Creator channel"}
          sx={{ bgcolor: "rgba(255,255,255,0.06)", color: "#fff" }}
        />
      </Stack>

      {creator && (
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          mt={2.5}
          spacing={2}
          sx={{
            p: 2.5,
            borderRadius: 4,
            bgcolor: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar sx={{ bgcolor: "#2a1a1b", color: "#f5b95a", fontWeight: 800 }}>
              {creator.channelName?.[0]?.toUpperCase() || "C"}
            </Avatar>

            <Box sx={{ cursor: "pointer" }} onClick={() => navigate(`/channel/${creator.id}`)}>
              <Typography fontWeight="bold" sx={{ fontSize: 18 }}>
                {creator.channelName}
              </Typography>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.56)" }}>
                {creator.subscribersCount ?? 0} subscribers
              </Typography>
            </Box>

            {user && (
              <Button
                variant={subscribed ? "outlined" : "contained"}
                color="error"
                onClick={toggleSubscribe}
                disabled={subLoading}
                sx={{
                  borderRadius: 999,
                  px: 2.2,
                  bgcolor: subscribed ? "transparent" : "#fff",
                  color: subscribed ? "#fff" : "#111",
                  borderColor: "rgba(255,255,255,0.22)",
                }}
              >
                {subscribed ? "Subscribed" : "Subscribe"}
              </Button>
            )}
          </Stack>

          <Stack direction="row" spacing={1}>
            <Button
              startIcon={<ThumbUpOutlinedIcon />}
              onClick={handleLike}
              disabled={!user || stats.liked || likeLoading}
              sx={{
                borderRadius: 999,
                bgcolor: "rgba(255,255,255,0.06)",
                color: "#fff",
                px: 2,
              }}
            >
              {stats.likes}
            </Button>

            <Button
              startIcon={<ShareOutlinedIcon />}
              sx={{
                borderRadius: 999,
                bgcolor: "rgba(255,255,255,0.06)",
                color: "#fff",
                px: 2,
              }}
            >
              Share
            </Button>
          </Stack>
        </Stack>
      )}

      <Divider sx={{ my: 3, borderColor: "rgba(255,255,255,0.08)" }} />

      <Box
        sx={{
          p: 2.5,
          borderRadius: 4,
          bgcolor: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <Typography sx={{ color: "rgba(255,255,255,0.8)", lineHeight: 1.7 }}>
          {video?.description || "No description available."}
        </Typography>
      </Box>

      <Divider sx={{ my: 3, borderColor: "rgba(255,255,255,0.08)" }} />

      <CommentsSection videoId={videoId} />
    </Box>
  );
}
