"use client";
import { useState, useCallback } from "react";
import {
  Installment,
  CreditSale,
  PaymentMethod,
  InstallmentStatus,
  Sale
} from "@/app/lib/types/types";
import { differenceInDays, isBefore } from "date-fns";
import { salesApi } from "../lib/api/sales";
import { installmentsApi } from "../lib/api/installments";

export const useCreditInstallments = () => {
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(false);
  const [overdueInstallments, setOverdueInstallments] = useState<Installment[]>(
    []
  );

  const calculateInstallments = (
    totalAmount: number,
    numberOfInstallments: number,
    interestRate: number,
    startDate: string
  ): Installment[] => {
    const installments: Installment[] = [];
    const monthlyInterest = interestRate / 100;
    const start = new Date(startDate);
    for (let i = 1; i <= numberOfInstallments; i++) {
      const dueDate = new Date(start);
      dueDate.setMonth(dueDate.getMonth() + i);
      const interestAmount =
        interestRate > 0
          ? (totalAmount / numberOfInstallments) * monthlyInterest
          : 0;
      const installmentAmount =
        totalAmount / numberOfInstallments + interestAmount;
      const installment: Installment = {
        creditSaleId: 0,
        number: i,
        dueDate: dueDate.toISOString().split("T")[0],
        amount: parseFloat(installmentAmount.toFixed(2)),
        interestAmount: parseFloat(interestAmount.toFixed(2)),
        penaltyAmount: 0,
        status: "pendiente",
        daysOverdue: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      installments.push(installment);
    }
    return installments;
  };

  const getCreditSalesInInstallments = useCallback(async () => {
    try {
      const allSales = await salesApi.getAll({ credit: true });
      const creditSales = allSales.filter(
        (sale: Sale) =>
          sale.creditType === "credito_cuotas" &&
          sale.customerName
      );
      return creditSales as CreditSale[];
    } catch (error) {
      console.error("Error fetching credit sales in installments:", error);
      return [];
    }
  }, []);

  const checkOverdueInstallments = useCallback(async () => {
    try {
      const today = new Date();
      const creditSales = await getCreditSalesInInstallments();
      const creditSaleIds = creditSales.map((sale: CreditSale) => sale.id);
      if (creditSaleIds.length === 0) {
        setOverdueInstallments([]);
        return [];
      }
      const allPending: Installment[] = [];
      for (const saleId of creditSaleIds) {
        const saleInstallments = await installmentsApi.getAll({ 
          creditSaleId: saleId,
          status: "pendiente" 
        });
        allPending.push(...saleInstallments);
      }
      const overdue = allPending.filter((installment: Installment) => {
        const dueDate = new Date(installment.dueDate);
        return isBefore(dueDate, today);
      });

      for (const installment of overdue) {
        const daysOverdue = differenceInDays(
          today,
          new Date(installment.dueDate)
        );
        // This is still updating installments status one by one.
        // In a real production app, this could be a cron job.
        const penaltyRate = 0.05;
        const penaltyAmount = installment.amount * penaltyRate * daysOverdue;
        await installmentsApi.update(installment.id!, {
          status: "vencida" as InstallmentStatus,
          penaltyAmount,
          daysOverdue,
          updatedAt: new Date().toISOString(),
        });
      }

      const updatedOverdue: Installment[] = [];
      for (const saleId of creditSaleIds) {
        const saleOverdue = await installmentsApi.getAll({
          creditSaleId: saleId,
          status: "vencida"
        });
        updatedOverdue.push(...saleOverdue);
      }
      setOverdueInstallments(updatedOverdue);
      return updatedOverdue;
    } catch (error) {
      console.error("Error checking overdue installments:", error);
      return [];
    }
  }, [getCreditSalesInInstallments]);

  const fetchInstallments = useCallback(
    async (creditSaleId?: number) => {
      setLoading(true);
      try {
        let installmentsData: Installment[];
        if (creditSaleId) {
          installmentsData = await installmentsApi.getAll({ creditSaleId });
        } else {
          installmentsData = await installmentsApi.getAll();
        }
        setInstallments(installmentsData);
        return installmentsData;
      } catch (error) {
        console.error("Error fetching installments:", error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const payInstallment = async (
    installmentId: number,
    paymentMethod: PaymentMethod
  ): Promise<{ success: boolean; updatedInstallment?: Installment }> => {
    try {
      const now = new Date().toISOString();
      
      // All logic (daily cash, customer balance) is now handled by the backend markAsPaid
      const updatedInstallment = await installmentsApi.markAsPaid(installmentId, {
        paymentDate: now,
        paymentMethod,
      });

      setInstallments((prev) =>
        prev.map((inst: Installment) =>
          inst.id === installmentId ? updatedInstallment : inst
        )
      );

      // Refresh overdue list if it was overdue
      setOverdueInstallments((prev) =>
        prev.filter((inst: Installment) => inst.id !== installmentId)
      );

      return { success: true, updatedInstallment };
    } catch (error) {
      console.error("Error al pagar la cuota:", error);
      throw error;
    }
  };

  const payAllInstallments = async (
    creditSaleId: number,
    paymentMethod: PaymentMethod
  ): Promise<{ success: boolean; updatedInstallments: Installment[] }> => {
    try {
      const pendingInstallments = await installmentsApi.getAll({
        creditSaleId,
        status: "pendiente"
      });
      const overdueInstallmentsApi = await installmentsApi.getAll({
        creditSaleId,
        status: "vencida"
      });
      const allPending = [...pendingInstallments, ...overdueInstallmentsApi];
      
      if (allPending.length === 0) {
        throw new Error("No hay cuotas pendientes para pagar");
      }

      const now = new Date().toISOString();
      const ids = allPending.map(inst => inst.id!);
      
      // Call the new payMultiple endpoint
      const updatedInstallments = await installmentsApi.payMultiple({
        ids,
        paymentDate: now,
        paymentMethod
      });

      setInstallments((prev) =>
        prev.map((inst: Installment) => {
          const updated = updatedInstallments.find((u: Installment) => u.id === inst.id);
          return updated ? updated : inst;
        })
      );

      setOverdueInstallments((prev) =>
        prev.filter(
          (inst: Installment) => !updatedInstallments.some((u: Installment) => u.id === inst.id)
        )
      );

      return { success: true, updatedInstallments };
    } catch (error) {
      console.error("Error al pagar todas las cuotas:", error);
      throw error;
    }
  };

  const deleteCreditSale = async (
    creditSaleId: number
  ): Promise<{ success: boolean; message: string }> => {
    try {
      // Backend should ideally handle the whole deletion logic including dependencies
      // For now, let's keep it simple and just delete the sale if backend allows
      await salesApi.delete(creditSaleId);
      
      return {
        success: true,
        message: "Crédito eliminado correctamente",
      };
    } catch (error) {
      console.error("Error al eliminar el crédito:", error);
      throw error;
    }
  };

  const generateCreditReport = useCallback(
    async (startDate: string, endDate: string) => {
      try {
        const allSales = await salesApi.getAll();
        const creditSalesData = allSales.filter(
          (sale: Sale) => sale.creditType === "credito_cuotas"
        ) as CreditSale[];
        
        const creditSaleIds = creditSalesData.map((sale) => sale.id);
        let allInstallments: Installment[] = [];
        
        if (creditSaleIds.length > 0) {
          for (const id of creditSaleIds) {
            const saleInsts = await installmentsApi.getAll({ creditSaleId: id });
            allInstallments.push(...saleInsts);
          }
          allInstallments = allInstallments.filter((installment: Installment) => {
            const dueDate = new Date(installment.dueDate);
            return (
              dueDate >= new Date(startDate) && dueDate <= new Date(endDate)
            );
          });
        }

        const report = {
          period: { startDate, endDate },
          totalCreditSales: creditSalesData.length,
          totalAmount: creditSalesData.reduce(
            (sum, sale) => sum + sale.total,
            0
          ),
          installmentsByStatus: {
            pendiente: allInstallments.filter((i: Installment) => i.status === "pendiente")
              .length,
            pagada: allInstallments.filter((i: Installment) => i.status === "pagada").length,
            vencida: allInstallments.filter((i: Installment) => i.status === "vencida")
              .length,
          },
          totalInterest: allInstallments.reduce(
            (sum: number, i: Installment) => sum + (i.interestAmount || 0),
            0
          ),
          totalPenalties: allInstallments.reduce(
            (sum: number, i: Installment) => sum + (i.penaltyAmount || 0),
            0
          ),
          overdueInstallments: allInstallments.filter(
            (i: Installment) => i.status === "vencida"
          ),
        };
        return report;
      } catch (error) {
        console.error("Error generating credit report:", error);
        throw error;
      }
    },
    []
  );

  return {
    installments,
    loading,
    overdueInstallments,
    calculateInstallments,
    checkOverdueInstallments,
    fetchInstallments,
    payInstallment,
    payAllInstallments,
    generateCreditReport,
    setInstallments,
    getCreditSalesInInstallments,
    deleteCreditSale,
  };
};