import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PriceListsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.priceList.findMany({
      include: { productPrices: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    return this.prisma.priceList.findUnique({
      where: { id },
      include: { productPrices: { include: { product: true } } },
    });
  }

  async create(data: any) {
    const { id, ...createData } = data;
    
    // Safety check: prevent duplicate defaults/names for the same rubro
    if (createData.name && createData.rubro) {
      const existing = await this.prisma.priceList.findFirst({
        where: {
          name: { equals: createData.name, mode: 'insensitive' },
          rubro: createData.rubro,
        }
      });
      if (existing) return existing;
    }

    return this.prisma.priceList.create({ 
      data: {
        ...createData,
        createdAt: new Date(),
        updatedAt: new Date(),
      } 
    });
  }

  async update(id: number, data: any) {
    return this.prisma.priceList.update({ 
      where: { id }, 
      data: {
        ...data,
        updatedAt: new Date(),
      } 
    });
  }

  async delete(id: number) {
    return this.prisma.priceList.delete({ where: { id } });
  }
}