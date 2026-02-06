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
        this.prisma.product.findMany({ where: { userId }, include: { customCategories: true } }),
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

          const ensureDate = (d: any) => (d ? new Date(d) : undefined);
          
          const normalizeRubro = (r: any): any => {
            if (!r) return undefined;
            const s = String(r).toLowerCase().trim();
            if (s === 'comercio') return 'comercio';
            if (s === 'indumentaria') return 'indumentaria';
            if (s.includes('todos')) return 'Todos_los_rubros';
            return 'comercio';
          };

          const normalizePaymentMethod = (m: any): any => {
            if (!m) return 'EFECTIVO';
            const s = String(m).toUpperCase().trim();
            const valid = ['EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'CHEQUE', 'CUENTA_CORRIENTE', 'CREDITO_CUOTAS'];
            if (valid.includes(s)) return s;
            if (s === 'CASH') return 'EFECTIVO';
            if (s === 'TRANSFER') return 'TRANSFERENCIA';
            if (s === 'CARD') return 'TARJETA';
            return 'EFECTIVO';
          };

          const normalizeUnit = (u: any): any => {
            if (!u) return 'Unid';
            const s = String(u).trim();
            const units = ['General', 'A', 'Bulto', 'Cajon', 'Caja', 'Ciento', 'Cm', 'Docena', 'Gr', 'Kg', 'L', 'M', 'M2', 'M3', 'Ml', 'Mm', 'Pulg', 'Ton', 'Unid', 'V', 'W'];
            const found = units.find(val => val.toLowerCase() === s.toLowerCase());
            return found || 'Unid';
          };

          const normalizeMovementType = (t: any): any => {
            if (!t) return 'INGRESO';
            const s = String(t).toUpperCase().trim();
            if (s === 'INGRESO' || s === 'EGRESO' || s === 'TODOS') return s;
            return 'INGRESO';
          };

          const normalizePromotionType = (t: any): any => {
            if (!t) return 'PERCENTAGE_DISCOUNT';
            const s = String(t).toUpperCase().trim();
            if (s === 'PERCENTAGE_DISCOUNT' || s === 'FIXED_DISCOUNT') return s;
            if (s.includes('PERCENTAGE')) return 'PERCENTAGE_DISCOUNT';
            if (s.includes('FIXED')) return 'FIXED_DISCOUNT';
            return 'PERCENTAGE_DISCOUNT';
          };

          const normalizePromotionStatus = (s: any): any => {
            if (!s) return 'active';
            const val = String(s).toLowerCase().trim();
            if (val === 'active' || val === 'inactive') return val;
            return 'active';
          };

          const normalizeNotificationType = (t: any): any => {
            if (!t) return 'system';
            const s = String(t).toLowerCase().trim();
            if (s === 'system' || s === 'update' || s === 'alert' || s === 'message') return s;
            return 'system';
          };

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
            const { id: oldId, userId: _, rubro, budgets, customerNotes, payments, sales, ...rest } = c;
            // Ensure id is a string and preserved if possible (Customer uses String @id)
            const newCustomer = await tx.customer.create({ 
              data: { ...rest, rubro: normalizeRubro(rubro), id: String(oldId), userId } 
            });
            customerMap.set(oldId, newCustomer.id);
          }

          // Suppliers
          for (const s of getList('supplier')) {
            const { id: oldId, userId: _, createdAt, updatedAt, rubro, supplierProducts, ...rest } = s;
            const newSupplier = await tx.supplier.create({ 
              data: { ...rest, rubro: normalizeRubro(rubro), userId, createdAt: ensureDate(createdAt), updatedAt: ensureDate(updatedAt) } 
            });
            supplierMap.set(oldId, newSupplier.id);
          }

          // Products
          for (const p of getList('product')) {
            const { id: oldId, userId: _, createdAt, updatedAt, rubro, unit, customCategories, productPrices, productReturns, saleItems, supplierProducts, ...rest } = p;
            const newProduct = await tx.product.create({ 
              data: { 
                ...rest, 
                rubro: normalizeRubro(rubro),
                unit: normalizeUnit(unit),
                userId, 
                createdAt: ensureDate(createdAt), 
                updatedAt: ensureDate(updatedAt),
                customCategories: (customCategories && Array.isArray(customCategories)) ? {
                  create: customCategories.map((cc: any) => ({
                    name: cc.name,
                    rubro: normalizeRubro(cc.rubro)
                  }))
                } : undefined
              } 
            });
            productMap.set(oldId, newProduct.id);
          }

          // Price Lists
          for (const pl of getList('priceList')) {
            const { id: oldId, userId: _, rubro, productPrices, ...rest } = pl;
            const newPL = await tx.priceList.create({ 
              data: { ...rest, rubro: normalizeRubro(rubro), userId } 
            });
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
            const { id, userId: _, rubro, ...rest } = cc;
            await tx.customCategory.create({ 
              data: { ...rest, rubro: normalizeRubro(rubro), userId } 
            });
          }

          // Sales & Related
          for (const sale of getList('sale')) {
            const { items, installments, id, createdAt, updatedAt, date, customerId, priceListId, rubro, creditAlerts, payments, editHistory, products, customer, paymentMethod, paymentMethods, chequeInfo, ...saleData } = sale;
            const newSale = await tx.sale.create({
              data: {
                ...saleData,
                rubro: normalizeRubro(rubro),
                userId,
                customerId: customerId && customerMap.has(customerId) ? customerMap.get(customerId) : null,
                priceListId: priceListId ? priceListMap.get(priceListId) : null,
                date: ensureDate(date),
                createdAt: ensureDate(createdAt),
                updatedAt: ensureDate(updatedAt),
              },
            });
            saleMap.set(id, newSale.id);

            if (items) {
              for (const item of items) {
                const { id: itemId, productId, rubro, unit, ...itemRest } = item;
                await tx.saleItem.create({
                  data: {
                    ...itemRest,
                    rubro: normalizeRubro(rubro),
                    unit: normalizeUnit(unit),
                    saleId: newSale.id,
                    productId: productMap.get(productId) || productId, // Fallback to original if mapping fails
                  }
                });
              }
            }

            if (installments) {
              for (const inst of installments) {
                const { id: instId, dueDate, paymentDate, createdAt, updatedAt, paymentMethod, ...instRest } = inst;
                await tx.installment.create({
                  data: {
                    ...instRest,
                    paymentMethod: normalizePaymentMethod(paymentMethod),
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
            const { id: oldId, saleId, customerId, date, createdAt, updatedAt, method, saleDate, checkStatus, ...rest } = p;
            const newSaleId = saleMap.get(saleId);
            if (newSaleId) {
              const newPayment = await tx.payment.create({
                data: {
                  ...rest,
                  method: normalizePaymentMethod(method),
                  saleId: newSaleId,
                  customerId: customerId && customerMap.has(customerId) ? customerMap.get(customerId) : null,
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
                const { id, date, createdAt, timestamp, paymentId, productId, customerId, rubro, unit, method, paymentMethod, type, ...mRest } = m;
                await tx.dailyCashMovement.create({
                  data: {
                    ...mRest,
                    rubro: normalizeRubro(rubro),
                    unit: normalizeUnit(unit),
                    method: normalizePaymentMethod(method),
                    paymentMethod: normalizePaymentMethod(paymentMethod),
                    type: normalizeMovementType(type),
                    dailyCashId: newCash.id,
                    productId: productId ? productMap.get(productId) : null,
                    customerId: customerId && customerMap.has(customerId) ? customerMap.get(customerId) : null,
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
            const { items, id: oldId, date, customerId, rubro, budgetNotes, ...budgetData } = budget;
            const newBudget = await tx.budget.create({
              data: {
                ...budgetData,
                rubro: normalizeRubro(rubro),
                userId,
                id: oldId, // Budget uses UUID string, can usually preserve
                customerId: customerId && customerMap.has(customerId) ? customerMap.get(customerId) : null,
                date: ensureDate(date),
              },
            });
            budgetMap.set(oldId, newBudget.id);

            if (items) {
              for (const item of items) {
                const { id, productId, rubro, unit, ...itRest } = item;
                await tx.budgetItem.create({
                  data: {
                    ...itRest,
                    rubro: normalizeRubro(rubro),
                    unit: normalizeUnit(unit),
                    budgetId: newBudget.id,
                    productId: productId ? productMap.get(productId) : null,
                  }
                });
              }
            }
          }

          // Other simple models
          for (const ec of getList('expenseCategory')) {
            const { id, userId: _, rubro, type, ...rest } = ec;
            await tx.expenseCategory.create({ 
              data: { 
                ...rest, 
                rubro: normalizeRubro(rubro),
                type: normalizeMovementType(type),
                userId 
              } 
            });
          }

          for (const e of getList('expense')) {
            const { id, date, createdAt, updatedAt, userId: _, rubro, paymentMethod, type, ...rest } = e;
            await tx.expense.create({
              data: {
                ...rest,
                rubro: normalizeRubro(rubro),
                paymentMethod: normalizePaymentMethod(paymentMethod),
                type: normalizeMovementType(type),
                userId,
                date: ensureDate(date),
                createdAt: ensureDate(createdAt),
                updatedAt: ensureDate(updatedAt),
              }
            });
          }

          for (const promo of getList('promotion')) {
            const { id, userId: _, type, status, ...rest } = promo;
            await tx.promotion.create({ 
              data: { 
                ...rest, 
                type: normalizePromotionType(type),
                status: normalizePromotionStatus(status),
                userId 
              } 
            });
          }

          for (const note of getList('note')) {
            const { id, userId: _, customerId, budgetId, ...rest } = note;
            await tx.note.create({
              data: {
                ...rest,
                userId,
                customerId: customerId && customerMap.has(customerId) ? customerMap.get(customerId) : null,
                budgetId: budgetId && budgetMap.has(budgetId) ? budgetMap.get(budgetId) : null,
              }
            });
          }

          for (const n of getList('notification')) {
            const { id, userId: _, type, ...rest } = n;
            await tx.notification.create({ 
              data: { 
                ...rest, 
                type: normalizeNotificationType(type),
                userId 
              } 
            });
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
            const { id, productId, date, rubro, unit, ...rest } = ret;
            const newProdId = productMap.get(productId);
            if (newProdId) {
              await tx.productReturn.create({ 
                data: { 
                  ...rest, 
                  rubro: normalizeRubro(rubro),
                  unit: normalizeUnit(unit),
                  productId: newProdId, 
                  date: ensureDate(date) 
                } 
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
