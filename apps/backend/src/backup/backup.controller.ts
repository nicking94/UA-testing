import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { BackupService } from '@/backup/backup.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

@Controller('backup')
@UseGuards(JwtAuthGuard)
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Post('import')
  async importBackup(@Req() req: any, @Body() data: any) {
    return this.backupService.import(data, req.user.id);
  }

  @Get('export')
  async exportBackup(@Req() req: any) {
    return this.backupService.export(req.user.id);
  }
}
