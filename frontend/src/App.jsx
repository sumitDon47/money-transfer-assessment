import React from "react";
import LoginOtp from "./pages/LoginOtp";
import Dashboard from "./pages/Dashboard";
import { isLoggedIn } from "./utils/auth";

export default function App() {
  const [loggedIn, setLoggedIn] = React.useState(isLoggedIn());

  return loggedIn ? (
    <Dashboard onLogout={() => setLoggedIn(false)} />
  ) : (
    <LoginOtp onLogin={() => setLoggedIn(true)} />

  );
}
