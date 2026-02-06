import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: number, filters?: { read?: boolean; type?: string }) {
    const where: any = { userId, isDeleted: false };
    if (filters?.read !== undefined) where.read = filters.read;
    if (filters?.type) where.type = filters.type;
    return this.prisma.notification.findMany({
      where,
      orderBy: { date: 'desc' },
    });
  }

  async findOne(id: number, userId: number) {
    return this.prisma.notification.findFirst({
      where: { id, userId },
    });
  }

  async create(data: any, userId: number) {
    return this.prisma.notification.create({
      data: {
        ...data,
        userId,
      },
    });
  }

  async markAsRead(id: number, userId: number) {
    // Ensure access
    const notification = await this.findOne(id, userId);
    if (!notification) throw new Error('Notification not found or access denied');

    return this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  }

  async delete(id: number, userId: number) {
    // Ensure access
    const notification = await this.findOne(id, userId);
    if (!notification) throw new Error('Notification not found or access denied');

    return this.prisma.notification.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  async markAllAsRead(userId: number) {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  async getUnreadCount(userId: number) {
    return this.prisma.notification.count({
      where: { userId, read: false, isDeleted: false },
    });
  }
}