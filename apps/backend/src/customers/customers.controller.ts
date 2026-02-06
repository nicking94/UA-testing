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
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Get()
  findAll(@Req() req: any, @Query() query: any) {
    return this.customersService.findAll(req.user.id, query);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.customersService.findOne(id, req.user.id);
  }

  @Post()
  create(@Req() req: any, @Body() data: any) {
    return this.customersService.create(data, req.user.id);
  }

  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    return this.customersService.update(id, data, req.user.id);
  }

  @Put(':id/balance')
  updateBalance(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { amount: number },
  ) {
    return this.customersService.updateBalance(id, body.amount, req.user.id);
  }

  @Delete(':id')
  delete(@Req() req: any, @Param('id') id: string) {
    return this.customersService.delete(id, req.user.id);
  }
}