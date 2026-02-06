import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PromotionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: number) {
    return this.prisma.promotion.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number, userId: number) {
    return this.prisma.promotion.findFirst({
      where: { id, userId },
    });
  }

  async create(data: any, userId: number) {
    return this.prisma.promotion.create({
      data: {
        ...data,
        userId,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
      },
    });
  }

  async update(id: number, data: any, userId: number) {
    // Ensure access
    const promotion = await this.findOne(id, userId);
    if (!promotion) throw new Error('Promotion not found or access denied');

    return this.prisma.promotion.update({
      where: { id },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });
  }

  async delete(id: number, userId: number) {
    // Ensure access
    const promotion = await this.findOne(id, userId);
    if (!promotion) throw new Error('Promotion not found or access denied');

    return this.prisma.promotion.delete({ where: { id } });
  }
}