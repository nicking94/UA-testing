import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class BackupService {
  constructor(private prisma: PrismaService) {}

  async export() {
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
        this.prisma.product.findMany(),
        this.prisma.customer.findMany(),
        this.prisma.supplier.findMany(),
        this.prisma.sale.findMany({
          include: { items: true, installments: true },
        }),
        this.prisma.payment.findMany(),
        this.prisma.dailyCash.findMany({
          include: { movements: true },
        }),
        this.prisma.expense.findMany(),
        this.prisma.budget.findMany({
          include: { items: true },
        }),
        this.prisma.promotion.findMany(),
        this.prisma.businessData.findMany(),
        this.prisma.userPreferences.findMany(),
        this.prisma.expenseCategory.findMany(),
        this.prisma.customCategory.findMany(),
        this.prisma.productReturn.findMany(),
        this.prisma.priceList.findMany(),
        this.prisma.productPrice.findMany(),
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
        version: '2.0.0',
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Error al exportar backup: ' + error.message,
      );
    }
  }

  async import(data: any) {
    return this.prisma.$transaction(
      async (tx) => {
        try {
          // Clear all relevant tables first (reversing relationship order)
          await tx.dailyCashMovement.deleteMany({});
          await tx.saleItem.deleteMany({});
          await tx.installment.deleteMany({});
          await tx.payment.deleteMany({});
          await tx.budgetItem.deleteMany({});
          await tx.productPrice.deleteMany({});
          await tx.supplierProduct.deleteMany({});

          // Main tables
          await tx.sale.deleteMany({});
          await tx.dailyCash.deleteMany({});
          await tx.budget.deleteMany({});
          await tx.expense.deleteMany({});
          await tx.expenseCategory.deleteMany({});
          await tx.productReturn.deleteMany({});
          await tx.promotion.deleteMany({});
          await tx.product.deleteMany({});
          await tx.customer.deleteMany({});
          await tx.supplier.deleteMany({});
          await tx.priceList.deleteMany({});
          await tx.customCategory.deleteMany({});
          await tx.businessData.deleteMany({});

          // Helper to handle dates
          const ensureDate = (d: any) => (d ? new Date(d) : null);

          // Import Business Data
          if (data.businessData) {
            await tx.businessData.createMany({ data: data.businessData });
          }

          // Import Customers
          if (data.customers) {
            await tx.customer.createMany({ data: data.customers });
          }

          // Import Suppliers
          if (data.suppliers) {
            await tx.supplier.createMany({
              data: data.suppliers.map((s: any) => ({
                ...s,
                createdAt: ensureDate(s.createdAt),
                updatedAt: ensureDate(s.updatedAt),
              })),
            });
          }

          // Import Products
          if (data.products) {
            await tx.product.createMany({
              data: data.products.map((p: any) => ({
                ...p,
                createdAt: ensureDate(p.createdAt),
                updatedAt: ensureDate(p.updatedAt),
              })),
            });
          }

          // Import Price Lists
          if (data.priceLists) {
            await tx.priceList.createMany({ data: data.priceLists });
          }

          // Import Product Prices
          if (data.productPrices) {
            await tx.productPrice.createMany({ data: data.productPrices });
          }

          // Import Expense Categories
          if (data.expenseCategories) {
            await tx.expenseCategory.createMany({
              data: data.expenseCategories,
            });
          }

          // Import Sales & Related
          if (data.sales) {
            for (const sale of data.sales) {
              const { items, installments, ...saleData } = sale;
              await tx.sale.create({
                data: {
                  ...saleData,
                  date: ensureDate(saleData.date),
                  createdAt: ensureDate(saleData.createdAt),
                  updatedAt: ensureDate(saleData.updatedAt),
                  items: items ? { create: items } : undefined,
                  installments: installments
                    ? {
                        create: installments.map((inst: any) => ({
                          ...inst,
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

          // Import Payments
          if (data.payments) {
            await tx.payment.createMany({
              data: data.payments.map((p: any) => ({
                ...p,
                date: ensureDate(p.date),
                createdAt: ensureDate(p.createdAt),
                updatedAt: ensureDate(p.updatedAt),
              })),
            });
          }

          // Import Daily Cash & Movements
          if (data.dailyCash) {
            for (const cash of data.dailyCash) {
              const { movements, ...cashData } = cash;
              await tx.dailyCash.create({
                data: {
                  ...cashData,
                  date: ensureDate(cashData.date),
                  closingDate: ensureDate(cashData.closingDate),
                  createdAt: ensureDate(cashData.createdAt),
                  updatedAt: ensureDate(cashData.updatedAt),
                  movements: movements
                    ? {
                        create: movements.map((m: any) => ({
                          ...m,
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

          // Import Expenses
          if (data.expenses) {
            await tx.expense.createMany({
              data: data.expenses.map((e: any) => ({
                ...e,
                date: ensureDate(e.date),
                createdAt: ensureDate(e.createdAt),
                updatedAt: ensureDate(e.updatedAt),
              })),
            });
          }

          // Import Budgets
          if (data.budgets) {
            for (const budget of data.budgets) {
              const { items, ...budgetData } = budget;
              await tx.budget.create({
                data: {
                  ...budgetData,
                  date: ensureDate(budgetData.date),
                  items: items ? { create: items } : undefined,
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
        timeout: 30000,
      },
    );
  }
}
