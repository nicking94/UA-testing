import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    // This might be for admins only, but for now let's keep it
    return this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        logo: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findOne(id: number, requestingUserId: number) {
    // Ensure user is requesting their own data
    if (id !== requestingUserId) {
        throw new ForbiddenException('You can only access your own profile');
    }

    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        logo: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async update(
    id: number,
    data: { username?: string; logo?: string; isActive?: boolean },
    requestingUserId: number
  ) {
    // Ensure user is updating their own data
    if (id !== requestingUserId) {
        throw new ForbiddenException('You can only update your own profile');
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        logo: true,
        isActive: true,
      },
    });
  }
}