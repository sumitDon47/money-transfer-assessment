import React from "react";
import {
  Box,
  Stack,
  TextField,
  Button,
  Paper,
  Typography,
  Alert,
  CircularProgress,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import { createSender, deleteSender, listSenders, updateSender } from "../api/senders";

export default function SendersTab() {
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState(null);
  const [items, setItems] = React.useState([]);

  const [form, setForm] = React.useState({
    fullName: "",
    phone: "",
    address: "",
    country: "Japan",
  });

  const [editId, setEditId] = React.useState(null);

  const load = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const data = await listSenders({ page: 1, limit: 50 });
      setItems(data?.data || []);
    } catch (e) {
      setMsg(e?.response?.data?.message || e.message || "Failed to load senders");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
  }, []);

  const onSubmit = async () => {
    if (!form.fullName.trim()) {
      setMsg("fullName is required");
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      if (editId) {
        await updateSender(editId, form);
        setMsg("Updated sender ✅");
      } else {
        await createSender(form);
        setMsg("Created sender ✅");
      }
      setForm({ fullName: "", phone: "", address: "", country: "Japan" });
      setEditId(null);
      await load();
    } catch (e) {
      setMsg(e?.response?.data?.message || e.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const onEdit = (s) => {
    setEditId(s.id);
    setForm({
      fullName: s.fullName || "",
      phone: s.phone || "",
      address: s.address || "",
      country: s.country || "Japan",
    });
  };

  const onDelete = async (id) => {
    setLoading(true);
    setMsg(null);
    try {
      await deleteSender(id);
      setMsg("Deleted sender ✅");
      await load();
    } catch (e) {
      setMsg(e?.response?.data?.message || e.message || "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={2}>
      {msg ? <Alert severity="info" sx={{ borderRadius: 2 }}>{msg}</Alert> : null}

      <Paper sx={{ p: 2, borderRadius: 2, bgcolor: "rgba(255,255,255,0.05)", color: "white" }}>
        <Typography fontWeight={800} sx={{ mb: 1 }}>
          {editId ? `Edit Sender #${editId}` : "Create Sender"}
        </Typography>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            label="Full Name"
            value={form.fullName}
            onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Phone (unique per user)"
            value={form.phone}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
            fullWidth
          />
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 1.5 }}>
          <TextField
            label="Address"
            value={form.address}
            onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Country"
            value={form.country}
            onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
            fullWidth
          />
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 2 }}>
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={18} /> : <AddRoundedIcon />}
            onClick={onSubmit}
            disabled={loading}
            fullWidth
          >
            {editId ? "Update" : "Create"}
          </Button>
          {editId ? (
            <Button
              variant="outlined"
              onClick={() => {
                setEditId(null);
                setForm({ fullName: "", phone: "", address: "", country: "Japan" });
              }}
              fullWidth
              sx={{ borderColor: "rgba(255,255,255,0.35)", color: "white" }}
            >
              Cancel
            </Button>
          ) : null}
        </Stack>
      </Paper>

      <Paper sx={{ p: 2, borderRadius: 2, bgcolor: "rgba(255,255,255,0.05)", color: "white" }}>
        <Typography fontWeight={800} sx={{ mb: 1 }}>
          Your Senders ({items.length})
        </Typography>

        {loading ? <Typography>Loading...</Typography> : null}

        <Stack spacing={1}>
          {items.map((s) => (
            <Box
              key={s.id}
              sx={{
                p: 1.5,
                borderRadius: 2,
                border: "1px solid rgba(255,255,255,0.10)",
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                justifyContent: "space-between",
                gap: 1,
              }}
            >
              <Box>
                <Typography fontWeight={700}>{s.fullName}</Typography>
                <Typography variant="body2" sx={{ opacity: 0.75 }}>
                  {s.phone || "No phone"} • {s.country || "-"} • #{s.id}
                </Typography>
              </Box>

              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<EditRoundedIcon />}
                  sx={{ borderColor: "rgba(255,255,255,0.35)", color: "white" }}
                  onClick={() => onEdit(s)}
                >
                  Edit
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<DeleteRoundedIcon />}
                  sx={{ borderColor: "rgba(255,0,0,0.35)", color: "white" }}
                  onClick={() => onDelete(s.id)}
                >
                  Delete
                </Button>
              </Stack>
            </Box>
          ))}
        </Stack>
      </Paper>
    </Stack>
  );
}
