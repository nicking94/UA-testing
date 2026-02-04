import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: {
    dateFrom?: string;
    dateTo?: string;
    customerId?: string;
    credit?: string | boolean;
    priceListId?: string | number;
  }) {
    const where: any = {};
    if (filters?.dateFrom || filters?.dateTo) {
      where.date = {};
      if (filters.dateFrom) {
        where.date.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.date.lte = new Date(filters.dateTo);
      }
    }
    if (filters?.customerId) {
      where.customerId = filters.customerId;
    }
    if (filters?.credit !== undefined) {
      // Cast string "true"/"false" to boolean
      where.credit = filters.credit === 'true' || filters.credit === true;
    }
    if (filters?.priceListId !== undefined) {
      where.priceListId = Number(filters.priceListId);
    }
    return this.prisma.sale.findMany({
      where,
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
        payments: true,
        installments: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(id: number) {
    return this.prisma.sale.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
        payments: true,
        installments: {
          orderBy: { number: 'asc' },
        },
        editHistory: {
          orderBy: { date: 'desc' },
        },
      },
    });
  }

  async create(data: any) {
    // Extract known relations and extra UI fields that are NOT in the database model
    const { 
      items, 
      payments, 
      installments, 
      products, 
      paymentMethods, // UI field, not in model
      ...rest 
    } = data;
    
    // Explicitly pick only the fields that exist in the Sale model
    const saleData = {
      total: Number(rest.total),
      date: rest.date ? new Date(rest.date) : new Date(),
      barcode: rest.barcode || null,
      manualAmount: rest.manualAmount !== undefined ? Number(rest.manualAmount) : null,
      manualProfitPercentage: rest.manualProfitPercentage !== undefined ? Number(rest.manualProfitPercentage) : null,
      credit: rest.credit === true,
      creditType: rest.creditType || null,
      paid: rest.paid === true,
      customerName: rest.customerName || null,
      customerPhone: rest.customerPhone || null,
      customerId: rest.customerId && rest.customerId !== "" ? rest.customerId : null,
      discount: rest.discount !== undefined ? Number(rest.discount) : 0,
      deposit: rest.deposit !== undefined ? Number(rest.deposit) : 0,
      fromBudget: rest.fromBudget === true,
      budgetId: rest.budgetId || null,
      concept: rest.concept || null,
      priceListId: rest.priceListId ? Number(rest.priceListId) : null,
    };

    return this.prisma.sale.create({
      data: {
        ...saleData,
        items: {
          create: items.map((item: any) => ({
            productId: Number(item.productId),
            productName: item.productName,
            quantity: Number(item.quantity),
            unit: item.unit,
            price: Number(item.price),
            size: item.size,
            color: item.color,
            discount: Number(item.discount || 0),
            surcharge: Number(item.surcharge || 0),
            basePrice: item.basePrice ? Number(item.basePrice) : null,
            notes: item.notes,
            description: item.description,
            rubro: item.rubro,
            fromBudget: item.fromBudget,
            budgetId: item.budgetId,
            costPrice: item.costPrice ? Number(item.costPrice) : null,
            profit: item.profit ? Number(item.profit) : null,
            profitPercentage: item.profitPercentage ? Number(item.profitPercentage) : null,
          })),
        },
        payments: payments
          ? {
              create: payments.map((payment: any) => ({
                amount: Number(payment.amount),
                date: payment.date ? new Date(payment.date) : new Date(),
                method: payment.method,
                checkNumber: payment.checkNumber,
                checkDate: payment.checkDate ? new Date(payment.checkDate) : null,
                checkBank: payment.checkBank,
                checkStatus: payment.checkStatus,
                checkDescription: payment.checkDescription,
                customerId: payment.customerId,
                customerName: payment.customerName,
                installmentNumber: payment.installmentNumber ? Number(payment.installmentNumber) : null,
                saleTotal: payment.saleTotal ? Number(payment.saleTotal) : null,
              })),
            }
          : undefined,
        installments: installments
          ? {
              create: installments.map((inst: any) => ({
                number: Number(inst.number),
                dueDate: new Date(inst.dueDate),
                amount: Number(inst.amount),
                interestAmount: Number(inst.interestAmount || 0),
                penaltyAmount: Number(inst.penaltyAmount || 0),
                status: inst.status || 'pendiente',
                totalAmount: Number(inst.totalAmount),
              })),
            }
          : undefined,
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
        payments: true,
        installments: true,
      },
    });
  }

  async update(id: number, data: any) {
    const { items, payments, installments, editHistory, products, paymentMethods, ...rest } = data;
    
    // Explicitly pick fields for update
    const saleData: any = {};
    if (rest.total !== undefined) saleData.total = Number(rest.total);
    if (rest.date !== undefined) saleData.date = new Date(rest.date);
    if (rest.barcode !== undefined) saleData.barcode = rest.barcode;
    if (rest.manualAmount !== undefined) saleData.manualAmount = Number(rest.manualAmount);
    if (rest.manualProfitPercentage !== undefined) saleData.manualProfitPercentage = Number(rest.manualProfitPercentage);
    if (rest.credit !== undefined) saleData.credit = rest.credit === true;
    if (rest.paid !== undefined) saleData.paid = rest.paid === true;
    if (rest.customerName !== undefined) saleData.customerName = rest.customerName;
    if (rest.customerPhone !== undefined) saleData.customerPhone = rest.customerPhone;
    if (rest.customerId !== undefined) saleData.customerId = rest.customerId && rest.customerId !== "" ? rest.customerId : null;
    if (rest.discount !== undefined) saleData.discount = Number(rest.discount);
    if (rest.deposit !== undefined) saleData.deposit = Number(rest.deposit);
    if (rest.concept !== undefined) saleData.concept = rest.concept;
    if (rest.priceListId !== undefined) saleData.priceListId = Number(rest.priceListId);

    if (editHistory) {
      const currentSale = await this.prisma.sale.findUnique({
        where: { id },
        select: { total: true },
      });
      if (currentSale) {
        await this.prisma.saleEditHistory.create({
          data: {
            saleId: id,
            changes: editHistory.changes,
            previousTotal: currentSale.total,
            newTotal: Number(data.total),
          },
        });
      }
    }
    
    await Promise.all([
      this.prisma.saleItem.deleteMany({ where: { saleId: id } }),
      this.prisma.payment.deleteMany({ where: { saleId: id } }),
      this.prisma.installment.deleteMany({ where: { creditSaleId: id } }),
    ]);

    return this.prisma.sale.update({
      where: { id },
      data: {
        ...saleData,
        edited: true,
        items: {
          create: items.map((item: any) => ({
            productId: Number(item.productId),
            productName: item.productName,
            quantity: Number(item.quantity),
            unit: item.unit,
            price: Number(item.price),
            size: item.size,
            color: item.color,
            discount: Number(item.discount || 0),
            surcharge: Number(item.surcharge || 0),
            basePrice: item.basePrice ? Number(item.basePrice) : null,
            notes: item.notes,
            description: item.description,
            rubro: item.rubro,
            fromBudget: item.fromBudget,
            budgetId: item.budgetId,
            costPrice: item.costPrice ? Number(item.costPrice) : null,
            profit: item.profit ? Number(item.profit) : null,
            profitPercentage: item.profitPercentage ? Number(item.profitPercentage) : null,
          })),
        },
        payments: payments
          ? {
              create: payments.map((payment: any) => ({
                amount: Number(payment.amount),
                date: payment.date ? new Date(payment.date) : new Date(),
                method: payment.method,
                checkNumber: payment.checkNumber,
                checkDate: payment.checkDate ? new Date(payment.checkDate) : null,
                checkBank: payment.checkBank,
                checkStatus: payment.checkStatus,
                checkDescription: payment.checkDescription,
                customerId: payment.customerId,
                customerName: payment.customerName,
                installmentNumber: payment.installmentNumber ? Number(payment.installmentNumber) : null,
                saleTotal: payment.saleTotal ? Number(payment.saleTotal) : null,
              })),
            }
          : undefined,
        installments: installments
          ? {
              create: installments.map((inst: any) => ({
                number: Number(inst.number),
                dueDate: new Date(inst.dueDate),
                amount: Number(inst.amount),
                interestAmount: Number(inst.interestAmount || 0),
                penaltyAmount: Number(inst.penaltyAmount || 0),
                status: inst.status || 'pendiente',
                totalAmount: Number(inst.totalAmount),
              })),
            }
          : undefined,
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
        payments: true,
        installments: true,
      },
    });
  }

  async delete(id: number) {
    return this.prisma.sale.delete({
      where: { id },
    });
  }
}
