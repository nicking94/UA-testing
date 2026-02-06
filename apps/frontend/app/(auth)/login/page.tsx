"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { AuthData } from "@/app/lib/types/types";
import AuthForm from "@/app/components/AuthForm";
import Notification from "@/app/components/Notification";
import Common from "@/app/components/LoginScreens/Common";
const LoginPage = () => {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsCheckbox, setShowTermsCheckbox] = useState(false);
  const [isOpenNotification, setIsOpenNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationType, setNotificationType] = useState<
    "success" | "error" | "info"
  >("error");
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  useEffect(() => {
    if (isAuthenticated === true) {
      router.replace("/caja-diaria");
    } else if (isAuthenticated === false) {
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, [isAuthenticated, router]);
  useEffect(() => {
    if (isAuthenticated !== null) {
      const initialize = async () => {
        try {
          const urlParams = new URLSearchParams(window.location.search);
          if (urlParams.get("expired") === "true") {
            setNotificationMessage("Su periodo de prueba ha expirado");
            setNotificationType("error");
            setIsOpenNotification(true);
            setTimeout(() => setIsOpenNotification(false), 2500);
          }
          if (urlParams.get("inactive") === "true") {
            setNotificationMessage(
              "Usuario desactivado. contacte al soporte técnico"
            );
            setNotificationType("error");
            setIsOpenNotification(true);
            setTimeout(() => setIsOpenNotification(false), 2500);
          }
          
          // Check for persisted terms acceptance
          const savedTerms = localStorage.getItem("termsAccepted");
          if (savedTerms === "true") {
            setAcceptedTerms(true);
            setShowTermsCheckbox(false);
          } else {
            setShowTermsCheckbox(true);
          }
          
          setIsInitialized(true);
        } catch (error) {
          console.error("Error en inicialización:", error);
          setAcceptedTerms(false);
          setShowTermsCheckbox(true);
          setIsInitialized(true);
        }
      };
      initialize();
    }
  }, [isAuthenticated]);
  const handleLogin = async (data: AuthData) => {
    if (!isInitialized || isRedirecting) return;
    if (showTermsCheckbox && !acceptedTerms) {
      setNotificationMessage("Debes aceptar los términos y condiciones");
      setNotificationType("error");
      setIsOpenNotification(true);
      setTimeout(() => setIsOpenNotification(false), 2500);
      return;
    }
    setIsRedirecting(true);
    setNotificationMessage("Iniciando sesión...");
    setNotificationType("info");
    setIsOpenNotification(true);
    try {
      await login(data.username, data.password);
      
      // Persist terms acceptance if checked
      if (acceptedTerms) {
        localStorage.setItem("termsAccepted", "true");
      }

      setNotificationMessage("Inicio de sesión exitoso");
      setNotificationType("success");
      setTimeout(() => {
        setIsOpenNotification(false);
        router.replace("/caja-diaria");
      }, 1500);
    } catch (error: unknown) {
      setNotificationMessage(
        (error as Error).message || "Usuario o contraseña incorrectos"
      );
      setNotificationType("error");
      setIsOpenNotification(true);
      setTimeout(() => setIsOpenNotification(false), 3000);
      setIsRedirecting(false);
    }
  };
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-50 to-blue-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Inicializando sistema...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen flex">
      <AuthForm
        type="login"
        onSubmit={handleLogin}
        showTermsCheckbox={showTermsCheckbox}
        acceptedTerms={acceptedTerms}
        onTermsCheckboxChange={setAcceptedTerms}
      />
      <Common />
      <Notification
        isOpen={isOpenNotification}
        message={notificationMessage}
        type={notificationType}
      />
    </div>
  );
};
export default LoginPage;
