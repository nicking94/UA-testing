import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExpenseCategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: number, filters?: { rubro?: string; type?: string }) {
    const where: any = { userId };
    if (filters?.rubro && filters.rubro !== 'Todos los rubros') {
      where.rubro = filters.rubro;
    }
    if (filters?.type && filters.type !== 'TODOS') {
      where.type = filters.type;
    }
    return this.prisma.expenseCategory.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number, userId: number) {
    return this.prisma.expenseCategory.findFirst({
      where: { id, userId },
    });
  }

  async create(data: any, userId: number) {
    return this.prisma.expenseCategory.create({
      data: {
        ...data,
        userId,
      },
    });
  }

  async update(id: number, data: any, userId: number) {
    // Ensure access
    const category = await this.findOne(id, userId);
    if (!category) throw new Error('Expense category not found or access denied');

    return this.prisma.expenseCategory.update({
      where: { id },
      data,
    });
  }

  async delete(id: number, userId: number) {
    // Ensure access
    const category = await this.findOne(id, userId);
    if (!category) throw new Error('Expense category not found or access denied');

    return this.prisma.expenseCategory.delete({ where: { id } });
  }
}