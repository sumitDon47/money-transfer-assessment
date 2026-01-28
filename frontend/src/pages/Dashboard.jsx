import React from "react";
import {
  Box,
  Container,
  Paper,
  Typography,
  Tabs,
  Tab,
  Button,
  Stack,
  Alert,
} from "@mui/material";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded";

import { logout } from "../utils/auth";
import SendersTab from "../components/SendersTab";
import ReceiversTab from "../components/ReceiversTab";
import TransactionsTab from "../components/TransactionsTab";

function TabPanel({ value, index, children }) {
  if (value !== index) return null;
  return <Box sx={{ pt: 2 }}>{children}</Box>;
}

export default function Dashboard({ onLogout }) {
  const [tab, setTab] = React.useState(0);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#0b1220",
        color: "white",
        py: 3,
      }}
    >
      <Container maxWidth="lg">
        <Paper
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: 3,
            bgcolor: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            color: "white",
          }}
          elevation={6}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "flex-start", sm: "center" }}
            justifyContent="space-between"
          >
            <Box>
              <Typography variant="h5" fontWeight={800}>
                Dashboard
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.75 }}>
                Manage Senders, Receivers, and Transactions
              </Typography>
            </Box>

            <Button
              variant="outlined"
              startIcon={<LogoutRoundedIcon />}
              sx={{ borderColor: "rgba(255,255,255,0.35)", color: "white" }}
              onClick={() => {
                logout();
                onLogout?.();
              }}
            >
              Logout
            </Button>
          </Stack>

          <Alert
            severity="info"
            sx={{ mt: 2, borderRadius: 2 }}
          >
            Token is stored in localStorage. API requests automatically send Bearer token.
          </Alert>

          <Box sx={{ mt: 2 }}>
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              textColor="inherit"
              indicatorColor="secondary"
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab icon={<PeopleAltRoundedIcon />} iconPosition="start" label="Senders" />
              <Tab icon={<PeopleAltRoundedIcon />} iconPosition="start" label="Receivers" />
              <Tab icon={<SwapHorizRoundedIcon />} iconPosition="start" label="Transactions" />
            </Tabs>

            <TabPanel value={tab} index={0}>
              <SendersTab />
            </TabPanel>

            <TabPanel value={tab} index={1}>
              <ReceiversTab />
            </TabPanel>

            <TabPanel value={tab} index={2}>
              <TransactionsTab />
            </TabPanel>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
