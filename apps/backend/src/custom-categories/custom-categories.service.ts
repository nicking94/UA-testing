import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomCategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: number, filters?: { rubro?: string }) {
    const where: any = { userId };
    if (filters?.rubro && filters.rubro !== 'Todos los rubros') {
      where.rubro = filters.rubro;
    }
    return this.prisma.customCategory.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number, userId: number) {
    return this.prisma.customCategory.findFirst({
      where: { id, userId },
    });
  }

  async create(data: any, userId: number) {
    return this.prisma.customCategory.create({
      data: {
        ...data,
        userId,
      },
    });
  }

  async update(id: number, data: any, userId: number) {
    // Ensure access
    const category = await this.findOne(id, userId);
    if (!category) throw new Error('Custom category not found or access denied');

    return this.prisma.customCategory.update({
      where: { id },
      data,
    });
  }

  async delete(id: number, userId: number) {
    // Ensure access
    const category = await this.findOne(id, userId);
    if (!category) throw new Error('Custom category not found or access denied');

    return this.prisma.customCategory.delete({ where: { id } });
  }
}