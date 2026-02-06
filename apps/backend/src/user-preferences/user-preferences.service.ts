import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserPreferencesService {
  constructor(private prisma: PrismaService) {}

  async findOne(userId: number) {
    return this.prisma.userPreferences.findFirst({
      where: { userId },
      orderBy: { id: 'desc' },
    });
  }

  async create(data: any, userId: number) {
    return this.prisma.userPreferences.create({
      data: {
        ...data,
        userId,
      },
    });
  }

  async update(id: number, data: any, userId: number) {
    if (isNaN(id)) {
      throw new Error('Invalid ID provided for update');
    }
    // Ensure access
    const existing = await this.prisma.userPreferences.findFirst({
      where: { id, userId },
    });
    if (!existing) throw new Error('User preferences not found or access denied');

    return this.prisma.userPreferences.update({ where: { id }, data });
  }

  async upsert(data: any, userId: number) {
    const { userId: _, ...rest } = data;
    const existing = await this.prisma.userPreferences.findFirst({
      where: { userId },
      orderBy: { id: 'desc' },
    });

    // Clean data to avoid sending id, createdAt, updatedAt if they exist in rest
    const cleanData = { ...rest };
    delete (cleanData as any).id;
    delete (cleanData as any).createdAt;
    delete (cleanData as any).updatedAt;

    if (existing) {
      return this.prisma.userPreferences.update({
        where: { id: existing.id },
        data: cleanData,
      });
    }
    return this.prisma.userPreferences.create({
      data: { ...cleanData, userId },
    });
  }
}
