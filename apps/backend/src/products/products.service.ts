import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Rubro } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: {
    rubro?: Rubro;
    search?: string;
    minStock?: number;
  }) {
    const where: any = {};
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

  async findOne(id: number) {
    return this.prisma.product.findUnique({
      where: { id },
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

  async findByBarcode(barcode: string) {
    return this.prisma.product.findUnique({
      where: { barcode },
      include: {
        productPrices: {
          include: {
            priceList: true,
          },
        },
      },
    });
  }

  async create(data: any) {
    const { customCategories, productPrices, ...productData } = data;
    return this.prisma.product.create({
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

  async update(id: number, data: any) {
    const { customCategories, productPrices, ...productData } = data;
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

  async delete(id: number) {
    return this.prisma.product.delete({
      where: { id },
    });
  }

  async updateStock(id: number, stock: number) {
    return this.prisma.product.update({
      where: { id },
      data: { stock },
    });
  }
}
