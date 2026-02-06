import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { convertToBaseUnit, convertFromBaseUnit } from '../common/utils/unit-conversion';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: number, filters?: {
    dateFrom?: string;
    dateTo?: string;
    customerId?: string;
    credit?: string | boolean;
    priceListId?: string | number;
  }) {
    const where: any = { userId };
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

  async findOne(id: number, userId: number) {
    return this.prisma.sale.findFirst({
      where: { id, userId },
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

  async create(data: any, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const { 
        items, 
        payments, 
        installments, 
        products, 
        paymentMethods, 
        ...rest 
      } = data;
      
      const saleData = {
        userId,
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

      // 1. Create the Sale
      const createdSale = await tx.sale.create({
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
          items: true,
          payments: true,
        }
      });

      // 2. Update Product Stock (Filtered by userId)
      for (const item of items) {
        const product = await tx.product.findFirst({
          where: { id: Number(item.productId), userId }
        });
        
        if (product) {
          const soldInBase = convertToBaseUnit(Number(item.quantity), item.unit);
          const currentStockInBase = convertToBaseUnit(product.stock, product.unit);
          const newStockInBase = currentStockInBase - soldInBase;
          const newStock = convertFromBaseUnit(newStockInBase, product.unit);
          
          await tx.product.update({
            where: { id: product.id },
            data: { stock: parseFloat(newStock.toFixed(3)) }
          });
        }
      }

      // 3. Update Customer Balance (Filtered by userId)
      if (saleData.credit && saleData.customerId) {
        const customer = await tx.customer.findFirst({
          where: { id: saleData.customerId, userId }
        });
        if (customer) {
          await tx.customer.update({
            where: { id: customer.id },
            data: {
              pendingBalance: {
                increment: saleData.total
              }
            }
          });
        }
      }

      // 4. Create Daily Cash Movement (Filtered by userId)
      const today = new Date();
      const startOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0));
      const endOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1, 0, 0, 0));

      let dailyCash = await tx.dailyCash.findFirst({
        where: {
          userId,
          date: {
            gte: startOfDay,
            lt: endOfDay,
          }
        }
      });

      if (!dailyCash) {
        dailyCash = await tx.dailyCash.create({
          data: {
            userId,
            date: startOfDay,
            closed: false,
          }
        });
      }

      const totalProfit = items.reduce((sum: number, item: any) => sum + (item.profit || 0), 0) + 
                          ((saleData.manualAmount || 0) * (saleData.manualProfitPercentage || 0) / 100);

      // Create main movement
      await tx.dailyCashMovement.create({
        data: {
          dailyCashId: dailyCash.id,
          amount: saleData.total,
          description: `Venta - ${saleData.concept || "general"}`,
          type: "INGRESO",
          date: saleData.date,
          paymentMethod: payments && payments.length > 0 ? payments[0].method : (saleData.credit ? 'CUENTA_CORRIENTE' : 'EFECTIVO'),
          profit: totalProfit,
          customerName: saleData.customerName || "CLIENTE OCASIONAL",
          customerId: saleData.customerId,
          originalSaleId: createdSale.id,
          rubro: items[0]?.rubro,
          productId: items.length === 1 ? items[0].productId : null,
          productName: items.length === 1 ? items[0].productName : null,
          quantity: items.length === 1 ? items[0].quantity : null,
          unit: items.length === 1 ? items[0].unit : null,
        }
      });

      return createdSale;
    });
  }

  async update(id: number, data: any, userId: number) {
    // Ensure sale belongs to user
    const existingSale = await this.findOne(id, userId);
    if (!existingSale) throw new Error('Sale not found or access denied');

    const { items, payments, installments, editHistory, products, paymentMethods, ...rest } = data;
    
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

    return this.prisma.$transaction(async (tx) => {
      if (editHistory) {
        await tx.saleEditHistory.create({
          data: {
            saleId: id,
            changes: editHistory.changes,
            previousTotal: existingSale.total,
            newTotal: Number(data.total),
          },
        });
      }
      
      await Promise.all([
        tx.saleItem.deleteMany({ where: { saleId: id } }),
        tx.payment.deleteMany({ where: { saleId: id } }),
        tx.installment.deleteMany({ where: { creditSaleId: id } }),
      ]);

      return tx.sale.update({
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
    });
  }

  async delete(id: number, userId: number) {
    // Ensure sale belongs to user
    const existingSale = await this.findOne(id, userId);
    if (!existingSale) throw new Error('Sale not found or access denied');

    return this.prisma.sale.delete({
      where: { id },
    });
  }
}
