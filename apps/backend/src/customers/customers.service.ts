import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: number, filters?: {
    search?: string;
    status?: string;
    rubro?: string;
  }) {
    const where: any = { userId };
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { id: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.rubro) {
      where.rubro = filters.rubro;
    }
    return this.prisma.customer.findMany({
      where,
      include: {
        _count: {
          select: {
            sales: true,
            budgets: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, userId: number) {
    return this.prisma.customer.findFirst({
      where: { id, userId },
      include: {
        sales: {
          take: 10,
          orderBy: { date: 'desc' },
        },
        budgets: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        customerNotes: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async create(data: any, userId: number) {
    return this.prisma.customer.create({
      data: {
        userId,
        id: data.id.toLowerCase(),
        name: data.name,
        phone: data.phone,
        email: data.email,
        address: data.address,
        cuitDni: data.cuitDni,
        status: data.status || 'activo',
        rubro: data.rubro,
        notes: data.notes,
        isTemporary: data.isTemporary || false,
      },
    });
  }

  async update(id: string, data: any, userId: number) {
    // Ensure access
    const customer = await this.findOne(id, userId);
    if (!customer) throw new Error('Customer not found or access denied');

    return this.prisma.customer.update({
      where: { id },
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        address: data.address,
        cuitDni: data.cuitDni,
        status: data.status,
        rubro: data.rubro,
        notes: data.notes,
      },
    });
  }

  async delete(id: string, userId: number) {
    // Ensure access
    const customer = await this.findOne(id, userId);
    if (!customer) throw new Error('Customer not found or access denied');

    return this.prisma.customer.delete({
      where: { id },
    });
  }

  async updateBalance(id: string, amount: number, userId: number) {
    const customer = await this.findOne(id, userId);
    if (!customer) throw new Error('Customer not found or access denied');

    return this.prisma.customer.update({
      where: { id },
      data: {
        pendingBalance: (customer?.pendingBalance || 0) + amount,
      },
    });
  }
}