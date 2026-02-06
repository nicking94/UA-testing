import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class BackupService {
  constructor(private prisma: PrismaService) {}

  async export(userId: number) {
    try {
      const [
        products,
        customers,
        suppliers,
        sales,
        payments,
        dailyCash,
        expenses,
        budgets,
        promotions,
        businessData,
        userPreferences,
        expenseCategories,
        customCategories,
        productReturns,
        priceLists,
        productPrices,
      ] = await Promise.all([
        this.prisma.product.findMany({ where: { userId } }),
        this.prisma.customer.findMany({ where: { userId } }),
        this.prisma.supplier.findMany({ where: { userId } }),
        this.prisma.sale.findMany({
          where: { userId },
          include: { items: true, installments: true },
        }),
        this.prisma.payment.findMany({
          where: { sale: { userId } }
        }),
        this.prisma.dailyCash.findMany({
          where: { userId },
          include: { movements: true },
        }),
        this.prisma.expense.findMany({ where: { userId } }),
        this.prisma.budget.findMany({
          where: { userId },
          include: { items: true },
        }),
        this.prisma.promotion.findMany({ where: { userId } }),
        this.prisma.businessData.findMany({ where: { userId } }),
        this.prisma.userPreferences.findMany({ where: { userId } }),
        this.prisma.expenseCategory.findMany({ where: { userId } }),
        this.prisma.customCategory.findMany({ where: { userId } }),
        this.prisma.productReturn.findMany({
          where: { product: { userId } }
        }),
        this.prisma.priceList.findMany({ where: { userId } }),
        this.prisma.productPrice.findMany({
          where: { product: { userId } }
        }),
      ]);

      return {
        products,
        customers,
        suppliers,
        sales,
        payments,
        dailyCash,
        expenses,
        budgets,
        promotions,
        businessData,
        userPreferences,
        expenseCategories,
        customCategories,
        productReturns,
        priceLists,
        productPrices,
        exportedAt: new Date().toISOString(),
        version: '3.0.0', // Bump version for multi-tenancy
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Error al exportar backup: ' + error.message,
      );
    }
  }

  async import(data: any, userId: number) {
    return this.prisma.$transaction(
      async (tx) => {
        try {
          // 1. Clear current user's data first (reversing relationship order)
          // We must be careful to only delete data belonging to this userId.
          
          await tx.dailyCashMovement.deleteMany({ where: { dailyCash: { userId } } });
          await tx.saleItem.deleteMany({ where: { sale: { userId } } });
          await tx.installment.deleteMany({ where: { sale: { userId } } });
          await tx.payment.deleteMany({ where: { sale: { userId } } });
          await tx.budgetItem.deleteMany({ where: { budget: { userId } } });
          await tx.productPrice.deleteMany({ where: { product: { userId } } });
          await tx.supplierProduct.deleteMany({ where: { supplier: { userId } } });

          // Main tables
          await tx.sale.deleteMany({ where: { userId } });
          await tx.dailyCash.deleteMany({ where: { userId } });
          await tx.budget.deleteMany({ where: { userId } });
          await tx.expense.deleteMany({ where: { userId } });
          await tx.expenseCategory.deleteMany({ where: { userId } });
          await tx.productReturn.deleteMany({ where: { product: { userId } } });
          await tx.promotion.deleteMany({ where: { userId } });
          await tx.product.deleteMany({ where: { userId } });
          await tx.customer.deleteMany({ where: { userId } });
          await tx.supplier.deleteMany({ where: { userId } });
          await tx.priceList.deleteMany({ where: { userId } });
          await tx.customCategory.deleteMany({ where: { userId } });
          await tx.businessData.deleteMany({ where: { userId } });
          await tx.userPreferences.deleteMany({ where: { userId } });

          // Helper to handle dates
          const ensureDate = (d: any) => (d ? new Date(d) : null);

          // 2. Import data Ensured with userId
          
          if (data.businessData) {
            await tx.businessData.createMany({ 
              data: data.businessData.map((d: any) => ({ ...d, userId, id: undefined })) 
            });
          }

          if (data.userPreferences) {
            await tx.userPreferences.createMany({ 
              data: data.userPreferences.map((d: any) => ({ ...d, userId, id: undefined })) 
            });
          }

          if (data.customers) {
            await tx.customer.createMany({ 
              data: data.customers.map((d: any) => ({ ...d, userId })) 
            });
          }

          if (data.suppliers) {
            await tx.supplier.createMany({
              data: data.suppliers.map((s: any) => ({
                ...s,
                userId,
                id: undefined,
                createdAt: ensureDate(s.createdAt),
                updatedAt: ensureDate(s.updatedAt),
              })),
            });
          }

          if (data.products) {
            await tx.product.createMany({
              data: data.products.map((p: any) => ({
                ...p,
                userId,
                id: undefined,
                createdAt: ensureDate(p.createdAt),
                updatedAt: ensureDate(p.updatedAt),
              })),
            });
          }

          if (data.priceLists) {
            await tx.priceList.createMany({ 
              data: data.priceLists.map((d: any) => ({ ...d, userId, id: undefined })) 
            });
          }

          if (data.productPrices) {
            await tx.productPrice.createMany({ 
              data: data.productPrices.map((d: any) => ({ ...d, id: undefined })) 
            });
          }

          if (data.expenseCategories) {
            await tx.expenseCategory.createMany({
              data: data.expenseCategories.map((d: any) => ({ ...d, userId, id: undefined })),
            });
          }

          if (data.sales) {
            for (const sale of data.sales) {
              const { items, installments, id, ...saleData } = sale;
              await tx.sale.create({
                data: {
                  ...saleData,
                  userId,
                  date: ensureDate(saleData.date),
                  createdAt: ensureDate(saleData.createdAt),
                  updatedAt: ensureDate(saleData.updatedAt),
                  items: items ? { create: items.map((it: any) => ({ ...it, id: undefined })) } : undefined,
                  installments: installments
                    ? {
                        create: installments.map((inst: any) => ({
                          ...inst,
                          id: undefined,
                          dueDate: ensureDate(inst.dueDate),
                          paymentDate: ensureDate(inst.paymentDate),
                          createdAt: ensureDate(inst.createdAt),
                          updatedAt: ensureDate(inst.updatedAt),
                        })),
                      }
                    : undefined,
                },
              });
            }
          }

          if (data.payments) {
            await tx.payment.createMany({
              data: data.payments.map((p: any) => ({
                ...p,
                id: undefined,
                date: ensureDate(p.date),
                createdAt: ensureDate(p.createdAt),
                updatedAt: ensureDate(p.updatedAt),
              })),
            });
          }

          if (data.dailyCash) {
            for (const cash of data.dailyCash) {
              const { movements, id, ...cashData } = cash;
              await tx.dailyCash.create({
                data: {
                  ...cashData,
                  userId,
                  date: ensureDate(cashData.date),
                  closingDate: ensureDate(cashData.closingDate),
                  createdAt: ensureDate(cashData.createdAt),
                  updatedAt: ensureDate(cashData.updatedAt),
                  movements: movements
                    ? {
                        create: movements.map((m: any) => ({
                          ...m,
                          id: undefined,
                          date: ensureDate(m.date),
                          createdAt: ensureDate(m.createdAt),
                          timestamp: ensureDate(m.timestamp),
                        })),
                      }
                    : undefined,
                },
              });
            }
          }

          if (data.expenses) {
            await tx.expense.createMany({
              data: data.expenses.map((e: any) => ({
                ...e,
                userId,
                id: undefined,
                date: ensureDate(e.date),
                createdAt: ensureDate(e.createdAt),
                updatedAt: ensureDate(e.updatedAt),
              })),
            });
          }

          if (data.budgets) {
            for (const budget of data.budgets) {
              const { items, id, ...budgetData } = budget;
              await tx.budget.create({
                data: {
                  ...budgetData,
                  userId,
                  date: ensureDate(budgetData.date),
                  items: items ? { create: items.map((it: any) => ({ ...it, id: undefined })) } : undefined,
                },
              });
            }
          }

          return { message: 'Importación completada exitosamente' };
        } catch (error) {
          console.error('Error durante la importación:', error);
          throw new Error('Error al importar backup: ' + error.message);
        }
      },
      {
        timeout: 60000,
      },
    );
  }
}
