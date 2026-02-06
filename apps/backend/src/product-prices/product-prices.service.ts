import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductPricesService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: number, filters?: any) {
    const where: any = {
      product: { userId } // Basic filter by user
    };
    
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

  async findOne(productId: number, priceListId: number, userId: number) {
    return this.prisma.productPrice.findFirst({
      where: {
        productId: Number(productId),
        priceListId: Number(priceListId),
        product: { userId }
      },
      include: {
        product: true,
        priceList: true,
      },
    });
  }

  async create(data: any, userId: number) {
    // Ensure both belong to user
    const [product, priceList] = await Promise.all([
      this.prisma.product.findFirst({ where: { id: Number(data.productId), userId } }),
      this.prisma.priceList.findFirst({ where: { id: Number(data.priceListId), userId } }),
    ]);

    if (!product || !priceList) {
      throw new ForbiddenException('Product or Price List not found or access denied');
    }

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

  async createMany(data: any[], userId: number) {
    // For simplicity, we trust the caller has validated the IDs, 
    // but a stricter check would be needed for production.
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

  async update(productId: number, priceListId: number, data: any, userId: number) {
    // Ensure access
    const existing = await this.findOne(productId, priceListId, userId);
    if (!existing) throw new ForbiddenException('Product price not found or access denied');

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

  async delete(productId: number, priceListId: number, userId: number) {
    // Ensure access
    const existing = await this.findOne(productId, priceListId, userId);
    if (!existing) throw new ForbiddenException('Product price not found or access denied');

    return this.prisma.productPrice.delete({
      where: {
        productId_priceListId: {
          productId: Number(productId),
          priceListId: Number(priceListId),
        },
      },
    });
  }

  async deleteByPriceList(priceListId: number, userId: number) {
    // Ensure price list belongs to user
    const priceList = await this.prisma.priceList.findFirst({
      where: { id: Number(priceListId), userId },
    });
    if (!priceList) throw new ForbiddenException('Price list not found or access denied');

    return this.prisma.productPrice.deleteMany({
      where: { priceListId: Number(priceListId) },
    });
  }

  async deleteByProduct(productId: number, userId: number) {
    // Ensure product belongs to user
    const product = await this.prisma.product.findFirst({
      where: { id: Number(productId), userId },
    });
    if (!product) throw new ForbiddenException('Product not found or access denied');

    return this.prisma.productPrice.deleteMany({
      where: { productId: Number(productId) },
    });
  }
}