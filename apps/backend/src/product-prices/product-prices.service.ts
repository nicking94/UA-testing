import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductPricesService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: any) {
    const where: any = {};
    
    if (filters?.productId) {
      where.productId = Number(filters.productId);
    }
    
    if (filters?.priceListId) {
      where.priceListId = Number(filters.priceListId);
    }
    
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive === 'true' || filters.isActive === true;
    }

    return this.prisma.productPrice.findMany({
      where,
      include: {
        product: true,
        priceList: true,
      },
    });
  }

  async findOne(productId: number, priceListId: number) {
    return this.prisma.productPrice.findUnique({
      where: {
        productId_priceListId: {
          productId: Number(productId),
          priceListId: Number(priceListId),
        },
      },
      include: {
        product: true,
        priceList: true,
      },
    });
  }

  async create(data: any) {
    return this.prisma.productPrice.create({
      data: {
        ...data,
        productId: Number(data.productId),
        priceListId: Number(data.priceListId),
        price: Number(data.price),
      },
      include: {
        product: true,
        priceList: true,
      },
    });
  }

  async createMany(data: any[]) {
    const formattedData = data.map(item => ({
      ...item,
      productId: Number(item.productId),
      priceListId: Number(item.priceListId),
      price: Number(item.price),
    }));
    
    return this.prisma.productPrice.createMany({
      data: formattedData,
      skipDuplicates: true,
    });
  }

  async update(productId: number, priceListId: number, data: any) {
    return this.prisma.productPrice.update({
      where: {
        productId_priceListId: {
          productId: Number(productId),
          priceListId: Number(priceListId),
        },
      },
      data: {
        ...data,
        price: data.price !== undefined ? Number(data.price) : undefined,
      },
      include: {
        product: true,
        priceList: true,
      },
    });
  }

  async delete(productId: number, priceListId: number) {
    return this.prisma.productPrice.delete({
      where: {
        productId_priceListId: {
          productId: Number(productId),
          priceListId: Number(priceListId),
        },
      },
    });
  }

  async deleteByPriceList(priceListId: number) {
    return this.prisma.productPrice.deleteMany({
      where: { priceListId: Number(priceListId) },
    });
  }

  async deleteByProduct(productId: number) {
    return this.prisma.productPrice.deleteMany({
      where: { productId: Number(productId) },
    });
  }
}