import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
@Injectable()
export class UserPreferencesService {
  constructor(private prisma: PrismaService) {}
  async findOne(userId?: number) {
    const where = userId ? { userId } : {};
    return this.prisma.userPreferences.findFirst({
      where,
      orderBy: { id: 'desc' },
    });
  }
  async create(data: any) {
    return this.prisma.userPreferences.create({ data });
  }
  async update(id: number, data: any) {
    if (isNaN(id)) {
      throw new Error('Invalid ID provided for update');
    }
    return this.prisma.userPreferences.update({ where: { id }, data });
  }
  async upsert(data: any) {
    const { userId, ...rest } = data;
    const existing = await this.prisma.userPreferences.findFirst({
      where: userId ? { userId } : undefined,
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
