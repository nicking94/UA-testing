import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BusinessDataService {
  constructor(private prisma: PrismaService) {}

  async findOne(userId: number) {
    return this.prisma.businessData.findFirst({
      where: { userId },
    });
  }

  async create(data: any, userId: number) {
    return this.prisma.businessData.create({
      data: {
        ...data,
        userId,
      },
    });
  }

  async update(id: number, data: any, userId: number) {
    // Ensure access
    const existing = await this.prisma.businessData.findFirst({
      where: { id, userId },
    });
    if (!existing) throw new Error('Business data not found or access denied');

    return this.prisma.businessData.update({
      where: { id },
      data,
    });
  }
}