import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SupplierProductsService {
  constructor(private prisma: PrismaService) {}

  async findBySupplier(supplierId: number, userId: number) {
    // Ensure supplier belongs to user
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: supplierId, userId },
    });
    if (!supplier) throw new ForbiddenException('Supplier not found or access denied');

    return this.prisma.supplierProduct.findMany({
      where: { supplierId },
      include: {
        product: true,
        supplier: true,
      },
    });
  }

  async findAll(userId: number) {
    return this.prisma.supplierProduct.findMany({
      where: {
        supplier: { userId },
      },
      include: {
        product: true,
        supplier: true,
      },
    });
  }

  async findByProduct(productId: number, userId: number) {
    // Ensure product belongs to user
    const product = await this.prisma.product.findFirst({
      where: { id: productId, userId },
    });
    if (!product) throw new ForbiddenException('Product not found or access denied');

    return this.prisma.supplierProduct.findMany({
      where: { productId },
      include: {
        supplier: true,
        product: true,
      },
    });
  }

  async create(data: { supplierId: number; productId: number }, userId: number) {
    // Ensure both belong to user
    const [supplier, product] = await Promise.all([
      this.prisma.supplier.findFirst({ where: { id: data.supplierId, userId } }),
      this.prisma.product.findFirst({ where: { id: data.productId, userId } }),
    ]);

    if (!supplier || !product) {
      throw new ForbiddenException('Supplier or Product not found or access denied');
    }

    return this.prisma.supplierProduct.create({
      data,
      include: {
        product: true,
        supplier: true,
      },
    });
  }

  async delete(supplierId: number, productId: number, userId: number) {
    // Ensure access via supplier
    const supplierProduct = await this.prisma.supplierProduct.findFirst({
      where: {
        supplierId,
        productId,
        supplier: { userId },
      },
    });

    if (!supplierProduct) throw new ForbiddenException('Relation not found or access denied');

    return this.prisma.supplierProduct.delete({
      where: {
        supplierId_productId: {
          supplierId,
          productId,
        },
      },
    });
  }

  async deleteBySupplier(supplierId: number, userId: number) {
    // Ensure supplier belongs to user
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: supplierId, userId },
    });
    if (!supplier) throw new ForbiddenException('Supplier not found or access denied');

    return this.prisma.supplierProduct.deleteMany({
      where: { supplierId },
    });
  }

  async deleteByProduct(productId: number, userId: number) {
    // Ensure product belongs to user
    const product = await this.prisma.product.findFirst({
      where: { id: productId, userId },
    });
    if (!product) throw new ForbiddenException('Product not found or access denied');

    return this.prisma.supplierProduct.deleteMany({
      where: { productId },
    });
  }
}