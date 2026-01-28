"use client";
import { useEffect } from "react";
import { notificationsApi } from "@/app/lib/api/notifications";
import { systemActualizations } from "@/app/data/actualizations";
const UpdatesManager = () => {
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const existingNotifications = await notificationsApi.getAll({
          type: "system",
        });
        for (const actualization of systemActualizations) {
          const exists = existingNotifications.some(
            (n) => n.actualizationId === actualization.id
          );
          if (!exists) {
            await notificationsApi.create({
              title: actualization.title,
              message: actualization.message,
              date: actualization.date || new Date().toISOString(),
              read: false,
              type: "system",
              actualizationId: actualization.id,
              isDeleted: false,
            });
          }
        }
      } catch (error) {
        console.error("Error al verificar actualizaciones:", error);
      }
    };
    const timer = setTimeout(checkForUpdates, 500);
    return () => clearTimeout(timer);
  }, []);
  return null;
};
export default UpdatesManager;
