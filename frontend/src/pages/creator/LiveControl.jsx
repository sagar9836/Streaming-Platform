import { Alert, Box } from "@mui/material";

export default function LiveControl() {
  return (
    <Box sx={{ maxWidth: 720, mx: "auto", mt: 6, px: 2 }}>
      <Alert severity="info">
        Live streaming has been removed. This platform now focuses on uploaded videos processed into HLS for playback.
      </Alert>
    </Box>
  );
}
