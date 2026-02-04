import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InstallmentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: {
    creditSaleId?: number;
    status?: string;
    customerId?: string;
  }) {
    const where: any = {};
    if (filters?.creditSaleId) where.creditSaleId = Number(filters.creditSaleId);
    if (filters?.status) where.status = filters.status;
    if (filters?.customerId) {
      where.sale = { customerId: filters.customerId };
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

  async findOne(id: number) {
    return this.prisma.installment.findUnique({
      where: { id },
      include: {
        sale: {
          include: {
            customer: true,
          },
        },
      },
    });
  }

  async create(data: any) {
    return this.prisma.installment.create({
      data,
      include: {
        sale: true,
      },
    });
  }

  async createMany(data: any[]) {
    return this.prisma.installment.createMany({
      data,
    });
  }

  async update(id: number, data: any) {
    return this.prisma.installment.update({
      where: { id },
      data,
      include: {
        sale: true,
      },
    });
  }

  async delete(id: number) {
    return this.prisma.installment.delete({ where: { id } });
  }

  async markAsPaid(
    id: number,
    paymentData: { paymentDate: Date; paymentMethod: string },
  ) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Get installment info
      const installment = await tx.installment.findUnique({
        where: { id },
        include: {
          sale: {
            include: {
              customer: true
            }
          }
        }
      });

      if (!installment) throw new Error('Cuota no encontrada');
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

      // 3. Update Customer Balance (Decrease pending balance)
      const totalAmount = installment.amount + (installment.interestAmount || 0) + (installment.penaltyAmount || 0);
      
      if (installment.sale.customerId) {
        await tx.customer.update({
          where: { id: installment.sale.customerId },
          data: {
            pendingBalance: {
              decrement: totalAmount
            }
          }
        });
      }

      // 4. Create Daily Cash Movement (INGRESO)
      const today = new Date();
      const startOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0));
      const endOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1, 0, 0, 0));

      let dailyCash = await tx.dailyCash.findFirst({
        where: {
          date: {
            gte: startOfDay,
            lt: endOfDay,
          }
        }
      });

      if (!dailyCash) {
        dailyCash = await tx.dailyCash.create({
          data: {
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
  ) {
    return this.prisma.$transaction(async (tx) => {
      const results = [];
      
      for (const id of ids) {
        // Reuse markAsPaid logic but within this transaction
        // Since we are already in a transaction, we should use 'tx'
        // But for simplicity in this refactor, I'll implement it here
        
        const installment = await tx.installment.findUnique({
          where: { id },
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
          await tx.customer.update({
            where: { id: installment.sale.customerId },
            data: {
              pendingBalance: {
                decrement: totalAmount
              }
            }
          });
        }

        const today = new Date();
        const startOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0));
        const endOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1, 0, 0, 0));

        let dailyCash = await tx.dailyCash.findFirst({
          where: {
            date: {
              gte: startOfDay,
              lt: endOfDay,
            }
          }
        });

        if (!dailyCash) {
          dailyCash = await tx.dailyCash.create({
            data: {
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