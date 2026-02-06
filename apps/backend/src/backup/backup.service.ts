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
        notes,
        notifications,
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
        this.prisma.note.findMany({ where: { userId } }),
        this.prisma.notification.findMany({ where: { userId } }),
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
        notes,
        notifications,
        exportedAt: new Date().toISOString(),
        version: '3.1.0',
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
          // 1. Clear current user's data (reversing relationship order to avoid FK errors)
          
          // Dependencies of Sales
          await tx.dailyCashMovement.deleteMany({ where: { dailyCash: { userId } } });
          await tx.payment.deleteMany({ where: { sale: { userId } } });
          await tx.installment.deleteMany({ where: { sale: { userId } } });
          await tx.saleItem.deleteMany({ where: { sale: { userId } } });
          await tx.creditAlert.deleteMany({ where: { sale: { userId } } });
          await tx.saleEditHistory.deleteMany({ where: { sale: { userId } } });

          // Dependencies of Budgets
          await tx.budgetItem.deleteMany({ where: { budget: { userId } } });

          // Dependencies of Products
          await tx.productPrice.deleteMany({ where: { product: { userId } } });
          await tx.productCustomCategory.deleteMany({ where: { product: { userId } } });
          await tx.supplierProduct.deleteMany({ where: { product: { userId } } });
          await tx.productReturn.deleteMany({ where: { product: { userId } } });

          // Models with direct userId
          await tx.sale.deleteMany({ where: { userId } });
          await tx.dailyCash.deleteMany({ where: { userId } });
          await tx.budget.deleteMany({ where: { userId } });
          await tx.expense.deleteMany({ where: { userId } });
          await tx.expenseCategory.deleteMany({ where: { userId } });
          await tx.promotion.deleteMany({ where: { userId } });
          await tx.product.deleteMany({ where: { userId } });
          await tx.customer.deleteMany({ where: { userId } });
          await tx.supplier.deleteMany({ where: { userId } });
          await tx.priceList.deleteMany({ where: { userId } });
          await tx.customCategory.deleteMany({ where: { userId } });
          await tx.businessData.deleteMany({ where: { userId } });
          await tx.userPreferences.deleteMany({ where: { userId } });
          await tx.note.deleteMany({ where: { userId } });
          await tx.notification.deleteMany({ where: { userId } });

          // Helper to handle dates
          const ensureDate = (d: any) => (d ? new Date(d) : null);

          // 2. Import Data (Handling common plural/singular naming)
          const getList = (key: string) => data[key] || data[key + 's'] || [];

          // Business Data
          const businessData = getList('businessData');
          if (businessData.length) {
            await tx.businessData.createMany({ 
              data: businessData.map(({ id, ...rest }: any) => ({ ...rest, userId })) 
            });
          }

          // User Preferences
          const userPreferences = data.userPreferences || data.preferences || [];
          if (Array.isArray(userPreferences) && userPreferences.length) {
             // Preferences might be singular object in some exports or list in others
             await tx.userPreferences.createMany({
               data: userPreferences.map(({ id, ...rest }: any) => ({ ...rest, userId }))
             });
          } else if (typeof userPreferences === 'object' && !Array.isArray(userPreferences) && Object.keys(userPreferences).length) {
             const { id, ...rest } = userPreferences as any;
             await tx.userPreferences.create({ data: { ...rest, userId } });
          }

          // Customers
          const customers = getList('customer');
          if (customers.length) {
            await tx.customer.createMany({ 
              data: customers.map((c: any) => ({ ...c, userId })) 
            });
          }

          // Suppliers
          const suppliers = getList('supplier');
          if (suppliers.length) {
            await tx.supplier.createMany({
              data: suppliers.map(({ id, createdAt, updatedAt, ...rest }: any) => ({
                ...rest,
                userId,
                createdAt: ensureDate(createdAt),
                updatedAt: ensureDate(updatedAt),
              })),
            });
          }

          // Products
          const products = getList('product');
          if (products.length) {
            await tx.product.createMany({
              data: products.map(({ id, createdAt, updatedAt, ...rest }: any) => ({
                ...rest,
                userId,
                createdAt: ensureDate(createdAt),
                updatedAt: ensureDate(updatedAt),
              })),
            });
          }

          // Custom Categories
          const customCategories = getList('customCategory');
          if (customCategories.length) {
            await tx.customCategory.createMany({
              data: customCategories.map(({ id, ...rest }: any) => ({ ...rest, userId }))
            });
          }

          // Price Lists
          const priceLists = getList('priceList');
          if (priceLists.length) {
            await tx.priceList.createMany({ 
              data: priceLists.map(({ id, ...rest }: any) => ({ ...rest, userId })) 
            });
          }

          // Product Prices
          const productPrices = getList('productPrice');
          if (productPrices.length) {
            await tx.productPrice.createMany({ 
              data: productPrices.map(({ id, ...rest }: any) => ({ ...rest })) 
            });
          }

          // Expense Categories
          const expenseCategories = getList('expenseCategory');
          if (expenseCategories.length) {
            await tx.expenseCategory.createMany({
              data: expenseCategories.map(({ id, ...rest }: any) => ({ ...rest, userId })),
            });
          }

          // Promotions
          const promotions = getList('promotion');
          if (promotions.length) {
            await tx.promotion.createMany({
              data: promotions.map(({ id, ...rest }: any) => ({ ...rest, userId }))
            });
          }

          // Sales & Related
          const sales = getList('sale');
          if (sales.length) {
            for (const sale of sales) {
              const { items, installments, id, createdAt, updatedAt, date, ...saleData } = sale;
              await tx.sale.create({
                data: {
                  ...saleData,
                  userId,
                  date: ensureDate(date),
                  createdAt: ensureDate(createdAt),
                  updatedAt: ensureDate(updatedAt),
                  items: items ? { create: items.map(({ id, ...it }: any) => it) } : undefined,
                  installments: installments
                    ? {
                        create: installments.map((inst: any) => {
                          const { id, createdAt, updatedAt, dueDate, paymentDate, ...instRest } = inst;
                          return {
                            ...instRest,
                            dueDate: ensureDate(dueDate),
                            paymentDate: ensureDate(paymentDate),
                            createdAt: ensureDate(createdAt),
                            updatedAt: ensureDate(updatedAt),
                          };
                        }),
                      }
                    : undefined,
                },
              });
            }
          }

          // Payments
          const payments = getList('payment');
          if (payments.length) {
            await tx.payment.createMany({
              data: payments.map(({ id, date, createdAt, updatedAt, ...p }: any) => ({
                ...p,
                date: ensureDate(date),
                createdAt: ensureDate(createdAt),
                updatedAt: ensureDate(updatedAt),
              })),
            });
          }

          // Daily Cash & Movements
          const dailyCashes = getList('dailyCash');
          if (dailyCashes.length) {
            for (const cash of dailyCashes) {
              const { movements, id, date, closingDate, createdAt, updatedAt, ...cashData } = cash;
              await tx.dailyCash.create({
                data: {
                  ...cashData,
                  userId,
                  date: ensureDate(date),
                  closingDate: ensureDate(closingDate),
                  createdAt: ensureDate(createdAt),
                  updatedAt: ensureDate(updatedAt),
                  movements: movements
                    ? {
                        create: movements.map((m: any) => {
                          const { id, date, createdAt, timestamp, ...mRest } = m;
                          return {
                            ...mRest,
                            date: ensureDate(date),
                            createdAt: ensureDate(createdAt),
                            timestamp: ensureDate(timestamp),
                          };
                        }),
                      }
                    : undefined,
                },
              });
            }
          }

          // Expenses
          const expenses = getList('expense');
          if (expenses.length) {
            await tx.expense.createMany({
              data: expenses.map(({ id, date, createdAt, updatedAt, ...e }: any) => ({
                ...e,
                userId,
                date: ensureDate(date),
                createdAt: ensureDate(createdAt),
                updatedAt: ensureDate(updatedAt),
              })),
            });
          }

          // Budgets
          const budgets = getList('budget');
          if (budgets.length) {
            for (const budget of budgets) {
              const { items, id, date, ...budgetData } = budget;
              await tx.budget.create({
                data: {
                  ...budgetData,
                  userId,
                  date: ensureDate(date),
                  items: items ? { create: items.map(({ id, ...it }: any) => it) } : undefined,
                },
              });
            }
          }

          // Notes
          const notes = getList('note');
          if (notes.length) {
            await tx.note.createMany({
              data: notes.map(({ id, ...rest }: any) => ({ ...rest, userId }))
            });
          }

          // Notifications
          const notifications = getList('notification');
          if (notifications.length) {
            await tx.notification.createMany({
              data: notifications.map(({ id, ...rest }: any) => ({ ...rest, userId }))
            });
          }

          // Supplier Products
          const supplierProducts = getList('supplierProduct');
          if (supplierProducts.length) {
            await tx.supplierProduct.createMany({
              data: supplierProducts.map(({ id, ...rest }: any) => rest)
            });
          }

          // Product Returns
          const returns = getList('return'); // Handle 'returns' key
          if (returns.length) {
            await tx.productReturn.createMany({
              data: returns.map(({ id, ...rest }: any) => rest)
            });
          }

          return { message: 'Importación completada exitosamente' };
        } catch (error) {
          console.error('Error durante la importación:', error);
          throw new Error('Error al importar backup: ' + error.message);
        }
      },
      {
        timeout: 90000, // Increase timeout for large imports
      },
    );
  }
}
