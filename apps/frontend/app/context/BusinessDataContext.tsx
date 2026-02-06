"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { BusinessData } from "../lib/types/types";
import { businessDataApi } from "../lib/api/business-data";

type BusinessDataContextType = {
  businessData: BusinessData | null;
  setBusinessData: (data: BusinessData) => Promise<void>;
  isLoading: boolean;
  loadBusinessData: () => Promise<void>;
};

const BusinessDataContext = createContext<BusinessDataContextType | undefined>(
  undefined
);

export const BusinessDataProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [businessData, setBusinessDataState] = useState<BusinessData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadBusinessData = async () => {
    setIsLoading(true);
    try {
      const apiData = await businessDataApi.get();
      if (apiData) {
        setBusinessDataState(apiData);
      }
      // If no data exists, we leave it as null. The UI should handle the "no business data" state,
      // or the backend should ensure default data exists upon creation.
    } catch (error) {
      console.error("Error al cargar datos del negocio desde API:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const setBusinessData = async (newData: BusinessData) => {
    try {
      let updatedData: BusinessData;
      // If we have an ID, update. Otherwise, create.
      if (newData.id) {
        updatedData = await businessDataApi.update(newData.id, newData);
      } else {
        updatedData = await businessDataApi.create(newData);
      }
      setBusinessDataState(updatedData);
    } catch (error) {
      console.error("Error al guardar datos del negocio en API:", error);
      throw error;
    }
  };

  useEffect(() => {
    loadBusinessData();
  }, []);

  return (
    <BusinessDataContext.Provider
      value={{ businessData, setBusinessData, isLoading, loadBusinessData }}
    >
      {children}
    </BusinessDataContext.Provider>
  );
};

export const useBusinessData = () => {
  const context = useContext(BusinessDataContext);
  if (!context) {
    throw new Error(
      "useBusinessData debe usarse dentro de un BusinessDataProvider"
    );
  }
  return context;
};