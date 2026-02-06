import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: number, filters?: {
    saleId?: number;
    customerId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const where: any = {
      sale: { userId } // Filter by sale's userId
    };
    if (filters?.saleId) where.saleId = filters.saleId;
    if (filters?.customerId) where.customerId = filters.customerId;
    if (filters?.dateFrom || filters?.dateTo) {
      where.date = {};
      if (filters.dateFrom) where.date.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.date.lte = new Date(filters.dateTo);
    }
    return this.prisma.payment.findMany({
      where,
      include: { sale: true, customer: true },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(id: number, userId: number) {
    return this.prisma.payment.findFirst({
      where: { 
        id,
        sale: { userId }
      },
      include: { sale: true, customer: true }
    });
  }

  async create(data: any, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      // Ensure Sale belongs to User
      const sale = await tx.sale.findFirst({
        where: { id: data.saleId, userId },
        include: { payments: true, items: true }
      });
      if (!sale) throw new Error('Sale not found or access denied');

      const payment = await tx.payment.create({ data });

      // 1. Update Customer Balance (only if NOT a cheque) (Filtered by userId)
      if (payment.customerId && payment.method !== 'CHEQUE') {
        const customer = await tx.customer.findFirst({
          where: { id: payment.customerId, userId }
        });
        if (customer) {
          await tx.customer.update({
            where: { id: customer.id },
            data: {
              pendingBalance: {
                decrement: payment.amount
              }
            }
          });
        }
      }

      // 2. Update Sale Status
      // Cheques only count as paid when cleared
      const updatedPayments = await tx.payment.findMany({ where: { saleId: sale.id } });
      const totalPaid = updatedPayments.reduce((sum, p) => {
        if (p.method === 'CHEQUE' && p.checkStatus !== 'cobrado') return sum;
        return sum + p.amount;
      }, 0);

      if (totalPaid >= sale.total - 0.01) {
        await tx.sale.update({
          where: { id: sale.id },
          data: { paid: true }
        });
      }

      // 3. Create Daily Cash Movement (only if NOT a cheque) (Filtered by userId)
      if (payment.method !== 'CHEQUE') {
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

        // Calculate profit for this payment
        const totalCost = (sale.items as any[]).reduce((sum, item) => sum + (item.costPrice || 0) * item.quantity, 0);
        const totalProfitSale = sale.total - totalCost;
        const paymentRatio = payment.amount / sale.total;
        const paymentProfit = totalProfitSale * paymentRatio;

        await tx.dailyCashMovement.create({
          data: {
            dailyCashId: dailyCash.id,
            amount: payment.amount,
            description: `Cobro - ${payment.customerName || 'Cliente'} (Venta #${sale.id})`,
            type: "INGRESO",
            date: payment.date,
            paymentMethod: payment.method,
            customerName: payment.customerName,
            customerId: payment.customerId,
            paymentId: payment.id,
            originalSaleId: sale.id,
            profit: paymentProfit,
          }
        });
      }

      return payment;
    });
  }

  async update(id: number, data: any, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const oldPayment = await tx.payment.findFirst({ 
        where: { 
          id,
          sale: { userId }
        } 
      });
      if (!oldPayment) throw new Error('Payment not found or access denied');

      const updatedPayment = await tx.payment.update({ where: { id }, data });

      // Handle transition of cheque to cobrado
      if (oldPayment.method === 'CHEQUE' && oldPayment.checkStatus !== 'cobrado' && updatedPayment.checkStatus === 'cobrado') {
        // 1. Update Customer Balance (Filtered by userId)
        if (updatedPayment.customerId) {
          const customer = await tx.customer.findFirst({
            where: { id: updatedPayment.customerId, userId }
          });
          if (customer) {
            await tx.customer.update({
              where: { id: customer.id },
              data: { pendingBalance: { decrement: updatedPayment.amount } }
            });
          }
        }

        // 2. Update Sale Status
        const sale = await tx.sale.findFirst({
          where: { id: updatedPayment.saleId, userId },
          include: { payments: true, items: true }
        });

        if (sale) {
          const totalPaid = sale.payments.reduce((sum, p) => {
            if (p.method === 'CHEQUE' && p.checkStatus !== 'cobrado') return sum;
            return sum + p.amount;
          }, 0);

          if (totalPaid >= sale.total - 0.01) {
            await tx.sale.update({
              where: { id: sale.id },
              data: { paid: true }
            });
          }

          // 3. Create Daily Cash Movement (Filtered by userId)
          const today = new Date();
          const startOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0));
          const endOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1, 0, 0, 0));

          let dailyCash = await tx.dailyCash.findFirst({
            where: { userId, date: { gte: startOfDay, lt: endOfDay } }
          });

          if (!dailyCash) {
            dailyCash = await tx.dailyCash.create({
              data: { userId, date: startOfDay, closed: false }
            });
          }

          const totalCost = (sale.items as any[]).reduce((sum, item) => sum + (item.costPrice || 0) * item.quantity, 0);
          const totalProfitSale = sale.total - totalCost;
          const paymentRatio = updatedPayment.amount / sale.total;
          const paymentProfit = totalProfitSale * paymentRatio;

          await tx.dailyCashMovement.create({
            data: {
              dailyCashId: dailyCash.id,
              amount: updatedPayment.amount,
              description: `Cobro Cheque - ${updatedPayment.customerName || 'Cliente'} (Venta #${sale.id})`,
              type: "INGRESO",
              date: updatedPayment.date,
              paymentMethod: updatedPayment.method,
              customerName: updatedPayment.customerName,
              customerId: updatedPayment.customerId,
              paymentId: updatedPayment.id,
              originalSaleId: sale.id,
              profit: paymentProfit,
            }
          });
        }
      }

      return updatedPayment;
    });
  }

  async delete(id: number, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { 
          id,
          sale: { userId }
        },
        include: { sale: true }
      });

      if (!payment) return null;

      // 1. Revert Customer Balance (if it was already decremented) (Filtered by userId)
      if (payment.customerId && (payment.method !== 'CHEQUE' || payment.checkStatus === 'cobrado')) {
        const customer = await tx.customer.findFirst({
          where: { id: payment.customerId, userId }
        });
        if (customer) {
          await tx.customer.update({
            where: { id: customer.id },
            data: { pendingBalance: { increment: payment.amount } }
          });
        }
      }

      // 2. Revert Sale Status
      if (payment.sale) {
        const allPayments = await tx.payment.findMany({
          where: { saleId: payment.saleId, NOT: { id: payment.id } }
        });

        const totalPaid = allPayments.reduce((sum, p) => {
          if (p.method === 'CHEQUE' && p.checkStatus !== 'cobrado') return sum;
          return sum + p.amount;
        }, 0);

        if (totalPaid < payment.sale.total - 0.01) {
          await tx.sale.update({
            where: { id: payment.saleId },
            data: { paid: false }
          });
        }
      }

      // 3. Delete Daily Cash Movement
      await tx.dailyCashMovement.deleteMany({
        where: { paymentId: payment.id }
      });

      // 4. Delete the payment
      return tx.payment.delete({ where: { id } });
    });
  }
}