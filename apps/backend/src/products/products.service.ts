import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Rubro } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: number, filters?: {
    rubro?: Rubro;
    search?: string;
    minStock?: number;
  }) {
    const where: any = { userId };
    if (filters?.rubro && filters.rubro !== 'Todos_los_rubros') {
      where.rubro = filters.rubro;
    }
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { barcode: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters?.minStock !== undefined) {
      where.stock = { lte: filters.minStock };
    }
    return this.prisma.product.findMany({
      where,
      include: {
        productPrices: {
          include: {
            priceList: true,
          },
        },
        customCategories: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number, userId: number) {
    return this.prisma.product.findFirst({
      where: { id, userId },
      include: {
        productPrices: {
          include: {
            priceList: true,
          },
        },
        customCategories: true,
      },
    });
  }

  async findByBarcode(barcode: string, userId: number) {
    return this.prisma.product.findFirst({
      where: { barcode, userId },
      include: {
        productPrices: {
          include: {
            priceList: true,
          },
        },
      },
    });
  }

  async create(data: any, userId: number) {
    const { customCategories, productPrices, ...productData } = data;
    return this.prisma.product.create({
      data: {
        ...productData,
        userId,
        customCategories: customCategories
          ? {
              create: customCategories.map((cat: any) => ({
                name: cat.name,
                rubro: cat.rubro,
              })),
            }
          : undefined,
        productPrices: productPrices
          ? {
              create: productPrices.map((pp: any) => ({
                priceListId: pp.priceListId,
                price: pp.price,
                costPrice: pp.costPrice,
              })),
            }
          : undefined,
      },
      include: {
        productPrices: {
          include: {
            priceList: true,
          },
        },
        customCategories: true,
      },
    });
  }

  async update(id: number, data: any, userId: number) {
    const { customCategories, productPrices, ...productData } = data;
    
    // Ensure product belongs to user
    const product = await this.findOne(id, userId);
    if (!product) throw new Error('Product not found or access denied');

    if (customCategories !== undefined) {
      await this.prisma.productCustomCategory.deleteMany({
        where: { productId: id },
      });
    }
    return this.prisma.product.update({
      where: { id },
      data: {
        ...productData,
        customCategories: customCategories
          ? {
              create: customCategories.map((cat: any) => ({
                name: cat.name,
                rubro: cat.rubro,
              })),
            }
          : undefined,
        productPrices: productPrices
          ? {
              deleteMany: {},
              create: productPrices.map((pp: any) => ({
                priceListId: pp.priceListId,
                price: pp.price,
                costPrice: pp.costPrice,
              })),
            }
          : undefined,
      },
      include: {
        productPrices: {
          include: {
            priceList: true,
          },
        },
        customCategories: true,
      },
    });
  }

  async delete(id: number, userId: number) {
    // Ensure product belongs to user
    const product = await this.findOne(id, userId);
    if (!product) throw new Error('Product not found or access denied');

    return this.prisma.product.delete({
      where: { id },
    });
  }

  async updateStock(id: number, stock: number, userId: number) {
    // Ensure product belongs to user
    const product = await this.findOne(id, userId);
    if (!product) throw new Error('Product not found or access denied');

    return this.prisma.product.update({
      where: { id },
      data: { stock },
    });
  }
}
