import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PriceListsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: number) {
    return this.prisma.priceList.findMany({
      where: { userId },
      include: { productPrices: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number, userId: number) {
    return this.prisma.priceList.findFirst({
      where: { id, userId },
      include: { productPrices: { include: { product: true } } },
    });
  }

  async create(data: any, userId: number) {
    const { id, ...createData } = data;
    
    // Safety check: prevent duplicate names for the same user and rubro
    if (createData.name && createData.rubro) {
      const existing = await this.prisma.priceList.findFirst({
        where: {
          userId,
          name: { equals: createData.name, mode: 'insensitive' },
          rubro: createData.rubro,
        }
      });
      if (existing) return existing;
    }

    return this.prisma.priceList.create({ 
      data: {
        ...createData,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      } 
    });
  }

  async update(id: number, data: any, userId: number) {
    // Ensure access
    const existing = await this.findOne(id, userId);
    if (!existing) throw new Error('Price list not found or access denied');

    return this.prisma.priceList.update({ 
      where: { id }, 
      data: {
        ...data,
        updatedAt: new Date(),
      } 
    });
  }

  async delete(id: number, userId: number) {
    // Ensure access
    const existing = await this.findOne(id, userId);
    if (!existing) throw new Error('Price list not found or access denied');

    return this.prisma.priceList.delete({ where: { id } });
  }
}