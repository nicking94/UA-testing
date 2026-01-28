import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { BackupService } from '@/backup/backup.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

@Controller('backup')
@UseGuards(JwtAuthGuard)
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Post('import')
  async importBackup(@Body() data: any) {
    return this.backupService.import(data);
  }

  @Get('export')
  async exportBackup() {
    return this.backupService.export();
  }
}
