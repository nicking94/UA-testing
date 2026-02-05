import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DailyCashService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.dailyCash.findMany({
      include: { movements: true },
      orderBy: { date: 'desc' },
    });
  }

  async findByDate(date: string) {
    // When querying a @db.Date with Prisma, we should use a Date object.
    // To be safe across timezones, we can query for the date part.
    // If 'date' is YYYY-MM-DD, new Date(date) is UTC midnight.
    const searchDate = new Date(date);
    const year = searchDate.getUTCFullYear();
    const month = searchDate.getUTCMonth();
    const day = searchDate.getUTCDate();

    return this.prisma.dailyCash.findFirst({
      where: { 
        date: {
          gte: new Date(Date.UTC(year, month, day, 0, 0, 0)),
          lt: new Date(Date.UTC(year, month, day + 1, 0, 0, 0)),
        }
      },
      include: { movements: true },
    });
  }

  private formatMovement(m: any) {
    return {
      isDeposit: m.isDeposit,
      originalAmount: m.originalAmount !== undefined ? (isNaN(Number(m.originalAmount)) ? null : Number(m.originalAmount)) : null,
      isBudgetGroup: m.isBudgetGroup,
      method: m.method,
      amount: isNaN(Number(m.amount)) ? 0 : Number(m.amount),
      manualAmount: m.manualAmount !== undefined ? (isNaN(Number(m.manualAmount)) ? null : Number(m.manualAmount)) : null,
      discount: m.discount !== undefined ? (isNaN(Number(m.discount)) ? 0 : Number(m.discount)) : 0,
      manualProfitPercentage: m.manualProfitPercentage !== undefined ? (isNaN(Number(m.manualProfitPercentage)) ? null : Number(m.manualProfitPercentage)) : null,
      description: m.description,
      type: m.type,
      date: m.date ? new Date(m.date) : new Date(),
      paymentMethod: m.paymentMethod,
      productId: m.productId ? Number(m.productId) : null,
      productName: m.productName,
      costPrice: m.costPrice !== undefined ? (isNaN(Number(m.costPrice)) ? null : Number(m.costPrice)) : null,
      sellPrice: m.sellPrice !== undefined ? (isNaN(Number(m.sellPrice)) ? null : Number(m.sellPrice)) : null,
      quantity: m.quantity !== undefined ? (isNaN(Number(m.quantity)) ? null : Number(m.quantity)) : null,
      profit: m.profit !== undefined ? (isNaN(Number(m.profit)) ? null : Number(m.profit)) : null,
      rubro: m.rubro,
      unit: m.unit,
      isCreditPayment: m.isCreditPayment,
      originalSaleId: m.originalSaleId ? Number(m.originalSaleId) : null,
      supplierId: m.supplierId ? Number(m.supplierId) : null,
      supplierName: m.supplierName,
      size: m.size,
      color: m.color,
      manualProfit: m.manualProfit !== undefined ? (isNaN(Number(m.manualProfit)) ? null : Number(m.manualProfit)) : null,
      productsProfit: m.productsProfit !== undefined ? (isNaN(Number(m.productsProfit)) ? null : Number(m.productsProfit)) : null,
      profitPercentage: m.profitPercentage !== undefined ? (isNaN(Number(m.profitPercentage)) ? null : Number(m.profitPercentage)) : null,
      budgetId: m.budgetId,
      fromBudget: m.fromBudget,
    };
  }

  async create(data: any) {
    const { id, movements, ...rest } = data;
    const date = rest.date ? new Date(rest.date) : new Date();
    
    // Check if a daily cash for this date already exists to avoid 500
    // We can use the date part only for comparison
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(year, month, day + 1, 0, 0, 0));

    const existing = await this.prisma.dailyCash.findFirst({
      where: {
        date: {
          gte: startOfDay,
          lt: endOfDay,
        }
      }
    });

    if (existing) {
      // If it exists, return it instead of crashing, or update it
      // For "Abrir Caja", returning the existing one is usually what's expected if it's already there
      return this.prisma.dailyCash.findUnique({
        where: { id: existing.id },
        include: { movements: true }
      });
    }

    return this.prisma.dailyCash.create({
      data: {
        date: startOfDay, // Store exactly at midnight UTC for consistency
        closed: rest.closed === true,
        closingAmount: rest.closingAmount !== undefined ? (isNaN(Number(rest.closingAmount)) ? 0 : Number(rest.closingAmount)) : null,
        closingDate: rest.closingDate ? new Date(rest.closingDate) : null,
        closingDifference: rest.closingDifference !== undefined ? (isNaN(Number(rest.closingDifference)) ? 0 : Number(rest.closingDifference)) : null,
        cashIncome: rest.cashIncome !== undefined ? (isNaN(Number(rest.cashIncome)) ? 0 : Number(rest.cashIncome)) : 0,
        cashExpense: rest.cashExpense !== undefined ? (isNaN(Number(rest.cashExpense)) ? 0 : Number(rest.cashExpense)) : 0,
        otherIncome: rest.otherIncome !== undefined ? (isNaN(Number(rest.otherIncome)) ? 0 : Number(rest.otherIncome)) : 0,
        totalIncome: rest.totalIncome !== undefined ? (isNaN(Number(rest.totalIncome)) ? 0 : Number(rest.totalIncome)) : 0,
        totalCashIncome: rest.totalCashIncome !== undefined ? (isNaN(Number(rest.totalCashIncome)) ? 0 : Number(rest.totalCashIncome)) : 0,
        totalExpense: rest.totalExpense !== undefined ? (isNaN(Number(rest.totalExpense)) ? 0 : Number(rest.totalExpense)) : 0,
        totalProfit: rest.totalProfit !== undefined ? (isNaN(Number(rest.totalProfit)) ? 0 : Number(rest.totalProfit)) : 0,
        comments: rest.comments,
        openedBy: rest.openedBy,
        closedBy: rest.closedBy,
        movements: movements
          ? {
              create: movements.map((m: any) => this.formatMovement(m)),
            }
          : undefined,
      },
      include: { movements: true },
    });
  }

  async update(id: number, data: any) {
    const { id: _, movements, updatedAt, createdAt, ...rest } = data;
    
    const updateData: any = {
      closed: rest.closed !== undefined ? rest.closed === true : undefined,
      closingAmount: rest.closingAmount !== undefined ? (isNaN(Number(rest.closingAmount)) ? 0 : Number(rest.closingAmount)) : undefined,
      closingDate: rest.closingDate ? new Date(rest.closingDate) : undefined,
      closingDifference: rest.closingDifference !== undefined ? (isNaN(Number(rest.closingDifference)) ? 0 : Number(rest.closingDifference)) : undefined,
      cashIncome: rest.cashIncome !== undefined ? (isNaN(Number(rest.cashIncome)) ? 0 : Number(rest.cashIncome)) : undefined,
      cashExpense: rest.cashExpense !== undefined ? (isNaN(Number(rest.cashExpense)) ? 0 : Number(rest.cashExpense)) : undefined,
      otherIncome: rest.otherIncome !== undefined ? (isNaN(Number(rest.otherIncome)) ? 0 : Number(rest.otherIncome)) : undefined,
      totalIncome: rest.totalIncome !== undefined ? (isNaN(Number(rest.totalIncome)) ? 0 : Number(rest.totalIncome)) : undefined,
      totalCashIncome: rest.totalCashIncome !== undefined ? (isNaN(Number(rest.totalCashIncome)) ? 0 : Number(rest.totalCashIncome)) : undefined,
      totalExpense: rest.totalExpense !== undefined ? (isNaN(Number(rest.totalExpense)) ? 0 : Number(rest.totalExpense)) : undefined,
      totalProfit: rest.totalProfit !== undefined ? (isNaN(Number(rest.totalProfit)) ? 0 : Number(rest.totalProfit)) : undefined,
      comments: rest.comments !== undefined ? rest.comments : undefined,
      openedBy: rest.openedBy !== undefined ? rest.openedBy : undefined,
      closedBy: rest.closedBy !== undefined ? rest.closedBy : undefined,
    };

    if (rest.date) {
      updateData.date = new Date(rest.date);
    }

    if (movements) {
      updateData.movements = {
        deleteMany: {},
        create: movements.map((m: any) => this.formatMovement(m)),
      };
    }

    return this.prisma.dailyCash.update({
      where: { id: Number(id) },
      data: updateData,
      include: { movements: true },
    });
  }

  async close(id: number, data: any) {
    try {
      const closingAmount = Number(data.closingAmount);
      const closingDifference = Number(data.closingDifference || 0);
      const otherIncome = Number(data.otherIncome || 0);

      return await this.prisma.dailyCash.update({
        where: { id: Number(id) },
        data: {
          closed: true,
          closingAmount: isNaN(closingAmount) ? 0 : closingAmount,
          closingDate: new Date(),
          closingDifference: isNaN(closingDifference) ? 0 : closingDifference,
          closedBy: data.closedBy,
          comments: data.comments,
          otherIncome: isNaN(otherIncome) ? 0 : otherIncome,
        },
      });
    } catch (error) {
      console.error(`Error closing daily cash ${id}:`, error);
      throw error;
    }
  }
}