import { Module } from '@nestjs/common';
import { CustomCategoriesController } from './custom-categories.controller';
import { CustomCategoriesService } from './custom-categories.service';
import { PrismaModule } from '../prisma/prisma.module';
@Module({
  imports: [PrismaModule],
  controllers: [CustomCategoriesController],
  providers: [CustomCategoriesService],
  exports: [CustomCategoriesService],
})
export class CustomCategoriesModule {}
