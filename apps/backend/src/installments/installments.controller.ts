import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { InstallmentsService } from './installments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('installments')
@UseGuards(JwtAuthGuard)
export class InstallmentsController {
  constructor(private installmentsService: InstallmentsService) {}

  @Get()
  findAll(@Req() req: any, @Query() query: any) {
    return this.installmentsService.findAll(req.user.id, query);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.installmentsService.findOne(+id, req.user.id);
  }

  @Post()
  create(@Req() req: any, @Body() data: any) {
    return this.installmentsService.create(data, req.user.id);
  }

  @Post('bulk')
  createMany(@Req() req: any, @Body() data: any[]) {
    return this.installmentsService.createMany(data, req.user.id);
  }

  @Post('pay-multiple')
  payMultiple(
    @Req() req: any,
    @Body() data: { ids: number[]; paymentDate: Date; paymentMethod: string },
  ) {
    return this.installmentsService.payMultiple(
      data.ids,
      { paymentDate: data.paymentDate, paymentMethod: data.paymentMethod },
      req.user.id,
    );
  }

  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    return this.installmentsService.update(+id, data, req.user.id);
  }

  @Put(':id/pay')
  markAsPaid(
    @Req() req: any,
    @Param('id') id: string,
    @Body() paymentData: { paymentDate: Date; paymentMethod: string },
  ) {
    return this.installmentsService.markAsPaid(+id, paymentData, req.user.id);
  }

  @Delete(':id')
  delete(@Req() req: any, @Param('id') id: string) {
    return this.installmentsService.delete(+id, req.user.id);
  }
}