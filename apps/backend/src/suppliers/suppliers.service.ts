import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: number) {
    return this.prisma.supplier.findMany({
      where: { userId },
      include: {
        supplierProducts: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async findOne(id: number, userId: number) {
    return this.prisma.supplier.findFirst({
      where: { id, userId },
      include: {
        supplierProducts: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async create(data: any, userId: number) {
    return this.prisma.supplier.create({
      data: {
        ...data,
        userId,
      },
    });
  }

  async update(id: number, data: any, userId: number) {
    // Ensure access
    const supplier = await this.findOne(id, userId);
    if (!supplier) throw new Error('Supplier not found or access denied');

    return this.prisma.supplier.update({
      where: { id },
      data,
    });
  }

  async delete(id: number, userId: number) {
    // Ensure access
    const supplier = await this.findOne(id, userId);
    if (!supplier) throw new Error('Supplier not found or access denied');

    return this.prisma.supplier.delete({
      where: { id },
    });
  }
}