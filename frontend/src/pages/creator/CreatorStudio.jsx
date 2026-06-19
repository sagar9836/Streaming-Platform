import { useNavigate } from "react-router-dom";
import { Box, Button, Card, CardContent, Stack, Typography } from "@mui/material";

export default function CreatorStudio() {
  const navigate = useNavigate();

  return (
    <Box sx={{ maxWidth: 820, mx: "auto", mt: 6, px: 2 }}>
      <Card sx={{ borderRadius: 4, bgcolor: "rgba(255,255,255,0.04)", color: "#fff" }}>
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={2.5}>
            <Typography variant="h4" fontWeight={900}>
              Creator video studio
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.72)" }}>
              This platform now focuses on uploaded videos. Upload source files, let the worker process them into HLS, and manage playback through your channel catalog.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <Button variant="contained" onClick={() => navigate("/creator/upload")} sx={{ borderRadius: 999 }}>
                Upload video
              </Button>
              <Button variant="outlined" onClick={() => navigate("/")} sx={{ borderRadius: 999, color: "#fff", borderColor: "rgba(255,255,255,0.24)" }}>
                View catalog
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
