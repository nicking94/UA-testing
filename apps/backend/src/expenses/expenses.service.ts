import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: {
    dateFrom?: string;
    dateTo?: string;
    type?: string;
  }) {
    const where: any = {};
    if (filters?.dateFrom || filters?.dateTo) {
      where.date = {};
      if (filters.dateFrom) where.date.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.date.lte = new Date(filters.dateTo);
    }
    if (filters?.type) where.type = filters.type;
    return this.prisma.expense.findMany({ where, orderBy: { date: 'desc' } });
  }

  async create(data: any) {
    return this.prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: { ...data, date: new Date(data.date) },
      });

      // Create Daily Cash Movement
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
          amount: expense.amount,
          description: expense.description || `Gasto - ${expense.category}`,
          type: expense.type, // INGRESO or EGRESO
          date: expense.date,
          paymentMethod: expense.paymentMethod,
          expenseCategory: expense.category,
          expenseId: expense.id,
          rubro: expense.rubro,
        }
      });

      return expense;
    });
  }

  async update(id: number, data: any) {
    // Updates are complex because they might affect movements.
    // For now, we update the expense itself.
    return this.prisma.expense.update({ where: { id }, data });
  }

  async delete(id: number) {
    return this.prisma.$transaction(async (tx) => {
      const expense = await tx.expense.findUnique({ where: { id } });
      if (!expense) return null;

      // Delete associated cash movements
      await tx.dailyCashMovement.deleteMany({
        where: { expenseId: expense.id }
      });

      return tx.expense.delete({ where: { id } });
    });
  }
}