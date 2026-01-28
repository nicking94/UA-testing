"use client";

import React from "react";
import { Snackbar, Alert, AlertProps } from "@mui/material";
import { NotificationProps } from "../lib/types/types";

interface ExtendedNotificationProps extends NotificationProps {
  onClose?: () => void;
  autoHideDuration?: number;
}

export default function Notification({
  isOpen,
  message,
  type,
  onClose,
  autoHideDuration = 3000,
}: ExtendedNotificationProps) {
  const handleClose = (
    _event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === "clickaway") {
      return;
    }
    onClose?.();
  };

  const severityMap: Record<string, AlertProps["severity"]> = {
    success: "success",
    error: "error",
    info: "info",
    warning: "warning",
  };

  const severity = severityMap[type] || "info";

  return (
    <Snackbar
      open={isOpen}
      autoHideDuration={autoHideDuration}
      onClose={handleClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
    >
      <Alert
        onClose={handleClose}
        severity={severity}
        variant="filled"
        sx={{
          width: '100%',
          minWidth: { xs: 'auto', sm: 300 },
          boxShadow: 3
        }}
      >
        {message || ""}
      </Alert>
    </Snackbar>
  );
}