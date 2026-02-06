import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BudgetsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: number, filters?: { customerId?: string; status?: string }) {
    const where: any = { userId };
    if (filters?.customerId) where.customerId = filters.customerId;
    if (filters?.status) where.status = filters.status;
    return this.prisma.budget.findMany({
      where,
      include: { customer: true, items: true, budgetNotes: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: number) {
    return this.prisma.budget.findFirst({
      where: { id, userId },
      include: { customer: true, items: true, budgetNotes: true },
    });
  }

  async create(data: any, userId: number) {
    const { items, ...budgetData } = data;
    return this.prisma.budget.create({
      data: {
        ...budgetData,
        userId,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unit: item.unit,
            price: item.price,
            size: item.size,
            color: item.color,
            discount: item.discount || 0,
            surcharge: item.surcharge || 0,
            basePrice: item.basePrice,
            notes: item.notes,
            description: item.description,
            rubro: item.rubro,
            costPrice: item.costPrice,
            profit: item.profit,
            profitPercentage: item.profitPercentage,
          })),
        },
      },
      include: { customer: true, items: true },
    });
  }

  async update(id: string, data: any, userId: number) {
    // Ensure access
    const budget = await this.findOne(id, userId);
    if (!budget) throw new Error('Budget not found or access denied');

    const { items, ...budgetData } = data;

    await this.prisma.budgetItem.deleteMany({ where: { budgetId: id } });
    return this.prisma.budget.update({
      where: { id },
      data: {
        ...budgetData,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unit: item.unit,
            price: item.price,
            size: item.size,
            color: item.color,
            discount: item.discount || 0,
            surcharge: item.surcharge || 0,
            basePrice: item.basePrice,
            notes: item.notes,
            description: item.description,
            rubro: item.rubro,
            costPrice: item.costPrice,
            profit: item.profit,
            profitPercentage: item.profitPercentage,
          })),
        },
      },
      include: { customer: true, items: true },
    });
  }

  async delete(id: string, userId: number) {
    // Ensure access
    const budget = await this.findOne(id, userId);
    if (!budget) throw new Error('Budget not found or access denied');

    return this.prisma.budget.delete({ where: { id } });
  }
}