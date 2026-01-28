import React from "react";
import {
  Box,
  Stack,
  TextField,
  Button,
  Paper,
  Typography,
  Alert,
  MenuItem,
  CircularProgress,
  Divider,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { createTransaction, listTransactions, updateTransactionStatus } from "../api/transactions";
import { listSenders } from "../api/senders";
import { listReceivers } from "../api/receivers";

export default function TransactionsTab() {
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState(null);

  const [senders, setSenders] = React.useState([]);
  const [receivers, setReceivers] = React.useState([]);
  const [txs, setTxs] = React.useState([]);

  const [form, setForm] = React.useState({
    senderId: "",
    receiverId: "",
    amountJPY: "",
    note: "",
  });

  const loadAll = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const [s, r, t] = await Promise.all([
        listSenders({ page: 1, limit: 50 }),
        listReceivers({ page: 1, limit: 50 }),
        listTransactions({ page: 1, limit: 50 }),
      ]);
      setSenders(s?.data || []);
      setReceivers(r?.data || []);
      setTxs(t?.data || []);
    } catch (e) {
      setMsg(e?.response?.data?.message || e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadAll();
  }, []);

  const onCreate = async () => {
    if (!form.senderId || !form.receiverId || !String(form.amountJPY).trim()) {
      setMsg("senderId, receiverId, amountJPY are required");
      return;
    }

    setLoading(true);
    setMsg(null);
    try {
      const payload = {
        senderId: Number(form.senderId),
        receiverId: Number(form.receiverId),
        amountJPY: Number(form.amountJPY),
        note: form.note ? String(form.note) : null,
      };
      const created = await createTransaction(payload);
      setMsg(created?.message ? `✅ ${created.message}` : "✅ Transaction created");
      setForm({ senderId: "", receiverId: "", amountJPY: "", note: "" });
      await loadAll();
    } catch (e) {
      setMsg(e?.response?.data?.message || e.message || "Create failed");
    } finally {
      setLoading(false);
    }
  };

  const onPatchStatus = async (id, status) => {
    setLoading(true);
    setMsg(null);
    try {
      await updateTransactionStatus(id, status);
      setMsg(`✅ Updated status to ${status}`);
      await loadAll();
    } catch (e) {
      setMsg(e?.response?.data?.message || e.message || "Status update failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={2}>
      {msg ? <Alert severity="info" sx={{ borderRadius: 2 }}>{msg}</Alert> : null}

      <Paper sx={{ p: 2, borderRadius: 2, bgcolor: "rgba(255,255,255,0.05)", color: "white" }}>
        <Typography fontWeight={800} sx={{ mb: 1 }}>
          Create Transaction (amountJPY → NPR calc happens in backend)
        </Typography>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            select
            label="Sender"
            value={form.senderId}
            onChange={(e) => setForm((p) => ({ ...p, senderId: e.target.value }))}
            fullWidth
          >
            {senders.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                #{s.id} — {s.fullName} ({s.phone || "no phone"})
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Receiver"
            value={form.receiverId}
            onChange={(e) => setForm((p) => ({ ...p, receiverId: e.target.value }))}
            fullWidth
          >
            {receivers.map((r) => (
              <MenuItem key={r.id} value={r.id}>
                #{r.id} — {r.fullName} ({r.phone || "no phone"})
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 1.5 }}>
          <TextField
            label="Amount (JPY)"
            value={form.amountJPY}
            onChange={(e) => setForm((p) => ({ ...p, amountJPY: e.target.value }))}
            fullWidth
            inputProps={{ inputMode: "numeric" }}
          />
          <TextField
            label="Note (optional)"
            value={form.note}
            onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
            fullWidth
          />
        </Stack>

        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={18} /> : <AddRoundedIcon />}
          onClick={onCreate}
          disabled={loading}
          sx={{ mt: 2 }}
          fullWidth
        >
          Create
        </Button>
      </Paper>

      <Paper sx={{ p: 2, borderRadius: 2, bgcolor: "rgba(255,255,255,0.05)", color: "white" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography fontWeight={800}>Transactions ({txs.length})</Typography>
          <Button
            variant="outlined"
            onClick={loadAll}
            sx={{ borderColor: "rgba(255,255,255,0.35)", color: "white" }}
          >
            Refresh
          </Button>
        </Stack>

        <Divider sx={{ my: 1.5, borderColor: "rgba(255,255,255,0.14)" }} />

        {loading ? <Typography>Loading...</Typography> : null}

        <Stack spacing={1}>
          {txs.map((t) => (
            <Box
              key={t.id}
              sx={{
                p: 1.5,
                borderRadius: 2,
                border: "1px solid rgba(255,255,255,0.10)",
                display: "grid",
                gap: 0.8,
              }}
            >
              <Typography fontWeight={800}>
                #{t.id} • {t.status}
              </Typography>

              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Sender: {t.senderName || t.senderId} ({t.senderPhone || "-"}) → Receiver:{" "}
                {t.receiverName || t.receiverId} ({t.receiverPhone || "-"})
              </Typography>

              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                JPY: {t.amountJPY ?? t.amount} • NPR: {t.amountNPR} • Fee NPR: {t.feeNPR} • Total NPR: {t.totalNPR} • Rate: {t.forexRate}
              </Typography>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  sx={{ borderColor: "rgba(255,255,255,0.35)", color: "white" }}
                  onClick={() => onPatchStatus(t.id, "SUCCESS")}
                >
                  Mark SUCCESS
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  sx={{ borderColor: "rgba(255,0,0,0.35)", color: "white" }}
                  onClick={() => onPatchStatus(t.id, "FAILED")}
                >
                  Mark FAILED
                </Button>
              </Stack>
            </Box>
          ))}
        </Stack>
      </Paper>
    </Stack>
  );
}
