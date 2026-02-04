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
      originalAmount: m.originalAmount !== undefined ? Number(m.originalAmount) : null,
      isBudgetGroup: m.isBudgetGroup,
      method: m.method,
      amount: Number(m.amount),
      manualAmount: m.manualAmount !== undefined ? Number(m.manualAmount) : null,
      discount: m.discount !== undefined ? Number(m.discount) : 0,
      manualProfitPercentage: m.manualProfitPercentage !== undefined ? Number(m.manualProfitPercentage) : null,
      description: m.description,
      type: m.type,
      date: m.date ? new Date(m.date) : new Date(),
      paymentMethod: m.paymentMethod,
      productId: m.productId ? Number(m.productId) : null,
      productName: m.productName,
      costPrice: m.costPrice !== undefined ? Number(m.costPrice) : null,
      sellPrice: m.sellPrice !== undefined ? Number(m.sellPrice) : null,
      quantity: m.quantity !== undefined ? Number(m.quantity) : null,
      profit: m.profit !== undefined ? Number(m.profit) : null,
      rubro: m.rubro,
      unit: m.unit,
      isCreditPayment: m.isCreditPayment,
      originalSaleId: m.originalSaleId ? Number(m.originalSaleId) : null,
      supplierId: m.supplierId ? Number(m.supplierId) : null,
      supplierName: m.supplierName,
      size: m.size,
      color: m.color,
      manualProfit: m.manualProfit !== undefined ? Number(m.manualProfit) : null,
      productsProfit: m.productsProfit !== undefined ? Number(m.productsProfit) : null,
      profitPercentage: m.profitPercentage !== undefined ? Number(m.profitPercentage) : null,
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
        closingAmount: rest.closingAmount !== undefined ? Number(rest.closingAmount) : null,
        closingDate: rest.closingDate ? new Date(rest.closingDate) : null,
        closingDifference: rest.closingDifference !== undefined ? Number(rest.closingDifference) : null,
        cashIncome: rest.cashIncome !== undefined ? Number(rest.cashIncome) : 0,
        cashExpense: rest.cashExpense !== undefined ? Number(rest.cashExpense) : 0,
        otherIncome: rest.otherIncome !== undefined ? Number(rest.otherIncome) : 0,
        totalIncome: rest.totalIncome !== undefined ? Number(rest.totalIncome) : 0,
        totalCashIncome: rest.totalCashIncome !== undefined ? Number(rest.totalCashIncome) : 0,
        totalExpense: rest.totalExpense !== undefined ? Number(rest.totalExpense) : 0,
        totalProfit: rest.totalProfit !== undefined ? Number(rest.totalProfit) : 0,
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
      closingAmount: rest.closingAmount !== undefined ? Number(rest.closingAmount) : undefined,
      closingDate: rest.closingDate ? new Date(rest.closingDate) : undefined,
      closingDifference: rest.closingDifference !== undefined ? Number(rest.closingDifference) : undefined,
      cashIncome: rest.cashIncome !== undefined ? Number(rest.cashIncome) : undefined,
      cashExpense: rest.cashExpense !== undefined ? Number(rest.cashExpense) : undefined,
      otherIncome: rest.otherIncome !== undefined ? Number(rest.otherIncome) : undefined,
      totalIncome: rest.totalIncome !== undefined ? Number(rest.totalIncome) : undefined,
      totalCashIncome: rest.totalCashIncome !== undefined ? Number(rest.totalCashIncome) : undefined,
      totalExpense: rest.totalExpense !== undefined ? Number(rest.totalExpense) : undefined,
      totalProfit: rest.totalProfit !== undefined ? Number(rest.totalProfit) : undefined,
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
    return this.prisma.dailyCash.update({
      where: { id: Number(id) },
      data: {
        closed: true,
        closingAmount: Number(data.closingAmount),
        closingDate: new Date(),
        closingDifference: Number(data.closingDifference || 0),
        closedBy: data.closedBy,
        comments: data.comments,
      },
    });
  }
}