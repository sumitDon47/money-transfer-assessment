import React from "react";
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  InputAdornment,
  Divider,
  Stack,
} from "@mui/material";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import KeyRoundedIcon from "@mui/icons-material/KeyRounded";
import { requestOtp, verifyOtp } from "../api/auth";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

export default function LoginOtp() {
  const [step, setStep] = React.useState("EMAIL"); // EMAIL | OTP | DONE
  const [email, setEmail] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState({ type: "", text: "" });

  const showMsg = (type, text) => setMsg({ type, text });

  const onRequestOtp = async () => {
    const e = email.trim();
    if (!isValidEmail(e)) return showMsg("error", "Enter a valid email address.");

    setLoading(true);
    setMsg({ type: "", text: "" });

    try {
      const data = await requestOtp(e);
      showMsg("success", data?.message || "OTP sent. Check server console (test mode).");
      setStep("OTP");
    } catch (err) {
      const text =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to request OTP";
      showMsg("error", text);
    } finally {
      setLoading(false);
    }
  };

  const onVerifyOtp = async () => {
    const e = email.trim();
    const code = otp.trim();

    if (!isValidEmail(e)) return showMsg("error", "Email is invalid.");
    if (!/^\d{6}$/.test(code)) return showMsg("error", "OTP must be 6 digits.");

    setLoading(true);
    setMsg({ type: "", text: "" });

    try {
      const data = await verifyOtp(e, code);
      if (!data?.token) {
        return showMsg("error", "No token returned by server.");
      }
      localStorage.setItem("token", data.token);
      showMsg("success", "Login successful. Token saved.");
      setStep("DONE");
    } catch (err) {
      const text =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to verify OTP";
      showMsg("error", text);
    } finally {
      setLoading(false);
    }
  };

  const onLogout = () => {
    localStorage.removeItem("token");
    setOtp("");
    showMsg("success", "Logged out.");
    setStep("EMAIL");
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background:
          "radial-gradient(1200px 600px at 20% 10%, rgba(25,118,210,0.18), transparent 55%), radial-gradient(900px 500px at 80% 30%, rgba(156,39,176,0.14), transparent 60%), linear-gradient(180deg, #0b1220 0%, #070b14 100%)",
        p: 2,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={10}
          sx={{
            p: { xs: 3, sm: 4 },
            borderRadius: 3,
            bgcolor: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            color: "white",
            backdropFilter: "blur(10px)",
          }}
        >
          <Stack spacing={2.5}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  display: "grid",
                  placeItems: "center",
                  bgcolor: "rgba(255,255,255,0.10)",
                  border: "1px solid rgba(255,255,255,0.14)",
                }}
              >
                <LockRoundedIcon />
              </Box>

              <Box>
                <Typography variant="h5" fontWeight={800} lineHeight={1.1}>
                  Money Transfer
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  OTP Login (Email)
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ borderColor: "rgba(255,255,255,0.14)" }} />

            {msg.text ? (
              <Alert
                severity={msg.type === "error" ? "error" : "success"}
                variant="filled"
                sx={{ borderRadius: 2 }}
              >
                {msg.text}
              </Alert>
            ) : null}

            <TextField
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading || step === "DONE"}
              fullWidth
              autoComplete="email"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailRoundedIcon />
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiInputBase-root": { bgcolor: "rgba(255,255,255,0.06)" },
              }}
            />

            {step !== "EMAIL" ? (
              <TextField
                label="OTP (6 digits)"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                disabled={loading || step === "DONE"}
                fullWidth
                inputProps={{ inputMode: "numeric", pattern: "[0-9]*", maxLength: 6 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <KeyRoundedIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiInputBase-root": { bgcolor: "rgba(255,255,255,0.06)" },
                }}
              />
            ) : null}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              {step === "EMAIL" ? (
                <Button
                  size="large"
                  variant="contained"
                  onClick={onRequestOtp}
                  disabled={loading}
                  fullWidth
                >
                  {loading ? <CircularProgress size={22} /> : "Request OTP"}
                </Button>
              ) : null}

              {step === "OTP" ? (
                <>
                  <Button
                    size="large"
                    variant="outlined"
                    onClick={() => setStep("EMAIL")}
                    disabled={loading}
                    fullWidth
                    sx={{ borderColor: "rgba(255,255,255,0.35)", color: "white" }}
                  >
                    Back
                  </Button>

                  <Button
                    size="large"
                    variant="contained"
                    onClick={onVerifyOtp}
                    disabled={loading}
                    fullWidth
                  >
                    {loading ? <CircularProgress size={22} /> : "Verify & Login"}
                  </Button>
                </>
              ) : null}

              {step === "DONE" ? (
                <Button
                  size="large"
                  variant="outlined"
                  onClick={onLogout}
                  fullWidth
                  sx={{ borderColor: "rgba(255,255,255,0.35)", color: "white" }}
                >
                  Logout
                </Button>
              ) : null}
            </Stack>

            <Typography variant="caption" sx={{ opacity: 0.7 }}>
              Tip: In test mode your backend prints the OTP to the console.
            </Typography>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
