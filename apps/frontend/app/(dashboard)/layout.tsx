"use client";import { useEffect, useState } from "react";import Navbar from "../components/Navbar";import Sidebar from "../components/Sidebar";import { useSidebar } from "../context/SidebarContext";import { useRouter } from "next/navigation";import { authApi } from "../lib/api/auth";import TrialNotification from "../components/TrialNotification";import { PaginationProvider } from "../context/PaginationContext";import UpdatesManager from "../components/Notifications/UpdatesManager";import PaymentNotification from "../components/PaymentNotification";import { useAppVersion } from "../hooks/useAppVersion";import { ThemeProvider, CssBaseline, Box, useMediaQuery } from "@mui/material";import { lightTheme, darkTheme } from "@/app/theme/theme";export default function AppLayout({  children,}: Readonly<{  children: React.ReactNode;}>) {  const { isSidebarOpen } = useSidebar();  const router = useRouter();  const [theme, setTheme] = useState<string>("light");  const { isUpdating, isAutoUpdate } = useAppVersion();  const isMobile = useMediaQuery(lightTheme.breakpoints.down("md"));   const handleTheme = () => {    setTheme((prev) => (prev === "dark" ? "light" : "dark"));  };  const handleCloseSession = async () => {    try {      authApi.logout();      router.replace("/login");    } catch (error) {      console.error("Error al cerrar sesión:", error);    }  };  useEffect(() => {    const loadTheme = () => {      const savedTheme = localStorage.getItem("theme");      if (savedTheme) {        setTheme(savedTheme);      } else {        document.documentElement.classList.add("light");      }    };    loadTheme();  }, []);  useEffect(() => {    const saveTheme = () => {      localStorage.setItem("theme", theme);    };    document.documentElement.classList.remove("light", "dark");    document.documentElement.classList.add(theme);    saveTheme();  }, [theme]);  useEffect(() => {    const requestPersistentStorage = async () => {      try {        if ("storage" in navigator && "persist" in navigator.storage) {          const alreadyPersisted = await navigator.storage.persisted();          if (!alreadyPersisted) {            const granted = await navigator.storage.persist();            console.log(              "🔐 Storage persistente:",              granted ? "Concedido" : "Denegado"            );            if (granted) {              const estimate = await navigator.storage.estimate();              console.log(                `💾 Cuota: ${Math.round(estimate.quota || 0 / 1024 / 1024)}MB`              );              console.log(                `📊 Uso: ${Math.round(estimate.usage || 0 / 1024 / 1024)}MB`              );            } else {              console.warn(                "⚠️ Storage persistente no concedido. Los datos podrían perderse."              );            }          } else {            console.log("✅ Storage ya es persistente");          }        }      } catch (err) {        console.warn("No se pudo solicitar storage persistente", err);      }    };    requestPersistentStorage();  }, []);  const muiTheme = theme === "dark" ? darkTheme : lightTheme;  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <PaginationProvider>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            minHeight: "100vh",
            bgcolor: "background.default",
            color: "text.primary",
          }}
        >
          <TrialNotification />
          <PaymentNotification />
          <UpdatesManager />
          {isUpdating && isAutoUpdate && (
            <div className="fixed top-4 right-4 z-50 bg-blue_b text-white px-3 py-2 rounded-lg shadow-lg text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Actualizando...</span>
              </div>
            </div>
          )}
          <Navbar
            theme={theme}
            handleTheme={handleTheme}
            handleCloseSession={handleCloseSession}
          />
          <Box
            sx={{
              position: "relative",
              flex: 1,
              mt: "55px",
            }}
          >
            <Sidebar />
            <Box
              component="main"
              sx={{
                position: "absolute",
                top: 0,
                left: {
                  xs: 0,
                  sm: 0,
                  md: isSidebarOpen ? "256px" : "120px",
                  lg: isSidebarOpen ? "256px" : "120px",
                  xl: isSidebarOpen ? "256px" : "120px",
                },
                right: 0,
                bottom: 0,
                transition: muiTheme.transitions.create(["left"], {
                  duration: muiTheme.transitions.duration.standard,
                }),
                overflow: "auto",
                display: "flex",
                flexDirection: "column",
                zIndex: 1,
                ...(isMobile && {
                  left: 0,
                  width: "100%",
                }),
              }}
            >
              {children}
            </Box>
          </Box>
        </Box>
      </PaginationProvider>
    </ThemeProvider>
  );}