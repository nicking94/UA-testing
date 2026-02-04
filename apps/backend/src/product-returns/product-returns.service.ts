import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { convertToBaseUnit } from '../common/utils/unit-conversion';

@Injectable()
export class ProductReturnsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: {
    productId?: number;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const where: any = {};
    if (filters?.productId) where.productId = filters.productId;
    if (filters?.dateFrom || filters?.dateTo) {
      where.date = {};
      if (filters.dateFrom) where.date.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.date.lte = new Date(filters.dateTo);
    }
    return this.prisma.productReturn.findMany({
      where,
      include: {
        product: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(id: number) {
    return this.prisma.productReturn.findUnique({
      where: { id },
      include: {
        product: true,
      },
    });
  }

  async create(data: any) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Create the return record
      const productReturn = await tx.productReturn.create({
        data: {
          ...data,
          date: data.date ? new Date(data.date) : new Date(),
        },
        include: {
          product: true,
        },
      });

      // 2. Update Product Stock (Increase stock)
      const product = productReturn.product;
      const quantityInBase = convertToBaseUnit(productReturn.stockAdded, (productReturn.unit as string) || (product.unit as string));
      
      await tx.product.update({
        where: { id: product.id },
        data: {
          stock: {
            increment: quantityInBase
          }
        }
      });

      // 3. Create Daily Cash Movement (EGRESO for the refund)
      // We use 'amount' field from ProductReturn as the refund amount
      const refundAmount = productReturn.amount || 0;
      if (refundAmount > 0) {
        const today = new Date();
        const startOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0));
        const endOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1, 0, 0, 0));

        let dailyCash = await tx.dailyCash.findFirst({
          where: {
            date: {
              gte: startOfDay,
              lt: endOfDay,
            }
          }
        });

        if (!dailyCash) {
          dailyCash = await tx.dailyCash.create({
            data: {
              date: startOfDay,
              closed: false,
            }
          });
        }

        await tx.dailyCashMovement.create({
          data: {
            dailyCashId: dailyCash.id,
            amount: refundAmount,
            description: `Devolución: ${product.name} - ${productReturn.reason || 'Sin motivo'}`,
            type: "EGRESO",
            date: productReturn.date,
            paymentMethod: "EFECTIVO",
            productId: product.id,
            productName: product.name,
            costPrice: product.costPrice,
            sellPrice: product.price,
            quantity: productReturn.stockAdded,
            profit: productReturn.profit, // Use calculated profit from return
            unit: (productReturn.unit as any) || (product.unit as any),
            productReturnId: productReturn.id,
          }
        });
      }

      return productReturn;
    });
  }

  async update(id: number, data: any) {
    return this.prisma.productReturn.update({
      where: { id },
      data,
      include: {
        product: true,
      },
    });
  }

  async delete(id: number) {
    return this.prisma.$transaction(async (tx) => {
      const productReturn = await tx.productReturn.findUnique({
        where: { id },
        include: { product: true }
      });

      if (!productReturn) return null;

      // Reverse stock update
      const quantityInBase = convertToBaseUnit(productReturn.stockAdded, (productReturn.unit as string) || (productReturn.product.unit as string));
      await tx.product.update({
        where: { id: productReturn.productId },
        data: {
          stock: {
            decrement: quantityInBase
          }
        }
      });

      // Delete associated cash movements
      await tx.dailyCashMovement.deleteMany({
        where: { productReturnId: productReturn.id }
      });

      return tx.productReturn.delete({ where: { id } });
    });
  }
}