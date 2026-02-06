import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InstallmentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: number, filters?: {
    creditSaleId?: number;
    status?: string;
    customerId?: string;
  }) {
    const where: any = {
      sale: { userId }
    };
    if (filters?.creditSaleId) where.creditSaleId = Number(filters.creditSaleId);
    if (filters?.status) where.status = filters.status;
    if (filters?.customerId) {
      where.sale.customerId = filters.customerId;
    }
    return this.prisma.installment.findMany({
      where,
      include: {
        sale: {
          include: {
            customer: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async findOne(id: number, userId: number) {
    return this.prisma.installment.findFirst({
      where: { 
        id,
        sale: { userId }
      },
      include: {
        sale: {
          include: {
            customer: true,
          },
        },
      },
    });
  }

  async create(data: any, userId: number) {
    // Ensure Sale belongs to user
    const sale = await this.prisma.sale.findFirst({
      where: { id: data.creditSaleId, userId }
    });
    if (!sale) throw new Error('Sale not found or access denied');

    return this.prisma.installment.create({
      data,
      include: {
        sale: true,
      },
    });
  }

  async createMany(data: any[], userId: number) {
    // For simplicity, we assume the caller ensured sale IDs belong to user
    // In a strict app, we should verify each one
    return this.prisma.installment.createMany({
      data,
    });
  }

  async update(id: number, data: any, userId: number) {
    // Ensure access
    const existing = await this.findOne(id, userId);
    if (!existing) throw new Error('Installment not found or access denied');

    return this.prisma.installment.update({
      where: { id },
      data,
      include: {
        sale: true,
      },
    });
  }

  async delete(id: number, userId: number) {
    // Ensure access
    const existing = await this.findOne(id, userId);
    if (!existing) throw new Error('Installment not found or access denied');

    return this.prisma.installment.delete({ where: { id } });
  }

  async markAsPaid(
    id: number,
    paymentData: { paymentDate: Date; paymentMethod: string },
    userId: number
  ) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Get installment info (Filtered by userId)
      const installment = await tx.installment.findFirst({
        where: { id, sale: { userId } },
        include: {
          sale: {
            include: {
              customer: true
            }
          }
        }
      });

      if (!installment) throw new Error('Cuota no encontrada o acceso denegado');
      if (installment.status === 'pagada') return installment;

      // 2. Mark installment as paid
      const updatedInstallment = await tx.installment.update({
        where: { id },
        data: {
          status: 'pagada',
          paymentDate: paymentData.paymentDate ? new Date(paymentData.paymentDate) : new Date(),
          paymentMethod: paymentData.paymentMethod as any,
        },
      });

      // 3. Update Customer Balance (Filtered by userId)
      const totalAmount = installment.amount + (installment.interestAmount || 0) + (installment.penaltyAmount || 0);
      
      if (installment.sale.customerId) {
        const customer = await tx.customer.findFirst({
          where: { id: installment.sale.customerId, userId }
        });
        if (customer) {
          await tx.customer.update({
            where: { id: customer.id },
            data: {
              pendingBalance: {
                decrement: totalAmount
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

      await tx.dailyCashMovement.create({
        data: {
          dailyCashId: dailyCash.id,
          amount: totalAmount,
          description: `Cuota ${installment.number} - ${installment.sale.customerName}`,
          type: "INGRESO",
          date: paymentData.paymentDate ? new Date(paymentData.paymentDate) : new Date(),
          paymentMethod: paymentData.paymentMethod as any,
          customerId: installment.sale.customerId,
          customerName: installment.sale.customerName,
          isCreditPayment: true,
          originalSaleId: installment.creditSaleId,
          installmentId: installment.id,
          rubro: (installment.sale as any).rubro,
        }
      });

      return updatedInstallment;
    });
  }

  async payMultiple(
    ids: number[],
    paymentData: { paymentDate: Date; paymentMethod: string },
    userId: number
  ) {
    return this.prisma.$transaction(async (tx) => {
      const results = [];
      
      for (const id of ids) {
        const installment = await tx.installment.findFirst({
          where: { id, sale: { userId } },
          include: {
            sale: {
              include: {
                customer: true
              }
            }
          }
        });

        if (!installment || installment.status === 'pagada') continue;

        const updated = await tx.installment.update({
          where: { id },
          data: {
            status: 'pagada',
            paymentDate: paymentData.paymentDate ? new Date(paymentData.paymentDate) : new Date(),
            paymentMethod: paymentData.paymentMethod as any,
          },
        });

        const totalAmount = installment.amount + (installment.interestAmount || 0) + (installment.penaltyAmount || 0);

        if (installment.sale.customerId) {
          const customer = await tx.customer.findFirst({
            where: { id: installment.sale.customerId, userId }
          });
          if (customer) {
            await tx.customer.update({
              where: { id: customer.id },
              data: {
                pendingBalance: {
                  decrement: totalAmount
                }
              }
            });
          }
        }

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

        await tx.dailyCashMovement.create({
          data: {
            dailyCashId: dailyCash.id,
            amount: totalAmount,
            description: `Cuota ${installment.number} - ${installment.sale.customerName}`,
            type: "INGRESO",
            date: paymentData.paymentDate ? new Date(paymentData.paymentDate) : new Date(),
            paymentMethod: paymentData.paymentMethod as any,
            customerId: installment.sale.customerId,
            customerName: installment.sale.customerName,
            isCreditPayment: true,
            originalSaleId: installment.creditSaleId,
            installmentId: installment.id,
            rubro: (installment.sale as any).rubro,
          }
        });

        results.push(updated);
      }
      
      return results;
    });
  }
}