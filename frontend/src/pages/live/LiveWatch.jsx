import { Alert, Box } from "@mui/material";

export default function LiveWatch() {
  return (
    <Box sx={{ maxWidth: 720, mx: "auto", mt: 6, px: 2 }}>
      <Alert severity="info">
        Live streaming has been removed. Browse the video catalog to watch processed HLS uploads.
      </Alert>
    </Box>
  );
}
