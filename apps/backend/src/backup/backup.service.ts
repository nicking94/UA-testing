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
          console.log(`Starting import for user ${userId}. Keys present:`, Object.keys(data));

          // 1. Clear current user's data (reversing relationship order to avoid FK errors)
          await tx.dailyCashMovement.deleteMany({ where: { dailyCash: { userId } } });
          await tx.payment.deleteMany({ where: { sale: { userId } } });
          await tx.installment.deleteMany({ where: { sale: { userId } } });
          await tx.saleItem.deleteMany({ where: { sale: { userId } } });
          await tx.creditAlert.deleteMany({ where: { sale: { userId } } });
          await tx.saleEditHistory.deleteMany({ where: { sale: { userId } } });
          await tx.budgetItem.deleteMany({ where: { budget: { userId } } });
          await tx.productPrice.deleteMany({ where: { product: { userId } } });
          await tx.productCustomCategory.deleteMany({ where: { product: { userId } } });
          await tx.supplierProduct.deleteMany({ where: { product: { userId } } });
          await tx.productReturn.deleteMany({ where: { product: { userId } } });
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

          const ensureDate = (d: any) => (d ? new Date(d) : null);
          const getList = (key: string) => {
            if (Array.isArray(data[key])) return data[key];
            if (Array.isArray(data[key + 's'])) return data[key + 's'];
            if (key === 'dailyCash' && Array.isArray(data['dailyCashes'])) return data['dailyCashes'];
            if (key === 'expenseCategory' && (Array.isArray(data['expenseCategories']) || Array.isArray(data['expensesCategories']))) 
              return data['expenseCategories'] || data['expensesCategories'];
            if (key === 'productReturn' && Array.isArray(data['returns'])) return data['returns'];
            return [];
          };

          const productMap = new Map<string | number, number>();
          const supplierMap = new Map<string | number, number>();
          const priceListMap = new Map<string | number, number>();
          const saleMap = new Map<string | number, number>();
          const paymentMap = new Map<string | number, number>();
          const dailyCashMap = new Map<string | number, number>();
          const budgetMap = new Map<string | number, string>();
          const customerMap = new Map<string | number, string>();

          // User Preferences (Only one per user)
          const prefs = data.userPreferences || data.preferences || [];
          const prefsList = Array.isArray(prefs) ? prefs : (Object.keys(prefs).length ? [prefs] : []);
          if (prefsList.length > 0) {
            const { id, userId: _, ...rest } = prefsList[0]; // Take only the first one
            await tx.userPreferences.create({ data: { ...rest, userId } });
          }

          // Business Data (Take only the first one to be safe, though not strictly unique in schema)
          const bData = getList('businessData');
          if (bData.length > 0) {
            const { id, userId: _, ...rest } = bData[0];
            await tx.businessData.create({ data: { ...rest, userId } });
          }

          // Customers
          for (const c of getList('customer')) {
            const { id: oldId, userId: _, ...rest } = c;
            // Ensure id is a string and preserved if possible (Customer uses String @id)
            const newCustomer = await tx.customer.create({ data: { ...rest, id: String(oldId), userId } });
            customerMap.set(oldId, newCustomer.id);
          }

          // Suppliers
          for (const s of getList('supplier')) {
            const { id: oldId, userId: _, createdAt, updatedAt, ...rest } = s;
            const newSupplier = await tx.supplier.create({ 
              data: { ...rest, userId, createdAt: ensureDate(createdAt), updatedAt: ensureDate(updatedAt) } 
            });
            supplierMap.set(oldId, newSupplier.id);
          }

          // Products
          for (const p of getList('product')) {
            const { id: oldId, userId: _, createdAt, updatedAt, ...rest } = p;
            const newProduct = await tx.product.create({ 
              data: { ...rest, userId, createdAt: ensureDate(createdAt), updatedAt: ensureDate(updatedAt) } 
            });
            productMap.set(oldId, newProduct.id);
          }

          // Price Lists
          for (const pl of getList('priceList')) {
            const { id: oldId, userId: _, ...rest } = pl;
            const newPL = await tx.priceList.create({ data: { ...rest, userId } });
            priceListMap.set(oldId, newPL.id);
          }

          // Product Prices
          for (const pp of getList('productPrice')) {
            const { id, productId, priceListId, ...rest } = pp;
            const newProductId = productMap.get(productId);
            const newPriceListId = priceListMap.get(priceListId);
            if (newProductId && newPriceListId) {
              await tx.productPrice.create({ 
                data: { ...rest, productId: newProductId, priceListId: newPriceListId } 
              });
            }
          }

          // Custom Categories
          for (const cc of getList('customCategory')) {
            const { id, userId: _, ...rest } = cc;
            await tx.customCategory.create({ data: { ...rest, userId } });
          }

          // Sales & Related
          for (const sale of getList('sale')) {
            const { items, installments, id, createdAt, updatedAt, date, customerId, priceListId, ...saleData } = sale;
            const newSale = await tx.sale.create({
              data: {
                ...saleData,
                userId,
                customerId: customerId ? (customerMap.get(customerId) || String(customerId)) : null,
                priceListId: priceListId ? priceListMap.get(priceListId) : null,
                date: ensureDate(date),
                createdAt: ensureDate(createdAt),
                updatedAt: ensureDate(updatedAt),
              },
            });
            saleMap.set(id, newSale.id);

            if (items) {
              for (const item of items) {
                const { id: itemId, productId, ...itemRest } = item;
                await tx.saleItem.create({
                  data: {
                    ...itemRest,
                    saleId: newSale.id,
                    productId: productMap.get(productId) || productId, // Fallback to original if mapping fails
                  }
                });
              }
            }

            if (installments) {
              for (const inst of installments) {
                const { id: instId, dueDate, paymentDate, createdAt, updatedAt, ...instRest } = inst;
                await tx.installment.create({
                  data: {
                    ...instRest,
                    creditSaleId: newSale.id,
                    dueDate: ensureDate(dueDate),
                    paymentDate: ensureDate(paymentDate),
                    createdAt: ensureDate(createdAt),
                    updatedAt: ensureDate(updatedAt),
                  }
                });
              }
            }
          }

          // Payments
          for (const p of getList('payment')) {
            const { id: oldId, saleId, customerId, date, createdAt, updatedAt, ...rest } = p;
            const newSaleId = saleMap.get(saleId);
            if (newSaleId) {
              const newPayment = await tx.payment.create({
                data: {
                  ...rest,
                  saleId: newSaleId,
                  customerId: customerId ? (customerMap.get(customerId) || String(customerId)) : null,
                  date: ensureDate(date),
                  createdAt: ensureDate(createdAt),
                  updatedAt: ensureDate(updatedAt),
                }
              });
              paymentMap.set(oldId, newPayment.id);
            }
          }

          // Daily Cash & Movements
          for (const cash of getList('dailyCash')) {
            const { movements, id: oldId, date, closingDate, createdAt, updatedAt, ...cashData } = cash;
            const newCash = await tx.dailyCash.create({
              data: {
                ...cashData,
                userId,
                date: ensureDate(date),
                closingDate: ensureDate(closingDate),
                createdAt: ensureDate(createdAt),
                updatedAt: ensureDate(updatedAt),
              },
            });
            dailyCashMap.set(oldId, newCash.id);

            if (movements) {
              for (const m of movements) {
                const { id, date, createdAt, timestamp, paymentId, productId, customerId, ...mRest } = m;
                await tx.dailyCashMovement.create({
                  data: {
                    ...mRest,
                    dailyCashId: newCash.id,
                    productId: productId ? productMap.get(productId) : null,
                    customerId: customerId ? (customerMap.get(customerId) || String(customerId)) : null,
                    paymentId: paymentId ? paymentMap.get(paymentId) : null,
                    date: ensureDate(date),
                    createdAt: ensureDate(createdAt),
                    timestamp: ensureDate(timestamp),
                  }
                });
              }
            }
          }

          // Budgets
          for (const budget of getList('budget')) {
            const { items, id: oldId, date, customerId, ...budgetData } = budget;
            const newBudget = await tx.budget.create({
              data: {
                ...budgetData,
                userId,
                id: oldId, // Budget uses UUID string, can usually preserve
                customerId: customerId ? (customerMap.get(customerId) || String(customerId)) : null,
                date: ensureDate(date),
              },
            });
            budgetMap.set(oldId, newBudget.id);

            if (items) {
              for (const item of items) {
                const { id, productId, ...itRest } = item;
                await tx.budgetItem.create({
                  data: {
                    ...itRest,
                    budgetId: newBudget.id,
                    productId: productId ? productMap.get(productId) : null,
                  }
                });
              }
            }
          }

          // Other simple models
          for (const ec of getList('expenseCategory')) {
            const { id, userId: _, ...rest } = ec;
            await tx.expenseCategory.create({ data: { ...rest, userId } });
          }

          for (const e of getList('expense')) {
            const { id, date, createdAt, updatedAt, userId: _, ...rest } = e;
            await tx.expense.create({
              data: {
                ...rest,
                userId,
                date: ensureDate(date),
                createdAt: ensureDate(createdAt),
                updatedAt: ensureDate(updatedAt),
              }
            });
          }

          for (const promo of getList('promotion')) {
            const { id, userId: _, ...rest } = promo;
            await tx.promotion.create({ data: { ...rest, userId } });
          }

          for (const note of getList('note')) {
            const { id, userId: _, customerId, budgetId, ...rest } = note;
            await tx.note.create({
              data: {
                ...rest,
                userId,
                customerId: customerId ? (customerMap.get(customerId) || String(customerId)) : null,
                budgetId: budgetId ? (budgetMap.get(budgetId) || String(budgetId)) : null,
              }
            });
          }

          for (const n of getList('notification')) {
            const { id, userId: _, ...rest } = n;
            await tx.notification.create({ data: { ...rest, userId } });
          }

          for (const sp of getList('supplierProduct')) {
            const { id, supplierId, productId, ...rest } = sp;
            const newSupId = supplierMap.get(supplierId);
            const newProdId = productMap.get(productId);
            if (newSupId && newProdId) {
              await tx.supplierProduct.create({ data: { ...rest, supplierId: newSupId, productId: newProdId } });
            }
          }

          for (const ret of getList('productReturn')) {
            const { id, productId, date, ...rest } = ret;
            const newProdId = productMap.get(productId);
            if (newProdId) {
              await tx.productReturn.create({ 
                data: { ...rest, productId: newProdId, date: ensureDate(date) } 
              });
            }
          }

          return { message: 'Importación completada exitosamente' };
        } catch (error) {
          console.error('Error durante la importación:', error);
          throw new InternalServerErrorException('Error al importar backup: ' + error.message);
        }
      },
      {
        timeout: 120000,
      },
    );
  }
}
