"use client";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Card,
  Typography,
  Box,
  FormControl,
  IconButton,
  TextField,
  Autocomplete,
  useTheme,
  CircularProgress,
} from "@mui/material";
import {
  Add,
  Print,
  ShoppingCart,
  Delete,
  LocalOffer,
  Check,
  Edit,
} from "@mui/icons-material";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { dailyCashApi } from "@/app/lib/api/daily-cash";
import { productPricesApi } from "@/app/lib/api/product-prices";
import { promotionsApi } from "@/app/lib/api/promotions";
import { priceListsApi } from "@/app/lib/api/price-lists";
import { useSalesApi } from "@/app/hooks/useSalesApi";
import { useProductsApi } from "@/app/hooks/useProductsApi";
import { useCustomersApi } from "@/app/hooks/useCustomersApi";
import { customersApi, CustomerFilters } from "@/app/lib/api/customers";
import { productsApi } from "@/app/lib/api/products";
import { parseISO, format } from "date-fns";
import { es } from "date-fns/locale";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import Pagination from "@/app/components/Pagination";
import BarcodeScanner from "@/app/components/BarcodeScanner";
import { ensureCashIsOpen } from "@/app/lib/utils/cash";
import { useRouter } from "next/navigation";
import { formatCurrency, parseCurrencyInput } from "@/app/lib/utils/currency";
import InputCash from "@/app/components/InputCash";
import PaymentModal from "@/app/components/PaymentModal";
import getDisplayProductName from "@/app/lib/utils/DisplayProductName";
import { useRubro } from "@/app/context/RubroContext";
import { getLocalDateString } from "@/app/lib/utils/getLocalDate";
import PrintableTicket, {
  PrintableTicketHandle,
} from "@/app/components/PrintableTicket";
import { useBusinessData } from "@/app/context/BusinessDataContext";
import { usePagination } from "@/app/context/PaginationContext";
import {
  convertToBaseUnit,
  convertFromBaseUnit,
  calculatePrice,
  calculateCombinedTotal,
  calculateTotalProfit,
  checkStockAvailability,
  calculateInstallments,
} from "@/app/lib/utils/calculations";
import {
  Customer,
  DailyCashMovement,
  MonthOption,
  PaymentSplit,
  Product,
  Promotion,
  Sale,
  UnitOption,
  Option,
  PaymentMethod,
  EditMode,
  PriceList,
  CreditInstallmentDetails,
  ProductOption,
} from "@/app/lib/types/types";
import Select from "@/app/components/Select";
import { Settings } from "@mui/icons-material";
import { isSameDay } from "date-fns";
import Button from "@/app/components/Button";
import Notification from "@/app/components/Notification";
import Modal from "@/app/components/Modal";
import Checkbox from "@/app/components/Checkbox";
import { useNotification } from "@/app/hooks/useNotification";
import BusinessDataModal from "@/app/components/BusinessDataModal";
import CustomChip from "@/app/components/CustomChip";
import ProductSearchAutocomplete from "@/app/components/ProductSearchAutocomplete";
import CustomGlobalTooltip from "@/app/components/CustomTooltipGlobal";
import PriceListSelector from "@/app/components/PriceListSelector";
import Input from "@/app/components/Input";
import CreditInstallmentModal from "@/app/components/CreditInstallmentModal";
type CustomerOption = {
  value: string;
  label: string;
};
const VentasPage = () => {
  const cobrarButtonRef = useRef<HTMLButtonElement>(null);
  const imprimirButtonRef = useRef<HTMLButtonElement>(null);
  const { businessData } = useBusinessData();
  const { rubro } = useRubro();
  const { addSale, fetchSales, updateSale } = useSalesApi();
  const { fetchCustomers: fetchCustomersApi } = useCustomersApi();
  const { fetchProducts: fetchProductsApi } = useProductsApi();
  const theme = useTheme();
  const currentYear = new Date().getFullYear();
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [newSale, setNewSale] = useState<Omit<Sale, "id">>({
    products: [],
    paymentMethods: [{ method: "EFECTIVO" as PaymentMethod, amount: 0 }],
    total: 0,
    date: new Date().toISOString(),
    barcode: "",
    manualAmount: 0,
    manualProfitPercentage: 0,
    concept: "",
  });
  const router = useRouter();
  const ticketRef = useRef<PrintableTicketHandle>(null);
  const [creditInstallmentDetails, setCreditInstallmentDetails] =
    useState<CreditInstallmentDetails>({
      numberOfInstallments: 1,
      interestRate: 0,
      penaltyRate: 0,
      startDate: new Date().toISOString().split("T")[0],
      currentInstallment: 1,
    });
  const {
    isNotificationOpen,
    notificationMessage,
    notificationType,
    showNotification,
    closeNotification,
  } = useNotification();
  const { currentPage, itemsPerPage } = usePagination();
  const [selectedMonth, setSelectedMonth] = useState<number>(
    () => new Date().getMonth() + 1
  );
  const [selectedYear, setSelectedYear] = useState<number>(() =>
    new Date().getFullYear()
  );
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isCredit, setIsCredit] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([]);
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerOption | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [shouldRedirectToCash, setShouldRedirectToCash] = useState(false);
  const [registerCheck, setRegisterCheck] = useState(false);
  const [availablePromotions, setAvailablePromotions] = useState<Promotion[]>(
    []
  );
  const [selectedPromotions, setSelectedPromotions] =
    useState<Promotion | null>(null);
  const [temporarySelectedPromotion, setTemporarySelectedPromotion] =
    useState<Promotion | null>(null);
  const [isPromotionModalOpen, setIsPromotionModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isBusinessDataModalOpen, setIsBusinessDataModalOpen] = useState(false);
  const [isDeleteProductModalOpen, setIsDeleteProductModalOpen] =
    useState(false);
  const [productToDelete, setProductToDelete] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [selectedPriceListId, setSelectedPriceListId] = useState<number | null>(
    null
  );
  const [availablePriceLists, setAvailablePriceLists] = useState<PriceList[]>(
    []
  );
  const [isEditMode, setIsEditMode] = useState<EditMode>({
    isEditing: false,
    originalSaleId: undefined,
    originalCashMovementIds: [],
  });
  const [originalSaleBackup, setOriginalSaleBackup] = useState<Sale | null>(
    null
  );
  const [originalStockBackup, setOriginalStockBackup] = useState<
    { id: number; originalStock: number }[]
  >([]);
  const [isCreditInstallmentModalOpen, setIsCreditInstallmentModalOpen] =
    useState(false);
  const [isCreditCuotasSelected, setIsCreditCuotasSelected] = useState(false);
  const CONVERSION_FACTORS = {
    Gr: { base: "Kg", factor: 0.001 },
    Kg: { base: "Kg", factor: 1 },
    Ton: { base: "Kg", factor: 1000 },
    Ml: { base: "L", factor: 0.001 },
    L: { base: "L", factor: 1 },
    Mm: { base: "M", factor: 0.001 },
    Cm: { base: "M", factor: 0.01 },
    Pulg: { base: "M", factor: 0.0254 },
    M: { base: "M", factor: 1 },
    "Unid.": { base: "Unid.", factor: 1 },
    Docena: { base: "Unid.", factor: 12 },
    Ciento: { base: "Unid.", factor: 100 },
    Bulto: { base: "Bulto", factor: 1 },
    Caja: { base: "Caja", factor: 1 },
    Cajón: { base: "Cajón", factor: 1 },
    "M²": { base: "M²", factor: 1 },
    "M³": { base: "M³", factor: 1 },
    V: { base: "V", factor: 1 },
    A: { base: "A", factor: 1 },
    W: { base: "W", factor: 1 },
  } as const;
  const unitOptions: UnitOption[] = [
    { value: "Unid.", label: "Unidad", convertible: false },
    { value: "Kg", label: "Kilogramo", convertible: true },
    { value: "Gr", label: "Gramo", convertible: true },
    { value: "L", label: "Litro", convertible: true },
    { value: "Ml", label: "Mililitro", convertible: true },
    { value: "M", label: "Metro", convertible: true },
    { value: "Cm", label: "Centímetro", convertible: true },
    { value: "Docena", label: "Docena", convertible: false },
    { value: "Caja", label: "Caja", convertible: false },
    { value: "Bulto", label: "Bulto", convertible: false },
    { value: "Cajón", label: "Cajón", convertible: false },
    { value: "Mm", label: "Milímetro", convertible: true },
    { value: "Pulg", label: "Pulgada", convertible: true },
    { value: "M²", label: "Metro cuadrado", convertible: false },
    { value: "M³", label: "Metro cúbico", convertible: false },
    { value: "Ciento", label: "Ciento", convertible: false },
    { value: "Ton", label: "Tonelada", convertible: true },
    { value: "V", label: "Voltio", convertible: false },
    { value: "W", label: "Watt", convertible: false },
    { value: "A", label: "Amperio", convertible: false },
  ];
  const paymentOptions: Option[] = [
    { value: "EFECTIVO", label: "Efectivo" },
    { value: "TRANSFERENCIA", label: "Transferencia" },
    { value: "TARJETA", label: "Tarjeta" },
    { value: "CHEQUE", label: "Cheque" },
    { value: "CREDITO_CUOTAS", label: "Crédito en cuotas" },
  ];
  const monthOptions: MonthOption[] = [...Array(12)].map((_, i) => ({
    value: i + 1,
    label: format(new Date(2022, i), "MMMM", { locale: es }),
  }));
  const yearOptions = Array.from({ length: 10 }, (_, i) => {
    const year = currentYear - i;
    return { value: year, label: String(year) };
  });
  const tableHeaderStyle = useMemo(
    () => ({
      bgcolor: theme.palette.mode === "dark" ? "primary.dark" : "primary.main",
      color: "primary.contrastText",
    }),
    [theme.palette.mode]
  );
  const getCardStyle = useMemo(
    () => (color: "success" | "error" | "primary" | "warning") => ({
      bgcolor:
        theme.palette.mode === "dark" ? `${color}.dark` : `${color}.main`,
      color: "white",
      "& .MuiTypography-root": {
        color: "white !important",
      },
    }),
    [theme.palette.mode]
  );
  const getCompatibleUnits = (productUnit: string): UnitOption[] => {
    const productUnitInfo =
      CONVERSION_FACTORS[productUnit as keyof typeof CONVERSION_FACTORS];
    if (!productUnitInfo) return unitOptions.filter((u) => !u.convertible);
    return unitOptions.filter((option) => {
      if (!option.convertible) return false;
      const optionInfo =
        CONVERSION_FACTORS[option.value as keyof typeof CONVERSION_FACTORS];
      return optionInfo?.base === productUnitInfo.base;
    });
  };
  const getCompatibleUnitOptions = (productUnit: string) => {
    const compatibleUnits = getCompatibleUnits(productUnit);
    return compatibleUnits.map((unit) => ({
      value: unit.value,
      label: unit.label,
    }));
  };
  const getProductPrice = async (productId: number): Promise<number> => {
    if (!selectedPriceListId) {
      const product = products.find((p) => p.id === productId);
      return product?.price || 0;
    }
    try {
      const productPrice = await productPricesApi.getByProductAndPriceList(
        productId,
        selectedPriceListId
      );
      if (productPrice) {
        return productPrice.price;
      }
      const product = products.find((p) => p.id === productId);
      return product?.price || 0;
    } catch (error) {
      console.error("Error getting product price:", error);
      const product = products.find((p) => p.id === productId);
      return product?.price || 0;
    }
  };
  const updateProductPrices = async (priceListId: number) => {
    const updatedProducts = await Promise.all(
      newSale.products.map(async (product) => {
        let newPrice = product.price;
        if (priceListId) {
          try {
            const productPrice = await productPricesApi.getByProductAndPriceList(
              product.id,
              priceListId
            );
            if (productPrice) {
              newPrice = productPrice.price;
            }
          } catch (error) {
            console.error("Error getting product price:", error);
          }
        }
        return {
          ...product,
          price: newPrice,
        };
      })
    );
    setNewSale((prev) => {
      const newTotal = calculateFinalTotal(
        updatedProducts,
        prev.manualAmount || 0,
        selectedPromotions
      );
      return {
        ...prev,
        products: updatedProducts,
        total: newTotal,
        paymentMethods: synchronizePaymentMethods(
          prev.paymentMethods,
          newTotal
        ),
      };
    });
  };
  const getPriceListName = (priceListId: number | undefined): string => {
    if (!priceListId) {
      const generalList = priceLists.find(
        (list) => list.name === "General" && list.rubro === rubro
      );
      return generalList ? generalList.name : "General";
    }
    const list = priceLists.find((p) => p.id === priceListId);
    return list ? list.name : "General";
  };
  const canEditSale = (sale: Sale): boolean => {
    const saleDate = new Date(sale.date);
    const today = new Date();
    return isSameDay(saleDate, today) && !sale.credit;
  };
  const handleStartEditSale = async (sale: Sale) => {
    if (!canEditSale(sale)) {
      showNotification(
        "Solo se pueden editar ventas del día actual y que no sean a crédito",
        "error"
      );
      return;
    }
    const today = getLocalDateString();
    const dailyCash = await dailyCashApi.getByDate(today);
    if (dailyCash?.closed) {
      showNotification(
        "No se puede editar ventas con la caja cerrada",
        "error"
      );
      return;
    }
    try {
      setOriginalSaleBackup({ ...sale });
      const stockBackup = sale.products.map((product) => ({
        id: product.id,
        originalStock: product.stock,
      }));
      setOriginalStockBackup(stockBackup);
      for (const product of sale.products) {
        const originalProduct = products.find((p) => p.id === product.id);
        if (originalProduct) {
          const soldInBase = convertToBaseUnit(product.quantity, product.unit);
          const currentStockInBase = convertToBaseUnit(
            Number(originalProduct.stock),
            originalProduct.unit
          );
          const newStockInBase = currentStockInBase + soldInBase;
          const newStock = convertFromBaseUnit(
            newStockInBase,
            originalProduct.unit
          );
          await productsApi.update(product.id, {
            stock: parseFloat(newStock.toFixed(3)),
          });
        }
      }
      const movementIds: number[] = [];
      if (dailyCash) {
        dailyCash.movements.forEach((movement: DailyCashMovement) => {
          if (movement.originalSaleId === sale.id) {
            movementIds.push(movement.id);
          }
        });
      }
      setIsEditMode({
        isEditing: true,
        originalSaleId: sale.id,
        originalCashMovementIds: movementIds,
      });
      setNewSale({
        products: sale.products.map((p) => ({
          ...p,
          quantity: p.quantity,
          unit: p.unit,
          discount: p.discount || 0,
          surcharge: p.surcharge || 0,
        })),
        paymentMethods: sale.paymentMethods,
        total: sale.total,
        date: sale.date,
        barcode: sale.barcode || "",
        manualAmount: sale.manualAmount || 0,
        manualProfitPercentage: sale.manualProfitPercentage || 0,
        concept: sale.concept || "",
      });
      if (sale.priceListId) {
        setSelectedPriceListId(sale.priceListId);
      }
      if (sale.appliedPromotion) {
        setSelectedPromotions(sale.appliedPromotion);
      }
      setIsOpenModal(true);
    } catch (error) {
      console.error("Error al iniciar edición:", error);
      showNotification("Error al iniciar la edición de la venta", "error");
    }
  };
  const handleCancelEdit = async () => {
    if (!originalSaleBackup || !originalStockBackup.length) {
      setIsEditMode({ isEditing: false });
      setIsCredit(false); 
      setIsCreditCuotasSelected(false); 
      setRegisterCheck(false); 
      handleCloseModal();
      return;
    }
    try {
      for (const backup of originalStockBackup) {
        const product = products.find((p) => p.id === backup.id);
        if (product) {
          await productsApi.update(backup.id, { stock: backup.originalStock });
        }
      }
      setIsEditMode({ isEditing: false });
      setIsCredit(false); 
      setIsCreditCuotasSelected(false); 
      setRegisterCheck(false); 
      setSelectedCustomer(null); 
      setCustomerName(""); 
      setCustomerPhone(""); 
      setOriginalSaleBackup(null);
      setOriginalStockBackup([]);
      setCreditInstallmentDetails({
        numberOfInstallments: 1,
        interestRate: 0,
        penaltyRate: 0,
        startDate: new Date().toISOString().split("T")[0],
        currentInstallment: 1,
      });
      handleCloseModal();
      showNotification("Edición cancelada. Stock restaurado.", "info");
    } catch (error) {
      console.error("Error al cancelar edición:", error);
      showNotification("Error al cancelar la edición", "error");
    } finally {
      const storedProducts = await fetchProductsApi({});
      setProducts(storedProducts);
    }
  };
  const updateStockAfterSale = async (
    productId: number,
    quantity: number,
    unit: string
  ): Promise<number> => {
    const product = await productsApi.getById(productId);
    if (!product) throw new Error("Producto no encontrado");

    const stockInBase = convertToBaseUnit(Number(product.stock), product.unit);
    const soldInBase = convertToBaseUnit(quantity, unit);
    const newStockInBase = stockInBase - soldInBase;
    
    return parseFloat(convertFromBaseUnit(newStockInBase, product.unit).toFixed(3));
  };

  const handleSaveEdit = async () => {
    if (
      !isEditMode.isEditing ||
      !isEditMode.originalSaleId ||
      !originalSaleBackup
    ) {
      showNotification("No hay una venta en edición", "error");
      return;
    }
    setIsProcessingPayment(true);
    try {
      const needsRedirect = await ensureCashIsOpen();
      if (needsRedirect.needsRedirect) {
        setShouldRedirectToCash(true);
        showNotification(
          "Debes abrir la caja primero para editar ventas",
          "error"
        );
        setIsProcessingPayment(false);
        return;
      }
      const stockValidation = validateStockForSale(newSale.products);
      if (!stockValidation.isValid) {
        stockValidation.errors.forEach((error) =>
          showNotification(error, "error")
        );
        setIsProcessingPayment(false);
        return;
      }
      for (const product of newSale.products) {
        try {
          const updatedStock = await updateStockAfterSale(
            product.id,
            product.quantity,
            product.unit
          );
          await productsApi.update(product.id, { stock: updatedStock });
        } catch (error) {
          console.error(
            `Error actualizando stock para producto ${product.id}:`,
            error
          );
          showNotification(
            `Error actualizando stock para ${product.name}`,
            "error"
          );
          setIsProcessingPayment(false);
          return;
        }
      }
      const updatedSaleData: Partial<Sale> = {
        products: newSale.products,
        paymentMethods: newSale.paymentMethods,
        total: newSale.total,
        manualAmount: newSale.manualAmount,
        manualProfitPercentage: newSale.manualProfitPercentage,
        concept: newSale.concept,
        priceListId: selectedPriceListId || undefined, 
        appliedPromotion: selectedPromotions || undefined,
        edited: true,
        editHistory: [
          ...(originalSaleBackup.editHistory || []),
          {
            date: new Date().toISOString(),
            changes: {
              products: newSale.products,
              total: newSale.total,
              paymentMethods: newSale.paymentMethods,
              priceListId: selectedPriceListId || undefined, 
            },
            previousTotal: originalSaleBackup.total,
            newTotal: newSale.total,
          },
        ],
      };
      const updatedSale = await updateSale(isEditMode.originalSaleId, updatedSaleData);
      await updateDailyCashForEditedSale(originalSaleBackup, updatedSale);
      setSales((prev) =>
        prev.map((s) => (s.id === isEditMode.originalSaleId ? updatedSale : s))
      );
      setIsEditMode({ isEditing: false });
      setOriginalSaleBackup(null);
      setOriginalStockBackup([]);
      setIsOpenModal(false);
      setIsPaymentModalOpen(false);
      setNewSale({
        products: [],
        paymentMethods: [{ method: "EFECTIVO", amount: 0 }],
        total: 0,
        date: new Date().toISOString(),
        barcode: "",
        manualAmount: 0,
        manualProfitPercentage: 0,
        concept: "",
      });
      setSelectedPriceListId(null);
      setSelectedPromotions(null);
      setTemporarySelectedPromotion(null);
      showNotification("Venta editada correctamente", "success");
    } catch (error) {
      console.error("Error al guardar edición:", error);
      showNotification("Error al guardar la edición", "error");
    } finally {
      setIsProcessingPayment(false);
    }
  };
  const updateDailyCashForEditedSale = async (
    originalSale: Sale,
    updatedSale: Sale
  ) => {
    try {
      const today = getLocalDateString();
      const dailyCash = await dailyCashApi.getByDate(today);
      if (!dailyCash) {
        throw new Error("No se encontró la caja diaria para hoy");
      }
        const filteredMovements = dailyCash.movements.filter(
          (movement: DailyCashMovement) => !isEditMode.originalCashMovementIds?.includes(movement.id)
        );
      const totalProfit = calculateTotalProfit(
        updatedSale.products,
        updatedSale.manualAmount || 0,
        updatedSale.manualProfitPercentage || 0
      );
      const newMovement: DailyCashMovement = {
        id: Date.now(),
        amount: updatedSale.total,
        description: `Venta editada - ${updatedSale.concept || "general"}`,
        type: "INGRESO",
        date: new Date().toISOString(),
        paymentMethod: updatedSale.paymentMethods[0]?.method || "EFECTIVO",
        items: updatedSale.products.map((p) => {
          const priceInfo = calculatePrice(p, p.quantity, p.unit);
          return {
            productId: p.id,
            productName: p.name,
            quantity: p.quantity,
            unit: p.unit,
            price: priceInfo.finalPrice / p.quantity,
            costPrice: p.costPrice,
            profit: priceInfo.profit,
            size: p.size,
            color: p.color,
          };
        }),
        profit: totalProfit,
        combinedPaymentMethods: updatedSale.paymentMethods,
        customerName: updatedSale.customerName || "CLIENTE OCASIONAL",
        createdAt: new Date().toISOString(),
        originalSaleId: updatedSale.id,
      };
      const updatedMovements = [...filteredMovements, newMovement];
      const totalIncome = updatedMovements
        .filter((m) => m.type === "INGRESO")
        .reduce((sum, m) => sum + m.amount, 0);
      const totalExpense = updatedMovements
        .filter((m) => m.type === "EGRESO")
        .reduce((sum, m) => sum + m.amount, 0);
      const totalProfitUpdated = updatedMovements
        .filter((m) => m.type === "INGRESO")
        .reduce((sum, m) => sum + (m.profit || 0), 0);
      await dailyCashApi.update(dailyCash.id, {
        movements: updatedMovements,
        totalIncome,
        totalExpense,
        totalProfit: totalProfitUpdated,
      });
    } catch (error) {
      console.error("Error al actualizar caja diaria:", error);
      throw error;
    }
  };
  const calculateFinalTotal = (
    products: Product[],
    manualAmount: number = 0,
    promotion?: Promotion | null
  ): number => {
    const subtotal = calculateCombinedTotal(products) + manualAmount;
    if (!promotion) return subtotal;
    let discount = 0;
    if (promotion.type === "PERCENTAGE_DISCOUNT") {
      discount = (subtotal * promotion.discount) / 100;
    } else if (promotion.type === "FIXED_DISCOUNT") {
      discount = promotion.discount;
    }
    return Math.max(0, subtotal - Math.min(discount, subtotal));
  };
  const validateStockForSale = (
    saleProducts: Product[]
  ): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    for (const product of saleProducts) {
      const originalProduct = products.find((p) => p.id === product.id);
      if (!originalProduct) {
        errors.push(`Producto ${product.name} no encontrado`);
        continue;
      }
      const stockCheck = checkStockAvailability(
        originalProduct,
        product.quantity,
        product.unit
      );
      if (!stockCheck.available) {
        errors.push(
          `Stock insuficiente para ${product.name}. ` +
            `Solicitado: ${product.quantity} ${product.unit}, ` +
            `Disponible: ${stockCheck.availableQuantity.toFixed(2)} ${
              stockCheck.availableUnit
            }`
        );
      }
    }
    return {
      isValid: errors.length === 0,
      errors,
    };
  };
  const synchronizePaymentMethods = (
    paymentMethods: PaymentSplit[],
    total: number
  ): PaymentSplit[] => {
    const currentTotal = paymentMethods.reduce(
      (sum, method) => sum + method.amount,
      0
    );
    if (Math.abs(currentTotal - total) < 0.01) {
      return paymentMethods;
    }
    if (paymentMethods.length === 1) {
      return [{ ...paymentMethods[0], amount: total }];
    } else {
      const ratio = total / currentTotal;
      return paymentMethods.map((method) => ({
        ...method,
        amount: parseFloat((method.amount * ratio).toFixed(2)),
      }));
    }
  };
  const applyPromotionsToProducts = useCallback(
    (promotionToApply: Promotion) => {
      setNewSale((prev) => {
        const currentSubtotal =
          calculateCombinedTotal(prev.products) + (prev.manualAmount || 0);
        if (
          promotionToApply.minPurchaseAmount &&
          promotionToApply.minPurchaseAmount > 0
        ) {
          if (currentSubtotal < promotionToApply.minPurchaseAmount) {
            showNotification(
              `Esta promoción requiere un monto mínimo de ${formatCurrency(
                promotionToApply.minPurchaseAmount
              )}. Subtotal actual: ${formatCurrency(currentSubtotal)}`,
              "error"
            );
            return prev;
          }
        }
        const now = new Date();
        const startDate = new Date(promotionToApply.startDate);
        const endDate = promotionToApply.endDate
          ? new Date(promotionToApply.endDate)
          : null;
        if (now < startDate) {
          showNotification(
            `Esta promoción estará disponible a partir del ${startDate.toLocaleDateString()}`,
            "error"
          );
          return prev;
        }
        if (endDate && now > endDate) {
          showNotification(
            `Esta promoción expiró el ${endDate.toLocaleDateString()}`,
            "error"
          );
          return prev;
        }
        if (promotionToApply.status === "inactive") {
          showNotification("Esta promoción no está activa", "error");
          return prev;
        }
        let discountAmount = 0;
        if (promotionToApply.type === "PERCENTAGE_DISCOUNT") {
          discountAmount = (currentSubtotal * promotionToApply.discount) / 100;
        } else if (promotionToApply.type === "FIXED_DISCOUNT") {
          discountAmount = promotionToApply.discount;
        }
        discountAmount = Math.min(discountAmount, currentSubtotal);
        const newTotal = Math.max(0, currentSubtotal - discountAmount);
        const updatedPaymentMethods = synchronizePaymentMethods(
          prev.paymentMethods,
          newTotal
        );
        showNotification(`Promoción aplicada correctamente`, "success");
        return {
          ...prev,
          total: newTotal,
          paymentMethods: updatedPaymentMethods,
          appliedPromotion: promotionToApply,
        };
      });
    },
    [showNotification]
  );
  const removePromotion = () => {
    setNewSale((prevSale) => {
      const currentSubtotal =
        calculateCombinedTotal(prevSale.products) +
        (prevSale.manualAmount || 0);
      const updatedPaymentMethods = synchronizePaymentMethods(
        prevSale.paymentMethods,
        currentSubtotal
      );
      return {
        ...prevSale,
        total: currentSubtotal,
        paymentMethods: updatedPaymentMethods,
        appliedPromotion: undefined,
      };
    });
    setSelectedPromotions(null);
    showNotification("Promoción removida", "info");
  };
  const handleDeleteProductClick = (productId: number, productName: string) => {
    setProductToDelete({ id: productId, name: productName });
    setIsDeleteProductModalOpen(true);
  };
  const handleConfirmCreditInstallment = () => {
    if (!selectedCustomer && !customerName.trim()) {
      showNotification(
        "Debe seleccionar o ingresar un cliente para crédito en cuotas",
        "error"
      );
      return;
    }
    if (selectedCustomer && customerName.trim()) {
      showNotification(
        "Solo puede seleccionar un cliente existente O ingresar uno nuevo. Si seleccionó un cliente, borre el nombre del nuevo cliente.",
        "error"
      );
      return;
    }
    if (creditInstallmentDetails.numberOfInstallments > 36) {
      showNotification("El número máximo de cuotas es 36", "error");
      return;
    }
    if (creditInstallmentDetails.interestRate > 50) {
      showNotification("La tasa de interés no puede exceder el 50%", "error");
      return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setIsCreditInstallmentModalOpen(false);
    if (selectedCustomer) {
      setCustomerName("");
    }
    handleConfirmPayment();
    showNotification(
      "Configuración de crédito en cuotas aplicada. Procesando venta...",
      "success"
    );
  };
  const handleConfirmProductDelete = () => {
    if (!productToDelete) return;
    setNewSale((prev) => {
      const updatedProducts = prev.products.filter(
        (p) => p.id !== productToDelete.id
      );
      const newTotal = calculateFinalTotal(
        updatedProducts,
        prev.manualAmount || 0,
        selectedPromotions
      );
      return {
        ...prev,
        products: updatedProducts,
        total: newTotal,
        paymentMethods: synchronizePaymentMethods(
          prev.paymentMethods,
          newTotal
        ),
      };
    });
    showNotification(`Producto ${productToDelete.name} eliminado`, "success");
    setIsDeleteProductModalOpen(false);
    setProductToDelete(null);
  };
  const handleSaveBusinessDataSuccess = () => {
    if (selectedSale) {
      setTimeout(() => {
        setIsInfoModalOpen(true);
      }, 100);
    }
  };
  const handleOpenBusinessDataModal = (sale?: Sale) => {
    if (sale) {
      setSelectedSale(sale);
    }
    setIsBusinessDataModalOpen(true);
  };
  const handleCloseBusinessDataModal = () => {
    setIsBusinessDataModalOpen(false);
    setSelectedSale(null);
  };
  const handlePromotionSelect = (promotion: Promotion) => {
    setTemporarySelectedPromotion((prev) => {
      if (prev?.id === promotion.id) {
        return null;
      }
      return promotion;
    });
  };
  const SelectedPromotionsBadge = () => {
    if (!selectedPromotions) return null;
    const currentSubtotal =
      calculateCombinedTotal(newSale.products) + (newSale.manualAmount || 0);
    const meetsRequirements =
      !selectedPromotions.minPurchaseAmount ||
      currentSubtotal >= selectedPromotions.minPurchaseAmount;
    const now = new Date();
    const startDate = new Date(selectedPromotions.startDate);
    const endDate = selectedPromotions.endDate
      ? new Date(selectedPromotions.endDate)
      : null;
    const isActive = selectedPromotions.status === "active";
    const isInDateRange = now >= startDate && (!endDate || now <= endDate);
    const isValid = meetsRequirements && isActive && isInDateRange;
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, p: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, ml: "auto" }}>
          <Typography variant="body2" sx={{ fontWeight: "semibold" }}>
            Promoción aplicada:
          </Typography>
          <CustomChip
            label={selectedPromotions.name}
            color={isValid ? "success" : "error"}
            size="small"
            icon={<LocalOffer fontSize="small" />}
            onDelete={removePromotion}
          />
        </Box>
      </Box>
    );
  };
  const PromotionSelectionModal = () => {
    const handleCloseModal = () => {
      setIsPromotionModalOpen(false);
      setTemporarySelectedPromotion(null);
    };
    const handleApplyPromotion = () => {
      if (!temporarySelectedPromotion) {
        showNotification("Por favor selecciona una promoción", "error");
        return;
      }
      if (selectedPromotions) {
        showNotification(
          "Ya hay una promoción aplicada. Remueve la actual para aplicar una nueva.",
          "error"
        );
        return;
      }
      setSelectedPromotions(temporarySelectedPromotion);
      applyPromotionsToProducts(temporarySelectedPromotion);
      setIsPromotionModalOpen(false);
    };
    const isPromotionApplicable = (promotion: Promotion) => {
      const currentSubtotal =
        calculateCombinedTotal(newSale.products) + (newSale.manualAmount || 0);
      const now = new Date();
      const startDate = new Date(promotion.startDate);
      const endDate = promotion.endDate ? new Date(promotion.endDate) : null;
      if (promotion.minPurchaseAmount && promotion.minPurchaseAmount > 0) {
        if (currentSubtotal < promotion.minPurchaseAmount) {
          return false;
        }
      }
      if (now < startDate) return false;
      if (endDate && now > endDate) return false;
      if (promotion.status !== "active") return false;
      return true;
    };
    return (
      <Modal
        isOpen={isPromotionModalOpen}
        onClose={handleCloseModal}
        title="Seleccionar Promoción"
        bgColor="bg-white dark:bg-gray_b"
        buttons={
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
            <Button
              variant="text"
              onClick={handleCloseModal}
              sx={{
                color: "text.secondary",
                borderColor: "text.secondary",
                "&:hover": {
                  backgroundColor: "action.hover",
                  borderColor: "text.primary",
                },
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={handleApplyPromotion}
              disabled={!temporarySelectedPromotion}
              sx={{
                bgcolor: "primary.main",
                "&:hover": { bgcolor: "primary.dark" },
              }}
            >
              Aplicar promoción
            </Button>
          </Box>
        }
      >
        <Box sx={{ maxHeight: "60vh", mb: 2, overflow: "auto" }}>
          <Box sx={{ display: "grid", gap: 2 }}>
            {availablePromotions.length > 0 ? (
              availablePromotions.map((promotion) => {
                const isApplicable = isPromotionApplicable(promotion);
                const currentSubtotal =
                  calculateCombinedTotal(newSale.products) +
                  (newSale.manualAmount || 0);
                return (
                  <Card
                    key={promotion.id}
                    sx={{
                      p: 2,
                      cursor: isApplicable ? "pointer" : "not-allowed",
                      border:
                        temporarySelectedPromotion?.id === promotion.id ? 2 : 1,
                      borderColor:
                        temporarySelectedPromotion?.id === promotion.id
                          ? "primary.main"
                          : "divider",
                      bgcolor:
                        temporarySelectedPromotion?.id === promotion.id
                          ? "action.selected"
                          : "background.paper",
                      opacity: isApplicable ? 1 : 0.7,
                    }}
                    onClick={() =>
                      isApplicable && handlePromotionSelect(promotion)
                    }
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            mb: 1,
                          }}
                        >
                          <Typography
                            variant="h6"
                            sx={{ textTransform: "uppercase" }}
                          >
                            {promotion.name}
                          </Typography>
                          <CustomChip
                            label={
                              promotion.type === "PERCENTAGE_DISCOUNT"
                                ? `${promotion.discount}%`
                                : `$${promotion.discount}`
                            }
                            color={
                              promotion.type === "PERCENTAGE_DISCOUNT"
                                ? "success"
                                : "primary"
                            }
                            size="small"
                          />
                          {!isApplicable && (
                            <CustomChip
                              label="No aplicable"
                              color="error"
                              size="small"
                            />
                          )}
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {promotion.description}
                        </Typography>
                        {!isApplicable &&
                          promotion.minPurchaseAmount &&
                          promotion.minPurchaseAmount > 0 && (
                            <Typography
                              variant="body2"
                              color="error"
                              sx={{ mt: 1 }}
                            >
                              Requiere{" "}
                              {formatCurrency(promotion.minPurchaseAmount)}{" "}
                              (actual: {formatCurrency(currentSubtotal)})
                            </Typography>
                          )}
                      </Box>
                      <Box>
                        {temporarySelectedPromotion?.id === promotion.id ? (
                          <Check fontSize="small" color="primary" />
                        ) : (
                          <Box
                            sx={{
                              width: 20,
                              height: 20,
                              border: 2,
                              borderColor: isApplicable
                                ? "primary.main"
                                : "text.disabled",
                              borderRadius: 1,
                            }}
                          />
                        )}
                      </Box>
                    </Box>
                  </Card>
                );
              })
            ) : (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <LocalOffer
                  fontSize="large"
                  color="disabled"
                  style={{ marginBottom: 16 }}
                />
                <Typography variant="body1" color="text.secondary">
                  No hay promociones disponibles
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Crea promociones en la sección correspondiente
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Modal>
    );
  };
  const handleOpenPaymentModal = () => {
    if (isProcessingPayment || isPaymentModalOpen) {
      return;
    }
    if (newSale.products.length === 0) {
      showNotification("Debe agregar al menos un producto", "error");
      return;
    }
    const hasCreditMethod = newSale.paymentMethods.some(
      (method) => method.method === "CREDITO_CUOTAS"
    );
    if (hasCreditMethod) {
      setIsCreditInstallmentModalOpen(true);
      return;
    }
    if (isCredit) {
      handleConfirmPayment();
      return;
    }
    setIsOpenModal(false);
    setTimeout(() => {
      setIsPaymentModalOpen(true);
    }, 100);
  };
  const handleConfirmPayment = async () => {
    if (isProcessingPayment) {
      return;
    }
    setIsProcessingPayment(true);
    try {
      const hasCreditMethod = newSale.paymentMethods.some(
        (method) => method.method === "CREDITO_CUOTAS"
      );
      if (!isCredit && !hasCreditMethod) {
        const needsRedirect = await ensureCashIsOpen();
        if (needsRedirect.needsRedirect) {
          setShouldRedirectToCash(true);
          showNotification(
            "Debes abrir la caja primero para realizar ventas",
            "error"
          );
          setIsProcessingPayment(false);
          setIsPaymentModalOpen(false);
          return;
        }
      }
      const stockValidation = validateStockForSale(newSale.products);
      if (!stockValidation.isValid) {
        stockValidation.errors.forEach((error) =>
          showNotification(error, "error")
        );
        setIsProcessingPayment(false);
        return;
      }
      if (hasCreditMethod) {
        if (creditInstallmentDetails.numberOfInstallments > 36) {
          showNotification("El número máximo de cuotas es 36", "error");
          setIsProcessingPayment(false);
          return;
        }
        if (creditInstallmentDetails.interestRate > 50) {
          showNotification(
            "La tasa de interés no puede exceder el 50%",
            "error"
          );
          setIsProcessingPayment(false);
          return;
        }
      }
      if (isCredit || hasCreditMethod) {
        const normalizedName = customerName.toUpperCase().trim();
        if (!normalizedName && !selectedCustomer) {
          showNotification("Debe ingresar o seleccionar un cliente", "error");
          setIsProcessingPayment(false);
          return;
        }
        if (normalizedName && !selectedCustomer) {
          const existingCustomer = customers.find(
            (customer) => customer.name.toUpperCase() === normalizedName
          );
          if (existingCustomer) {
            showNotification(
              "Este cliente ya existe. Selecciónelo de la lista o use un nombre diferente.",
              "error"
            );
            setIsProcessingPayment(false);
            return;
          }
        }
      }
      if (!isCredit && !hasCreditMethod && !registerCheck) {
        const totalPayment = newSale.paymentMethods.reduce(
          (sum, method) => sum + method.amount,
          0
        );
        if (totalPayment < newSale.total) {
          showNotification(
            `Pago insuficiente. Total: ${formatCurrency(
              newSale.total
            )}, Recibido: ${formatCurrency(totalPayment)}`,
            "error"
          );
          setIsProcessingPayment(false);
          return;
        }
      }

      let customerId = selectedCustomer?.value;
      let finalCustomerName = "";
      let finalCustomerPhone = "";
      const generateCustomerId = (name: string): string => {
        const cleanName = name
          .toUpperCase()
          .trim()
          .replace(/\s+/g, "-")
          .replace(/[^a-zA-Z0-9-]/g, "");
        const timestamp = Date.now().toString().slice(-5);
        return `${cleanName}-${timestamp}`;
      };
      if ((hasCreditMethod || isCredit) && !customerId && customerName) {
        const newCustomer: Customer = {
          id: generateCustomerId(customerName),
          name: customerName.toUpperCase().trim(),
          phone: customerPhone,
          status: "activo",
          pendingBalance: 0,
          purchaseHistory: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          rubro: rubro === "Todos los rubros" ? undefined : rubro,
        };
        try {
          const createdCustomer = await customersApi.create(newCustomer);
          setCustomers([...customers, createdCustomer]);
          setCustomerOptions([
            ...customerOptions,
            { value: createdCustomer.id, label: createdCustomer.name },
          ]);
          customerId = createdCustomer.id;
          finalCustomerName = customerName.toUpperCase().trim();
          finalCustomerPhone = customerPhone;
        } catch (error) {
          console.error("Error creando cliente:", error);
          showNotification("Error al crear el cliente", "error");
          setIsProcessingPayment(false);
          return;
        }
      } else if ((hasCreditMethod || isCredit) && selectedCustomer) {
        const customer = customers.find((c) => c.id === selectedCustomer.value);
        if (customer) {
          customerId = customer.id;
          finalCustomerName = customer.name;
          finalCustomerPhone = customer.phone || "";
        }
      } else if (selectedCustomer && !hasCreditMethod && !isCredit) {
        const customer = customers.find((c) => c.id === selectedCustomer.value);
        if (customer) {
          customerId = customer.id;
          finalCustomerName = customer.name;
          finalCustomerPhone = customer.phone || "";
        }
      } else {
        finalCustomerName = "CLIENTE OCASIONAL";
      }
      const saleToSave: Omit<Sale, 'id'> = {
        products: newSale.products,
        paymentMethods: newSale.paymentMethods, // Always include payment methods
        total: newSale.total,
        date: new Date().toISOString(),
        barcode: newSale.barcode || "",
        manualAmount: newSale.manualAmount || 0,
        manualProfitPercentage: newSale.manualProfitPercentage || 0,
        credit: isCredit || hasCreditMethod,
        creditType: hasCreditMethod
          ? "credito_cuotas"
          : isCredit
          ? "cuenta_corriente"
          : undefined,
        customerName: finalCustomerName,
        customerPhone: finalCustomerPhone || "",
        customerId: customerId || "",
        paid: !isCredit && !hasCreditMethod,
        concept: newSale.concept || "",
        priceListId: selectedPriceListId || undefined,
        appliedPromotion: selectedPromotions || undefined,
      };
      let savedSale: Sale;
      if (hasCreditMethod) {
        saleToSave.credit = true;
        saleToSave.creditType = "credito_cuotas";
        saleToSave.paid = false;
        const installments = calculateInstallments(
          saleToSave.total,
          creditInstallmentDetails.numberOfInstallments,
          creditInstallmentDetails.interestRate,
          creditInstallmentDetails.startDate
        );
        const validInstallments = installments.map((inst) => ({
          ...inst,
          amount: isNaN(inst.amount)
            ? saleToSave.total / creditInstallmentDetails.numberOfInstallments
            : inst.amount,
          interestAmount: isNaN(inst.interestAmount) ? 0 : inst.interestAmount,
        }));
        const totalWithInterest = validInstallments.reduce(
          (sum, inst) => sum + inst.amount,
          0
        );
        saleToSave.total = totalWithInterest;
        saleToSave.creditDetails = {
          type: "credito_cuotas",
          totalAmount: totalWithInterest,
          currentInstallment: creditInstallmentDetails.currentInstallment || 1,
          numberOfInstallments:
            creditInstallmentDetails.numberOfInstallments || 1,
          interestRate: creditInstallmentDetails.interestRate,
          penaltyRate: creditInstallmentDetails.penaltyRate,
          startDate: creditInstallmentDetails.startDate,
          paidAmount: 0,
          remainingAmount: totalWithInterest,
          principalAmount: saleToSave.total,
          totalNumberOfInstallments:
            creditInstallmentDetails.numberOfInstallments,
        };
        const saleWithInstallments = {
          ...saleToSave,
          installments: validInstallments.map((inst) => ({
            number: inst.number,
            dueDate: inst.dueDate,
            amount: inst.amount,
            interestAmount: inst.interestAmount,
            penaltyAmount: inst.penaltyAmount || 0,
            status: 'pendiente' as const,
            totalAmount: inst.amount + inst.interestAmount + (inst.penaltyAmount || 0),
          })),
        };
        savedSale = await addSale(saleWithInstallments);
      }
      else {
        savedSale = await addSale(saleToSave);
      }
      
      setSales([...sales, savedSale]);
      if (selectedPromotions && selectedPromotions.id) {
        await promotionsApi.update(selectedPromotions.id, {
          updatedAt: new Date().toISOString(),
        });
        const updatedPromotions = await promotionsApi.getAll();
        const activePromotions = updatedPromotions.filter(
          (p: Promotion) =>
            p.status === "active" &&
            (p.rubro === rubro || p.rubro === "Todos los rubros")
        );
        setAvailablePromotions(activePromotions);
      }
      if (isCredit || hasCreditMethod) {
        showNotification(
          `Venta ${
            isCredit ? "a cuenta corriente" : "a crédito en cuotas"
          } confirmada correctamente`,
          "success"
        );
      } else {
        showNotification("Venta registrada correctamente", "success");
      }
      setNewSale({
        products: [],
        paymentMethods: [{ method: "EFECTIVO", amount: 0 }],
        total: 0,
        date: new Date().toISOString(),
        barcode: "",
        manualAmount: 0,
        manualProfitPercentage: 0,
        concept: "",
      });
      setIsCredit(false);
      setIsCreditCuotasSelected(false);
      setRegisterCheck(false);
      setSelectedCustomer(null);
      setCustomerName("");
      setCustomerPhone("");
      setSelectedPriceListId(null);
      setSelectedPromotions(null);
      setTemporarySelectedPromotion(null);
      if (hasCreditMethod) {
        setCreditInstallmentDetails({
          numberOfInstallments: 1,
          interestRate: 0,
          penaltyRate: 0,
          startDate: new Date().toISOString().split("T")[0],
          currentInstallment: 1,
        });
      }
      setIsOpenModal(false);
      setIsPaymentModalOpen(false);
      setIsCreditInstallmentModalOpen(false);
      if (!isCredit && !hasCreditMethod) {
        setSelectedSale(savedSale);
        setTimeout(() => {
          setIsInfoModalOpen(true);
        }, 200);
      }
      console.log("✅ Venta guardada:", saleToSave);
      console.log("✅ Venta guardada en DB:", savedSale);
      if (saleToSave.credit && savedSale) {
        console.log("✅ Cuotas creadas para venta:", savedSale.id);
      }
    } catch (error) {
      console.error("Error al procesar la venta:", error);
      showNotification("Error al procesar la venta", "error");
      setIsProcessingPayment(false);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const filteredSales = sales
    .filter((sale) => {
      const saleDate = new Date(sale.date);
      const saleMonth = (saleDate.getMonth() + 1).toString().padStart(2, "0");
      const saleYear = saleDate.getFullYear().toString();
      const matchesMonth =
        selectedMonth !== undefined
          ? Number(saleMonth) === selectedMonth
          : true;
      const matchesYear = selectedYear
        ? saleYear === selectedYear.toString()
        : true;
      const matchesRubro =
        rubro === "Todos los rubros" ||
        sale.products.some((product) => product.rubro === rubro);
      return matchesMonth && matchesYear && matchesRubro;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleRegisterCheckChange = (checked: boolean) => {
    setRegisterCheck(checked);
    if (checked) {
      setNewSale((prev) => ({
        ...prev,
        paymentMethods: [
          { method: "CHEQUE" as PaymentMethod, amount: prev.total },
        ],
      }));
    } else {
      setNewSale((prev) => ({
        ...prev,
        paymentMethods: [
          { method: "EFECTIVO" as PaymentMethod, amount: prev.total },
        ],
      }));
    }
  };
  const handleProductScan = async (productId: number) => {
    const price = await getProductPrice(productId);
    setNewSale((prevState) => {
      const existingProductIndex = prevState.products.findIndex(
        (p) => p.id === productId
      );
      if (existingProductIndex >= 0) {
        const updatedProducts = [...prevState.products];
        const existingProduct = updatedProducts[existingProductIndex];
        updatedProducts[existingProductIndex] = {
          ...existingProduct,
          quantity: existingProduct.quantity + 1,
        };
        const newTotal = calculateFinalTotal(
          updatedProducts,
          prevState.manualAmount || 0,
          selectedPromotions
        );
        return {
          ...prevState,
          products: updatedProducts,
          total: newTotal,
          barcode: "",
        };
      } else {
        const productToAdd = products.find((p) => p.id === productId);
        if (!productToAdd) return prevState;
        const newProduct = {
          ...productToAdd,
          price, 
          quantity: 1,
          unit: productToAdd.unit,
          discount: 0,
          surcharge: 0,
        };
        const updatedProducts = [...prevState.products, newProduct];
        const newTotal = calculateFinalTotal(
          updatedProducts,
          prevState.manualAmount || 0,
          selectedPromotions
        );
        return {
          ...prevState,
          products: updatedProducts,
          total: newTotal,
          barcode: "",
        };
      }
    });
  };
  const handlePrintTicket = async () => {
    if (!ticketRef.current || !selectedSale) return;
    try {
      await ticketRef.current.print();
    } catch (error) {
      console.error("Error al imprimir ticket:", error);
      showNotification("Error al imprimir ticket", "error");
    }
  };
  const handleManualAmountChange = (value: number) => {
    console.log("Manual amount received:", value, typeof value);
    setNewSale((prev) => {
      const newTotal = calculateFinalTotal(
        prev.products,
        value,
        selectedPromotions
      );
      const updatedPaymentMethods = synchronizePaymentMethods(
        prev.paymentMethods,
        newTotal
      );
      return {
        ...prev,
        manualAmount: value,
        total: newTotal,
        paymentMethods: updatedPaymentMethods,
      };
    });
  };
  const handleCreditChange = (checked: boolean) => {
    setIsCredit(checked);
    setIsCreditCuotasSelected(false);
    if (checked) {
      setNewSale((prev) => ({
        ...prev,
        paymentMethods: [
          { method: "CUENTA_CORRIENTE" as PaymentMethod, amount: prev.total },
        ],
      }));
    } else {
      setNewSale((prev) => ({
        ...prev,
        paymentMethods: [{ method: "EFECTIVO", amount: prev.total }],
      }));
    }
  };
  const handleYearChange = (value: string | number) => {
    setSelectedYear(value ? (value as number) : currentYear);
  };
  const handlePaymentMethodChange = (
    index: number,
    field: keyof PaymentSplit,
    value: string | number
  ) => {
    setNewSale((prev) => {
      const updatedMethods = [...prev.paymentMethods];
      if (field === "method" && value === "CHEQUE") {
        setIsCredit(true);
        setIsCreditCuotasSelected(false);
        setRegisterCheck(true);
      }
      if (
        field === "method" &&
        value !== "CHEQUE" &&
        prev.paymentMethods[index]?.method === "CHEQUE"
      ) {
        setIsCredit(false);
        setIsCreditCuotasSelected(false);
        setRegisterCheck(false);
      }
      if (field === "method" && value === "CREDITO_CUOTAS") {
        setIsCreditCuotasSelected(true);
        setIsCredit(false);
        setRegisterCheck(false);
        setIsCreditInstallmentModalOpen(true);
        return {
          ...prev,
          paymentMethods: [
            { method: "CREDITO_CUOTAS" as PaymentMethod, amount: prev.total },
          ],
        };
      }
      if (
        field === "method" &&
        prev.paymentMethods[index]?.method === "CREDITO_CUOTAS" &&
        value !== "CREDITO"
      ) {
        setIsCredit(false);
        setIsCreditCuotasSelected(false);
        setRegisterCheck(false);
        setCreditInstallmentDetails({
          numberOfInstallments: 1,
          interestRate: 0,
          penaltyRate: 0,
          startDate: new Date().toISOString().split("T")[0],
          currentInstallment: 1,
        });
      }
      if (field === "amount") {
        let numericValue: number;
        if (typeof value === "string") {
          numericValue = parseCurrencyInput(value, 2);
        } else {
          numericValue = value;
        }
        updatedMethods[index] = {
          ...updatedMethods[index],
          amount: parseFloat(numericValue.toFixed(2)),
        };
        if (updatedMethods.length === 2) {
          const otherIndex = index === 0 ? 1 : 0;
          const remaining = prev.total - numericValue;
          updatedMethods[otherIndex] = {
            ...updatedMethods[otherIndex],
            amount: parseFloat(Math.max(0, remaining).toFixed(2)),
          };
        }
        return {
          ...prev,
          paymentMethods: updatedMethods,
        };
      } else {
        const paymentMethod = value as PaymentMethod;
        updatedMethods[index] = {
          ...updatedMethods[index],
          [field]: paymentMethod,
        };
        return {
          ...prev,
          paymentMethods: updatedMethods,
        };
      }
    });
  };
  const addPaymentMethod = () => {
    setNewSale((prev) => {
      if (
        prev.paymentMethods.some((method) => method.method === "CREDITO_CUOTAS")
      ) {
        showNotification(
          "No se pueden agregar otros métodos de pago cuando se selecciona CRÉDITO",
          "error"
        );
        return prev;
      }
      if (prev.paymentMethods.length >= paymentOptions.length) return prev;
      const total = calculateFinalTotal(
        prev.products,
        prev.manualAmount || 0,
        selectedPromotions
      );
      if (prev.paymentMethods.length < 2) {
        const newMethodCount = prev.paymentMethods.length + 1;
        const share = total / newMethodCount;
        const updatedMethods = prev.paymentMethods.map((method) => ({
          ...method,
          amount: share,
        }));
        return {
          ...prev,
          paymentMethods: [
            ...updatedMethods,
            {
              method: paymentOptions[prev.paymentMethods.length]
                .value as PaymentMethod,
              amount: share,
            },
          ],
        };
      } else {
        return {
          ...prev,
          paymentMethods: [
            ...prev.paymentMethods,
            {
              method: paymentOptions[prev.paymentMethods.length]
                .value as PaymentMethod,
              amount: 0,
            },
          ],
        };
      }
    });
  };
  const removePaymentMethod = (index: number) => {
    setNewSale((prev) => {
      if (prev.paymentMethods.length <= 1) return prev;
      if (prev.paymentMethods[index]?.method === "CREDITO_CUOTAS") {
        showNotification(
          "No se puede eliminar el método de pago CRÉDITO",
          "error"
        );
        return prev;
      }
      const updatedMethods = [...prev.paymentMethods];
      updatedMethods.splice(index, 1);
      const total = calculateFinalTotal(
        prev.products,
        prev.manualAmount || 0,
        selectedPromotions
      );
      if (updatedMethods.length === 1) {
        updatedMethods[0].amount = total;
      } else {
        const share = total / updatedMethods.length;
        updatedMethods.forEach((m, i) => {
          updatedMethods[i] = {
            ...m,
            amount: share,
          };
        });
      }
      return {
        ...prev,
        paymentMethods: updatedMethods,
      };
    });
  };
  const handleAddSale = useCallback(async () => {
    const needsRedirect = await ensureCashIsOpen();
    if (needsRedirect.needsRedirect) {
      setShouldRedirectToCash(true);
      return;
    }
    setIsEditMode({
      isEditing: false,
      originalSaleId: undefined,
      originalCashMovementIds: [],
    });
    setOriginalSaleBackup(null);
    setOriginalStockBackup([]);
    if (rubro !== "Todos los rubros") {
      const allLists = await priceListsApi.getAll();
      const lists = allLists.filter((list) => list.rubro === rubro);
      setAvailablePriceLists(lists); 
      const defaultList = availablePriceLists.find((list) => list.isDefault);
      setSelectedPriceListId(defaultList?.id || null);
    }
    setIsOpenModal(true);
  }, [rubro]);

  const handleOpenInfoModal = (sale: Sale) => {
    if (!sale) {
      showNotification("Error: Venta no válida", "error");
      return;
    }
    setSelectedSale(sale);
    setIsInfoModalOpen(true);
  };
  const handleCloseModal = () => {
    setNewSale({
      products: [],
      paymentMethods: [{ method: "EFECTIVO", amount: 0 }],
      total: 0,
      date: new Date().toISOString(),
      barcode: "",
      manualAmount: 0,
      manualProfitPercentage: 0,
      concept: "",
    });
    setIsCredit(false);
    setIsCreditCuotasSelected(false);
    setRegisterCheck(false);
    setSelectedCustomer(null);
    setCustomerName("");
    setCustomerPhone("");
    setSelectedPriceListId(null);
    setSelectedPromotions(null);
    setTemporarySelectedPromotion(null);
    setCreditInstallmentDetails({
      numberOfInstallments: 1,
      interestRate: 0,
      penaltyRate: 0,
      startDate: new Date().toISOString().split("T")[0],
      currentInstallment: 1,
    });
    setIsOpenModal(false);
    setIsPaymentModalOpen(false);
    setIsCreditInstallmentModalOpen(false);
    setIsProcessingPayment(false);
    setIsEditMode({
      isEditing: false,
      originalSaleId: undefined,
      originalCashMovementIds: [],
    });
    setOriginalSaleBackup(null);
    setOriginalStockBackup([]);
  };
  const handleCloseInfoModal = () => {
    setIsInfoModalOpen(false);
    setSelectedSale(null);
  };
  const handleQuantityChange = useCallback(
    (productId: number, quantity: number, unit: Product["unit"]) => {
      setNewSale((prevState) => {
        const product = products.find((p) => p.id === productId);
        if (!product) return prevState;
        const stockCheck = checkStockAvailability(product, quantity, unit);
        if (!stockCheck.available) {
          showNotification(
            `No hay suficiente stock para ${
              product.name
            }. Stock disponible: ${stockCheck.availableQuantity.toFixed(2)} ${
              stockCheck.availableUnit
            }`,
            "error"
          );
          return prevState;
        }
        const updatedProducts = prevState.products.map((p) => {
          if (p.id === productId) {
            return { ...p, quantity, unit };
          }
          return p;
        });
        const newTotal = calculateFinalTotal(
          updatedProducts,
          prevState.manualAmount || 0,
          selectedPromotions
        );
        const updatedPaymentMethods = synchronizePaymentMethods(
          prevState.paymentMethods,
          newTotal
        );
        return {
          ...prevState,
          products: updatedProducts,
          paymentMethods: updatedPaymentMethods,
          total: newTotal,
        };
      });
    },
    [products, selectedPromotions, showNotification]
  );
  const handleUnitChange = useCallback(
    (
      productId: number,
      selectedValue: string | number,
      currentQuantity: number
    ) => {
      if (!selectedValue) return;
      setNewSale((prevState) => {
        const updatedProducts = prevState.products.map((p) => {
          if (p.id === productId) {
            const compatibleUnits = getCompatibleUnits(p.unit);
            const isCompatible = compatibleUnits.some(
              (u) => u.value === selectedValue
            );
            if (!isCompatible) return p;
            const newUnit = selectedValue as Product["unit"];
            const basePrice =
              p.basePrice ?? p.price / convertToBaseUnit(1, p.unit);
            const newPrice = basePrice * convertToBaseUnit(1, newUnit);
            return {
              ...p,
              unit: newUnit,
              quantity: currentQuantity,
              price: parseFloat(newPrice.toFixed(2)),
              basePrice: basePrice,
            };
          }
          return p;
        });
        const newTotal = calculateFinalTotal(
          updatedProducts,
          prevState.manualAmount || 0,
          selectedPromotions
        );
        return {
          ...prevState,
          products: updatedProducts,
          total: newTotal,
        };
      });
    },
    [selectedPromotions]
  );
  useEffect(() => {
    const fetchPromotions = async () => {
      try {
        const storedPromotions = await promotionsApi.getAll();
        const now = new Date();
        const activePromotions = storedPromotions.filter((p: Promotion) => {
          if (p.status !== "active") return false;
          if (!(p.rubro === rubro || p.rubro === "Todos los rubros"))
            return false;
          const startDate = new Date(p.startDate);
          const endDate = p.endDate ? new Date(p.endDate) : null;
          if (now < startDate) return false;
          if (endDate && now > endDate) return false;
          return true;
        });
        setAvailablePromotions(activePromotions);
      } catch (error) {
        console.error("Error fetching promotions:", error);
      }
    };
    fetchPromotions();
  }, [rubro]);
  useEffect(() => {
    const loadPriceLists = async () => {
      if (rubro !== "Todos los rubros") {
        try {
          const allLists = await priceListsApi.getAll();
          const lists = allLists.filter(
            (list) => list.rubro === rubro && list.isActive !== false
          );
          const generalListExists = lists.some(
            (list: PriceList) => list.name === "General"
          );
          if (!generalListExists) {
            const generalList: PriceList = {
              id: Date.now(),
              name: "General",
              rubro,
              isDefault: true,
              isActive: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await priceListsApi.create(generalList);
            lists.push(generalList);
          }
          const uniqueLists = (Array.from(
            new Map(lists.map((list: PriceList) => [list.name, list])).values()
          ) as PriceList[]).sort((a, b) => {
            if (a.isDefault && !b.isDefault) return -1;
            if (!a.isDefault && b.isDefault) return 1;
            return a.name.localeCompare(b.name);
          });
          setPriceLists(uniqueLists);
          const defaultList = uniqueLists.find((list: PriceList) => list.isDefault);
          if (defaultList && !selectedPriceListId) {
            setSelectedPriceListId(defaultList.id);
          }
        } catch (error) {
          console.error("Error loading price lists:", error);
        }
      } else {
        setPriceLists([]);
        setAvailablePriceLists([]);
        setSelectedPriceListId(null);
      }
    };
    loadPriceLists();
  }, [rubro]);
  useEffect(() => {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    if (selectedMonth !== currentMonth || selectedYear !== currentYear) {
      setSelectedMonth(currentMonth);
      setSelectedYear(currentYear);
    }
  }, [new Date().getMonth()]);
  useEffect(() => {
    setNewSale((prev) => {
      const currentPaymentTotal = prev.paymentMethods.reduce(
        (sum, method) => sum + method.amount,
        0
      );
      if (Math.abs(currentPaymentTotal - prev.total) > 0.01) {
        return {
          ...prev,
          paymentMethods: synchronizePaymentMethods(
            prev.paymentMethods,
            prev.total
          ),
        };
      }
      return prev;
    });
  }, [newSale.total]);
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const filters: CustomerFilters = {};
        if (rubro && rubro !== "Todos los rubros") {
          filters.rubro = rubro;
        }
        const allCustomers = await fetchCustomersApi(filters);
        setCustomers(allCustomers);
        setCustomerOptions(
          allCustomers.map((customer) => ({
            value: customer.id,
            label: customer.name,
          }))
        );
      } catch (error) {
        console.error("Error al cargar clientes:", error);
      }
    };
    loadCustomers();
  }, [rubro, fetchCustomersApi]);
  useEffect(() => {
    const loadData = async () => {
      try {
        const storedProducts = await fetchProductsApi({
          rubro: rubro !== "Todos los rubros" ? rubro : undefined,
        });
        setProducts(storedProducts);
        const storedSales = await fetchSales();
        const sortedSales = storedSales.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setSales(sortedSales);
      } catch (error) {
        console.error("Error al cargar datos:", error);
        showNotification("Error al cargar los datos", "error");
      }
    };
    loadData();
  }, [rubro, fetchProductsApi, fetchSales, showNotification]);
  useEffect(() => {
    setNewSale((prev) => {
      const updatedMethods = [...prev.paymentMethods];
      if (registerCheck && updatedMethods[0]?.method === "CHEQUE") {
        updatedMethods[0].amount = prev.total;
      } else if (updatedMethods.length === 1) {
        updatedMethods[0].amount = prev.total;
      } else if (updatedMethods.length === 2) {
        const share = prev.total / updatedMethods.length;
        updatedMethods.forEach((m, i) => {
          updatedMethods[i] = {
            ...m,
            amount: share,
          };
        });
      }
      return {
        ...prev,
        paymentMethods: updatedMethods,
      };
    });
  }, [
    newSale.products,
    newSale.manualAmount,
    newSale.paymentMethods.length,
    calculateCombinedTotal,
    registerCheck,
  ]);
  useEffect(() => {
    if (registerCheck && newSale.paymentMethods[0]?.method === "CHEQUE") {
      setNewSale((prev) => ({
        ...prev,
        paymentMethods: [{ method: "CHEQUE", amount: prev.total }],
      }));
    }
  }, [registerCheck]);
  useEffect(() => {
    if (shouldRedirectToCash) {
      router.push("/caja-diaria");
    }
  }, [shouldRedirectToCash, router]);
  const expectedTotal = calculateFinalTotal(
    newSale.products,
    newSale.manualAmount || 0,
    selectedPromotions
  );
  useEffect(() => {
    if (Math.abs(newSale.total - expectedTotal) > 0.01 && selectedPromotions) {
      setNewSale((prev) => ({
        ...prev,
        total: expectedTotal,
        paymentMethods: synchronizePaymentMethods(
          prev.paymentMethods,
          expectedTotal
        ),
      }));
    }
  }, [newSale.products, newSale.manualAmount, selectedPromotions]);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isModalOpen =
        isOpenModal ||
        isInfoModalOpen ||
        isPaymentModalOpen ||
        isPromotionModalOpen ||
        isBusinessDataModalOpen;
      if (isModalOpen || rubro === "Todos los rubros" || isProcessingPayment) {
        return;
      }
      if (e.key === "F1") {
        e.preventDefault();
        handleAddSale();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    rubro,
    handleAddSale,
    isOpenModal,
    isInfoModalOpen,
    isPaymentModalOpen,
    isPromotionModalOpen,
    isBusinessDataModalOpen,
    isProcessingPayment,
  ]);
  useEffect(() => {
    if (isInfoModalOpen && selectedSale && !selectedSale.credit) {
      const handleEnterKey = (e: KeyboardEvent) => {
        const activeElement = document.activeElement;
        const isInputFocused =
          activeElement?.tagName === "INPUT" ||
          activeElement?.tagName === "TEXTAREA";
        if (
          e.key === "Enter" &&
          !isInputFocused &&
          !e.shiftKey &&
          !e.ctrlKey &&
          !e.altKey
        ) {
          e.preventDefault();
          e.stopPropagation();
          imprimirButtonRef.current?.click();
        }
      };
      window.addEventListener("keydown", handleEnterKey);
      return () => {
        window.removeEventListener("keydown", handleEnterKey);
      };
    }
  }, [isInfoModalOpen, selectedSale]);
  useEffect(() => {
    console.log("Total de ventas:", sales.length);
    console.log("Ventas a crédito:", sales.filter((s) => s.credit).length);
    console.log(
      "Ventas con crédito en cuotas:",
      sales.filter((s) => s.creditType === "credito_cuotas").length
    );
    console.log(
      "Ventas con cuenta corriente:",
      sales.filter((s) => s.creditType === "cuenta_corriente").length
    );
  }, [sales]);
  useEffect(() => {
    const hasCreditMethod = newSale.paymentMethods.some(
      (method) => method.method === "CREDITO_CUOTAS"
    );
    if (!hasCreditMethod && !isCredit) {
      setSelectedCustomer(null);
      setCustomerName("");
      setCustomerPhone("");
    }
  }, [newSale.paymentMethods, isCredit]);
  useEffect(() => {
    if (isOpenModal && !isProcessingPayment) {
      const handleEnterKey = (e: KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.altKey) {
          e.preventDefault();
          e.stopPropagation();
          if (newSale.products.length === 0) {
            showNotification("Debe agregar al menos un producto", "error");
            return;
          }
          const hasCreditMethod = newSale.paymentMethods.some(
            (method) => method.method === "CREDITO_CUOTAS"
          );
          if (hasCreditMethod || isCredit) {
            if (hasCreditMethod) {
              setIsCreditInstallmentModalOpen(true);
            } else {
              handleConfirmPayment();
            }
          } else {
            cobrarButtonRef.current?.click();
          }
        }
      };
      window.addEventListener("keydown", handleEnterKey);
      return () => {
        window.removeEventListener("keydown", handleEnterKey);
      };
    }
  }, [
    isOpenModal,
    isProcessingPayment,
    newSale.products.length,
    newSale.paymentMethods,
    isCredit,
    showNotification,
  ]);
  const indexOfLastSale = currentPage * itemsPerPage;
  const indexOfFirstSale = indexOfLastSale - itemsPerPage;
  const currentSales = filteredSales.slice(indexOfFirstSale, indexOfLastSale);
  return (
    <ProtectedRoute>
      <Box
        sx={{
          p: 4,
          height: "calc(100vh - 64px)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Typography variant="h5" fontWeight="semibold" mb={2}>
          Ventas
        </Typography>
        {}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mb: 2,
            width: "100%",
          }}
        >
          <Box
            sx={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Box sx={{ display: "flex", gap: 2, maxWidth: "20rem" }}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <Select
                  label="Mes"
                  value={selectedMonth}
                  options={monthOptions}
                  onChange={(value) => setSelectedMonth(value as number)}
                  size="small"
                />
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <Select
                  label="Año"
                  value={selectedYear}
                  options={yearOptions}
                  onChange={(value) => handleYearChange(value)}
                  size="small"
                />
              </FormControl>
            </Box>
          </Box>
          <Box
            sx={{
              width: "100%",
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              mt: 1,
              gap: 2,
              visibility: rubro === "Todos los rubros" ? "hidden" : "visible",
            }}
          >
            <Button
              variant="contained"
              onClick={handleAddSale}
              sx={{
                bgcolor: "primary.main",
                "&:hover": { bgcolor: "primary.dark" },
              }}
              startIcon={<Add fontSize="small" />}
            >
              Nueva Venta [F1]
            </Button>
          </Box>
        </Box>
        {}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ flex: 1, minHeight: "auto" }}>
            <TableContainer
              component={Paper}
              sx={{ maxHeight: "60vh", flex: 1 }}
            >
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                    >
                      Productos
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                      align="center"
                    >
                      Concepto
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                      align="center"
                    >
                      Fecha
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                      align="center"
                    >
                      Forma de Pago
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                      align="center"
                    >
                      Total
                    </TableCell>
                    {rubro !== "Todos los rubros" && (
                      <TableCell
                        sx={{
                          bgcolor: "primary.main",
                          color: "primary.contrastText",
                        }}
                        align="center"
                      >
                        Lista de precio
                      </TableCell>
                    )}
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                      align="center"
                    >
                      Acciones
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {currentSales.length > 0 ? (
                    currentSales.map((sale) => {
                      const products = sale.products || [];
                      const paymentMethods = sale.paymentMethods || [];
                      const saleDate = sale.date
                        ? parseISO(sale.date)
                        : new Date();
                      return (
                        <TableRow
                          key={sale.id || Date.now()}
                          sx={{
                            border: "1px solid",
                            borderColor: "divider",
                            "&:hover": { backgroundColor: "action.hover" },
                            transition: "all 0.3s",
                          }}
                        >
                          <TableCell>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: "semibold",
                                  textTransform: "capitalize",
                                  maxWidth: "180px",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                                title={products
                                  .map((p) => getDisplayProductName(p, rubro))
                                  .join(", ")}
                              >
                                {products
                                  .map((p) => getDisplayProductName(p, rubro))
                                  .join(", ").length > 60
                                  ? products
                                      .map((p) =>
                                        getDisplayProductName(p, rubro)
                                      )
                                      .join(", ")
                                      .slice(0, 30) + "..."
                                  : products
                                      .map((p) =>
                                        getDisplayProductName(p, rubro)
                                      )
                                      .join(" | ")}
                              </Typography>
                              {sale.edited && (
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                  }}
                                >
                                  <Edit
                                    fontSize="small"
                                    sx={{
                                      color: "primary.main",
                                      fontSize: "0.75rem",
                                    }}
                                  />
                                  <Typography
                                    variant="caption"
                                    color="primary.main"
                                  >
                                    Editada
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            {sale.concept ? (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                  maxWidth: "150px",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                                title={sale.concept}
                              >
                                {sale.concept.length > 50
                                  ? `${sale.concept.substring(0, 50)}...`
                                  : sale.concept}
                              </Typography>
                            ) : (
                              <Typography
                                variant="body2"
                                color="text.disabled"
                                fontStyle="italic"
                              >
                                -
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2">
                              {format(saleDate, "dd/MM/yyyy", { locale: es })}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            {sale.credit ? (
                              <Box>
                                {sale.creditType === "credito_cuotas" ? (
                                  <CustomChip
                                    label="Crédito en cuotas"
                                    color="primary"
                                    size="small"
                                  />
                                ) : sale.chequeInfo ? (
                                  <CustomChip
                                    label="Cheque"
                                    color="warning"
                                    size="small"
                                  />
                                ) : (
                                  <CustomChip
                                    label="Cuenta corriente"
                                    color="warning"
                                    size="small"
                                  />
                                )}
                              </Box>
                            ) : (
                              <Box>
                                {sale.deposit !== undefined &&
                                sale.deposit > 0 ? (
                                  <Box
                                    sx={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      mb: 0.5,
                                    }}
                                  >
                                    <Typography variant="body2">
                                      SEÑA:
                                    </Typography>
                                    <Typography
                                      variant="body2"
                                      fontWeight="bold"
                                    >
                                      {formatCurrency(sale.deposit)}
                                    </Typography>
                                  </Box>
                                ) : null}
                                {paymentMethods.map((payment, i) => (
                                  <Box
                                    key={i}
                                    sx={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                    }}
                                  >
                                    <Typography variant="body2">
                                      {payment?.method ||
                                        "Método no especificado"}
                                      :
                                    </Typography>
                                    <Typography
                                      variant="body2"
                                      fontWeight="bold"
                                    >
                                      {formatCurrency(payment?.amount || 0)}
                                    </Typography>
                                  </Box>
                                ))}
                              </Box>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <Typography
                              variant="body2"
                              fontWeight="bold"
                              color={
                                sale.credit ? "warning.main" : "text.primary"
                              }
                            >
                              {formatCurrency(
                                sale.creditType === "credito_cuotas" &&
                                  sale.creditDetails?.totalAmount
                                  ? sale.creditDetails.totalAmount
                                  : sale.total
                              )}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2" color="text.secondary">
                              {getPriceListName(sale.priceListId)}
                            </Typography>
                          </TableCell>
                          {rubro !== "Todos los rubros" && (
                            <TableCell align="center">
                              <Box
                                sx={{
                                  display: "flex",
                                  justifyContent: "center",
                                  gap: 0.5,
                                }}
                              >
                                <CustomGlobalTooltip title="Ver ticket">
                                  <IconButton
                                    onClick={() => handleOpenInfoModal(sale)}
                                    size="small"
                                    sx={{
                                      borderRadius: "4px",
                                      color: "text.secondary",
                                      "&:hover": {
                                        backgroundColor: "primary.main",
                                        color: "white",
                                      },
                                    }}
                                  >
                                    <Print fontSize="small" />
                                  </IconButton>
                                </CustomGlobalTooltip>
                                {canEditSale(sale) && (
                                  <CustomGlobalTooltip title="Editar venta">
                                    <IconButton
                                      onClick={() => handleStartEditSale(sale)}
                                      size="small"
                                      sx={{
                                        borderRadius: "4px",
                                        color: "text.secondary",
                                        "&:hover": {
                                          backgroundColor: "primary.main",
                                          color: "white",
                                        },
                                      }}
                                    >
                                      <Edit fontSize="small" />
                                    </IconButton>
                                  </CustomGlobalTooltip>
                                )}
                              </Box>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={rubro !== "Todos los rubros" ? 7 : 6}
                        align="center"
                      >
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            color: "text.secondary",
                            py: 4,
                          }}
                        >
                          <ShoppingCart
                            sx={{ fontSize: 64, color: "grey.400", mb: 2 }}
                          />
                          <Typography>Todavía no hay ventas.</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
          {filteredSales.length > 0 && (
            <Pagination
              text="Ventas por página"
              text2="Total de ventas"
              totalItems={filteredSales.length}
            />
          )}
        </Box>
        {}
        <Modal
          isOpen={isDeleteProductModalOpen}
          onClose={() => {
            setIsDeleteProductModalOpen(false);
            setProductToDelete(null);
          }}
          title="Confirmar Eliminación"
          buttons={
            <>
              <Button
                variant="text"
                onClick={() => {
                  setIsDeleteProductModalOpen(false);
                  setProductToDelete(null);
                }}
                sx={{
                  color: "text.secondary",
                  borderColor: "divider",
                  "&:hover": {
                    backgroundColor: "action.hover",
                    borderColor: "text.secondary",
                  },
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="contained"
                onClick={handleConfirmProductDelete}
                isPrimaryAction={true}
                sx={{
                  backgroundColor: "error.main",
                  "&:hover": {
                    backgroundColor: "error.dark",
                  },
                }}
              >
                Sí, Eliminar
              </Button>
            </>
          }
          bgColor="bg-white dark:bg-gray_b"
        >
          <Box sx={{ textAlign: "center", py: 2 }}>
            <Delete
              sx={{ fontSize: 48, color: "error.main", mb: 2, mx: "auto" }}
            />
            <Typography variant="h6" fontWeight="semibold" sx={{ mb: 1 }}>
              ¿Está seguro/a que desea eliminar el producto de la venta?
            </Typography>
            <Typography variant="body2" fontWeight="semibold" sx={{ mb: 1 }}>
              <strong>{productToDelete?.name}</strong> será eliminado de la
              venta.
            </Typography>
          </Box>
        </Modal>
        <Modal
          isOpen={isInfoModalOpen}
          onClose={handleCloseInfoModal}
          title="Ticket de la venta"
          bgColor="bg-white dark:bg-gray_b"
          buttons={
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
              <Button
                variant="text"
                onClick={handleCloseInfoModal}
                sx={{
                  color: "text.secondary",
                  borderColor: "text.secondary",
                  "&:hover": {
                    backgroundColor: "action.hover",
                    borderColor: "text.primary",
                  },
                }}
              >
                Cerrar
              </Button>
              <Button
                ref={imprimirButtonRef}
                onClick={handlePrintTicket}
                variant="contained"
                startIcon={<Print fontSize="small" />}
                disabled={!selectedSale || selectedSale?.credit}
                sx={{
                  bgcolor: "primary.main",
                  "&:hover": { bgcolor: "primary.dark" },
                }}
              >
                Imprimir Ticket
              </Button>
            </Box>
          }
        >
          {selectedSale ? (
            <>
              {}
              <Box
                sx={{
                  textAlign: "center",
                  mb: 3,
                  p: 2,
                  backgroundColor: "info.light",
                  borderRadius: 1,
                  border: 1,
                  borderColor: "info.main",
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    mb: 1,
                    fontWeight: "medium",
                    color: "white",
                  }}
                >
                  Cambia los datos de tu ticket haciendo click Aquí
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => {
                    handleCloseInfoModal();
                    handleOpenBusinessDataModal(selectedSale);
                  }}
                  startIcon={<Settings sx={{ fontSize: 16 }} />}
                  sx={{
                    bgcolor: "primary.main",
                    "&:hover": { bgcolor: "primary.dark" },
                  }}
                >
                  Modificar datos del negocio
                </Button>
              </Box>
              <Box sx={{ width: "100%", minWidth: "180mm", overflow: "auto" }}>
                <PrintableTicket
                  ref={ticketRef}
                  sale={selectedSale}
                  rubro={rubro}
                  businessData={businessData}
                />
              </Box>
            </>
          ) : (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography variant="body1" color="error">
                No se pudo cargar la información de la venta
              </Typography>
            </Box>
          )}
        </Modal>
        {}
        <Modal
          isOpen={isOpenModal}
          onClose={handleCloseModal}
          title={isEditMode.isEditing ? "Editar Venta" : "Nueva Venta"}
          bgColor="bg-white dark:bg-gray_b"
          fixedTotal={
            <Box
              sx={{
                ...getCardStyle("primary"),
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                textAlign: "center",
                p: 2,
                width: "100%",
              }}
            >
              <Typography variant="h4" fontWeight="bold">
                TOTAL: {formatCurrency(newSale.total)}
              </Typography>
            </Box>
          }
          buttons={
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
              {}
              {!isEditMode.isEditing && (
                <Button
                  variant="text"
                  onClick={handleCloseModal}
                  sx={{
                    color: "text.secondary",
                    borderColor: "text.secondary",
                    "&:hover": {
                      backgroundColor: "action.hover",
                      borderColor: "text.primary",
                    },
                  }}
                >
                  Cancelar
                </Button>
              )}
              {}
              {isEditMode.isEditing && (
                <Button
                  variant="text"
                  onClick={handleCancelEdit}
                  sx={{
                    color: "text.secondary",
                    borderColor: "text.secondary",
                    "&:hover": {
                      backgroundColor: "action.hover",
                      borderColor: "text.primary",
                    },
                  }}
                >
                  Cancelar Edición
                </Button>
              )}
              <Button
                ref={cobrarButtonRef}
                variant="contained"
                onClick={
                  isEditMode.isEditing ? handleSaveEdit : handleOpenPaymentModal
                }
                disabled={isProcessingPayment || newSale.products.length === 0}
                sx={{
                  bgcolor: "primary.main",
                  "&:hover": {
                    bgcolor: "primary.dark",
                  },
                  "&:disabled": {
                    bgcolor: "action.disabled",
                    color: "text.disabled",
                  },
                }}
              >
                {isProcessingPayment ? (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <CircularProgress size={20} color="inherit" />
                    Procesando...
                  </Box>
                ) : isEditMode.isEditing ? (
                  "Guardar Cambios"
                ) : (
                  "Cobrar"
                )}
              </Button>
            </Box>
          }
        >
          {}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pb: 2 }}>
            {}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Button
                variant="contained"
                startIcon={<LocalOffer fontSize="small" />}
                onClick={() => setIsPromotionModalOpen(true)}
                disabled={newSale.products.length === 0}
                sx={{
                  bgcolor: "primary.main",
                  "&:hover": { bgcolor: "primary.dark" },
                }}
              >
                Seleccionar Promociones
              </Button>
              <Box sx={{ flex: 1 }}>
                <SelectedPromotionsBadge />
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box sx={{ width: "100%" }}>
                <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
                  Escanear código de barras
                </Typography>
                <BarcodeScanner
                  value={newSale.barcode || ""}
                  onChange={(value) =>
                    setNewSale({ ...newSale, barcode: value })
                  }
                  onScanComplete={(code) => {
                    const productToAdd = products.find(
                      (p) => p.barcode === code
                    );
                    if (productToAdd) {
                      handleProductScan(productToAdd.id);
                    } else {
                      showNotification("Producto no encontrado", "error");
                    }
                  }}
                />
              </Box>
              <Box sx={{ width: "100%" }}>
                <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
                  Productos*
                </Typography>
                <ProductSearchAutocomplete
                  products={products}
                  selectedProducts={newSale.products.map((p) => {
                    const product = products.find((prod) => prod.id === p.id);
                    return {
                      value: p.id,
                      label: getDisplayProductName(p, rubro, true),
                      product: product!,
                      isDisabled: false,
                    } as ProductOption;
                  })}
                  onProductSelect={async (selectedOptions: ProductOption[]) => {
                    const existingProductsMap = new Map(
                      newSale.products.map((p) => [p.id, p])
                    );
                    const updatedProducts = await Promise.all(
                      selectedOptions
                        .filter((option) => !option.isDisabled)
                        .map(async (option) => {
                          const existingProduct = existingProductsMap.get(
                            option.product.id
                          );
                          if (existingProduct) {
                            return {
                              ...existingProduct,
                            };
                          }
                          const price =
                            option.product.price ||
                            option.product.currentPrice ||
                            option.product.basePrice ||
                            0;
                          return {
                            ...option.product,
                            price,
                            quantity: 1,
                            discount: 0,
                            surcharge: 0,
                            unit: option.product.unit || "Unid.",
                          };
                        })
                    );
                    setNewSale((prev) => {
                      const newTotal = calculateFinalTotal(
                        updatedProducts,
                        prev.manualAmount || 0,
                        selectedPromotions
                      );
                      return {
                        ...prev,
                        products: updatedProducts,
                        total: newTotal,
                        paymentMethods: synchronizePaymentMethods(
                          prev.paymentMethods,
                          newTotal
                        ),
                      };
                    });
                  }}
                  onSearchChange={(query) => {
                    console.log("Búsqueda de productos:", query);
                  }}
                  rubro={rubro}
                  selectedPriceListId={selectedPriceListId} 
                  placeholder="Seleccionar productos"
                  maxDisplayed={50}
                />
              </Box>
            </Box>
            {}
            <Box sx={{ width: "100%" }}>
              <PriceListSelector
                selectedPriceListId={selectedPriceListId}
                onPriceListChange={(priceListId) => {
                  setSelectedPriceListId(priceListId);
                  if (newSale.products.length > 0 && priceListId !== null) {
                    updateProductPrices(priceListId);
                  }
                }}
                rubro={rubro}
                disabled={isEditMode.isEditing}
              />
            </Box>
            {newSale.products.length > 0 && (
              <TableContainer
                component={Paper}
                sx={{
                  maxHeight: "25vh",
                  bgcolor: "background.paper",
                }}
              >
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={tableHeaderStyle}>Producto</TableCell>
                      <TableCell sx={tableHeaderStyle} align="center">
                        Unidad
                      </TableCell>
                      <TableCell sx={tableHeaderStyle} align="center">
                        Cantidad
                      </TableCell>
                      <TableCell sx={tableHeaderStyle} align="center">
                        % descuento
                      </TableCell>
                      <TableCell sx={tableHeaderStyle} align="center">
                        % recargo
                      </TableCell>
                      <TableCell sx={tableHeaderStyle} align="center">
                        Total
                      </TableCell>
                      <TableCell sx={tableHeaderStyle} align="center">
                        Acciones
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {newSale.products.map((product) => (
                      <TableRow
                        key={product.id}
                        hover
                        sx={{
                          border: "1px solid",
                          borderColor: "divider",
                          "&:hover": { backgroundColor: "action.hover" },
                        }}
                      >
                        <TableCell>
                          <Typography variant="body2">
                            {getDisplayProductName(product, rubro)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {[
                            "Kg",
                            "gr",
                            "L",
                            "ml",
                            "mm",
                            "cm",
                            "m",
                            "pulg",
                            "ton",
                          ].includes(product.unit) ? (
                            <Select
                              label="Unidad"
                              options={getCompatibleUnitOptions(product.unit)}
                              value={product.unit}
                              onChange={(value) =>
                                handleUnitChange(
                                  product.id,
                                  value,
                                  product.quantity
                                )
                              }
                              fullWidth
                              size="small"
                            />
                          ) : (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              align="center"
                            >
                              {product.unit}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            value={product.quantity.toString() || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === "" || !isNaN(Number(value))) {
                                handleQuantityChange(
                                  product.id,
                                  value === "" ? 0 : Number(value),
                                  product.unit
                                );
                              }
                            }}
                            inputProps={{
                              step:
                                product.unit === "Kg" || product.unit === "L"
                                  ? "0.001"
                                  : "1",
                            }}
                            onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                              if (e.target.value === "") {
                                handleQuantityChange(
                                  product.id,
                                  0,
                                  product.unit
                                );
                              }
                            }}
                            size="small"
                            fullWidth
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            value={product.discount?.toString() || "0"}
                            onChange={(e) => {
                              const value = Math.min(
                                100,
                                Math.max(0, Number(e.target.value))
                              );
                              setNewSale((prev) => {
                                const updatedProducts = prev.products.map((p) =>
                                  p.id === product.id
                                    ? { ...p, discount: value }
                                    : p
                                );
                                const newTotal = calculateFinalTotal(
                                  updatedProducts,
                                  prev.manualAmount || 0,
                                  selectedPromotions
                                );
                                return {
                                  ...prev,
                                  products: updatedProducts,
                                  total: newTotal,
                                };
                              });
                            }}
                            inputProps={{ min: 0, max: 100, step: "1" }}
                            size="small"
                            fullWidth
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            value={product.surcharge?.toString() || "0"}
                            onChange={(e) => {
                              const value = Math.min(
                                100,
                                Math.max(0, Number(e.target.value))
                              );
                              setNewSale((prev) => {
                                const updatedProducts = prev.products.map((p) =>
                                  p.id === product.id
                                    ? { ...p, surcharge: value }
                                    : p
                                );
                                const newTotal = calculateFinalTotal(
                                  updatedProducts,
                                  prev.manualAmount || 0,
                                  selectedPromotions
                                );
                                return {
                                  ...prev,
                                  products: updatedProducts,
                                  total: newTotal,
                                };
                              });
                            }}
                            inputProps={{ min: 0, max: 100, step: "1" }}
                            size="small"
                            fullWidth
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" fontWeight="bold">
                            {formatCurrency(
                              calculatePrice(
                                {
                                  ...product,
                                  price: product.price || 0,
                                  quantity: product.quantity || 0,
                                  unit: product.unit || "Unid.",
                                  costPrice: product.costPrice || 0,
                                },
                                product.quantity || 0,
                                product.unit || "Unid."
                              ).finalPrice
                            )}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <CustomGlobalTooltip title="Eliminar producto">
                            <IconButton
                              onClick={() => {
                                handleDeleteProductClick(
                                  product.id,
                                  getDisplayProductName(product, rubro)
                                );
                              }}
                              size="small"
                              sx={{
                                borderRadius: "4px",
                                color: "text.secondary",
                                "&:hover": {
                                  backgroundColor: "error.main",
                                  color: "white",
                                },
                              }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </CustomGlobalTooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              {!isCredit && !isCreditCuotasSelected && (
                <Box sx={{ width: "100%" }}>
                  <Typography
                    variant="body2"
                    fontWeight="medium"
                    sx={{ mb: 1 }}
                  >
                    Cliente
                  </Typography>
                  <Autocomplete
                    options={customerOptions}
                    value={selectedCustomer}
                    onChange={(
                      event: React.SyntheticEvent,
                      newValue: CustomerOption | null
                    ) => {
                      setSelectedCustomer(newValue);
                      if (newValue) {
                        const customer = customers.find(
                          (c) => c.id === newValue.value
                        );
                        if (!isCredit && !isCreditCuotasSelected) {
                          setCustomerName(customer?.name || "");
                          setCustomerPhone(customer?.phone || "");
                        }
                      } else {
                        setCustomerName("");
                        setCustomerPhone("");
                      }
                    }}
                    getOptionLabel={(option) => option.label}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="Ningún cliente seleccionado"
                        variant="outlined"
                        size="small"
                      />
                    )}
                    isOptionEqualToValue={(option, value) =>
                      option.value === value.value
                    }
                  />
                </Box>
              )}
              <Box sx={{ width: "100%" }}>
                {isCredit || isCreditCuotasSelected ? (
                  <Card sx={{ p: 2, bgcolor: "grey.50" }}>
                    <Typography variant="body2" fontWeight="semibold">
                      Monto manual deshabilitado
                    </Typography>
                  </Card>
                ) : (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      marginTop: 3,
                    }}
                  >
                    <Box sx={{ width: "100%" }}>
                      <InputCash
                        label="Monto manual"
                        value={newSale.manualAmount || 0}
                        onChange={handleManualAmountChange}
                        disabled={isCredit || isCreditCuotasSelected}
                      />
                    </Box>
                    <Box sx={{ width: "100%" }}>
                      <Input
                        label="% Ganancia"
                        type="number"
                        value={
                          newSale.manualProfitPercentage === 0 ||
                          newSale.manualProfitPercentage === undefined
                            ? ""
                            : newSale.manualProfitPercentage.toString()
                        }
                        onRawChange={(e) => {
                          const rawValue = e.target.value;
                          if (rawValue === "" || rawValue === "-") {
                            setNewSale((prev) => ({
                              ...prev,
                              manualProfitPercentage: 0,
                              total: calculateFinalTotal(
                                prev.products,
                                prev.manualAmount || 0,
                                selectedPromotions
                              ),
                            }));
                            return;
                          }
                          const numericValue = Number(rawValue);
                          if (isNaN(numericValue)) return;
                          const clampedValue = Math.min(
                            100,
                            Math.max(0, numericValue)
                          );
                          setNewSale((prev) => ({
                            ...prev,
                            manualProfitPercentage: clampedValue,
                            total: calculateFinalTotal(
                              prev.products,
                              prev.manualAmount || 0,
                              selectedPromotions
                            ),
                          }));
                        }}
                        onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                          if (e.target.value === "" || e.target.value === "-") {
                            setNewSale((prev) => ({
                              ...prev,
                              manualProfitPercentage: 0,
                              total: calculateFinalTotal(
                                prev.products,
                                prev.manualAmount || 0,
                                selectedPromotions
                              ),
                            }));
                          }
                        }}
                        inputProps={{
                          min: 0,
                          max: 100,
                          step: "1",
                          inputMode: "decimal",
                        }}
                        disabled={isCredit || isCreditCuotasSelected}
                        placeholder="0"
                      />
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>
            <Box sx={{ width: "100%" }}>
              {isCredit && (
                <Checkbox
                  label="Registrar cheque"
                  checked={registerCheck}
                  onChange={handleRegisterCheckChange}
                />
              )}
              {isCredit && registerCheck ? (
                <Box sx={{ p: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Select
                      label="Método"
                      options={[{ value: "CHEQUE", label: "Cheque" }]}
                      value="CHEQUE"
                      onChange={() => {}}
                      disabled
                      fullWidth
                      size="small"
                    />
                    <InputCash
                      value={newSale.paymentMethods[0]?.amount || 0}
                      onChange={(value) =>
                        handlePaymentMethodChange(0, "amount", value)
                      }
                      placeholder="Monto del cheque"
                    />
                  </Box>
                </Box>
              ) : !isCredit && !isCreditCuotasSelected ? (
                <>
                  {newSale.paymentMethods.map((payment, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        my: 1,
                      }}
                    >
                      <Select
                        label="Método"
                        options={paymentOptions}
                        value={payment.method}
                        onChange={(value) =>
                          handlePaymentMethodChange(index, "method", value)
                        }
                        disabled={
                          isCredit ||
                          newSale.paymentMethods.some(
                            (m) => m.method === "CREDITO_CUOTAS"
                          )
                        }
                        fullWidth
                        size="small"
                      />
                      <Box sx={{ position: "relative", width: "100%" }}>
                        <InputCash
                          value={payment.amount}
                          onChange={(value) =>
                            handlePaymentMethodChange(index, "amount", value)
                          }
                          placeholder="Monto"
                          disabled={isCredit || isCreditCuotasSelected}
                        />
                        {index === newSale.paymentMethods.length - 1 &&
                          newSale.paymentMethods.reduce(
                            (sum, m) => sum + m.amount,
                            0
                          ) >
                            newSale.total + 0.1 && (
                            <Typography
                              variant="caption"
                              color="error"
                              sx={{ ml: 1 }}
                            >
                              Exceso:{" "}
                              {formatCurrency(
                                newSale.paymentMethods.reduce(
                                  (sum, m) => sum + m.amount,
                                  0
                                ) - newSale.total
                              )}
                            </Typography>
                          )}
                      </Box>
                      {newSale.paymentMethods.length > 1 && (
                        <CustomGlobalTooltip title="Eliminar método de pago">
                          <IconButton
                            onClick={() => removePaymentMethod(index)}
                            size="small"
                            sx={{
                              borderRadius: "4px",
                              color: "text.secondary",
                              "&:hover": {
                                backgroundColor: "error.main",
                                color: "white",
                              },
                            }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </CustomGlobalTooltip>
                      )}
                    </Box>
                  ))}
                  {!isCredit &&
                    !isCreditCuotasSelected &&
                    newSale.paymentMethods.length < 3 &&
                    !newSale.paymentMethods.some(
                      (m) => m.method === "CREDITO_CUOTAS"
                    ) && (
                      <Button
                        variant="text"
                        startIcon={<Add fontSize="small" />}
                        onClick={addPaymentMethod}
                        sx={{
                          justifyContent: "flex-start",
                          px: 1,
                          minWidth: "auto",
                        }}
                      >
                        Agregar otro método de pago
                      </Button>
                    )}
                </>
              ) : null}
            </Box>
            {!isEditMode.isEditing && !isCreditCuotasSelected && (
              <Checkbox
                label="Registrar Cuenta corriente"
                checked={isCredit}
                onChange={handleCreditChange}
              />
            )}
            {(isCredit || isCreditCuotasSelected) && (
              <Box>
                <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
                  Cliente existente*
                </Typography>
                <Autocomplete
                  options={customerOptions}
                  value={selectedCustomer}
                  onChange={(
                    event: React.SyntheticEvent,
                    newValue: CustomerOption | null
                  ) => {
                    setSelectedCustomer(newValue);
                    if (newValue) {
                      const customer = customers.find(
                        (c) => c.id === newValue.value
                      );
                      setCustomerName(customer?.name || "");
                      setCustomerPhone(customer?.phone || "");
                    }
                  }}
                  getOptionLabel={(option) => option.label}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Buscar cliente"
                      variant="outlined"
                      size="small"
                      error={
                        isCreditCuotasSelected &&
                        !selectedCustomer &&
                        !customerName
                      }
                    />
                  )}
                  isOptionEqualToValue={(option, value) =>
                    option.value === value.value
                  }
                />
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 2, mt: 2 }}
                >
                  <Input
                    label="Nuevo cliente"
                    placeholder="Nombre del cliente"
                    value={customerName}
                    onRawChange={(e) => {
                      setCustomerName(e.target.value);
                      setSelectedCustomer(null);
                    }}
                    disabled={!!selectedCustomer}
                    error={
                      isCreditCuotasSelected &&
                      !selectedCustomer &&
                      !customerName.trim()
                    }
                    fullWidth
                    size="small"
                  />
                  <Input
                    label="Teléfono del cliente"
                    placeholder="Teléfono del cliente"
                    value={customerPhone}
                    onRawChange={(e) => setCustomerPhone(e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Box>
              </Box>
            )}
          </Box>
          <Box sx={{ width: "100%" }}>
            <Input
              label="Concepto (Opcional)"
              placeholder="Ingrese un concepto para esta venta..."
              value={newSale.concept || ""}
              onRawChange={(e) =>
                setNewSale((prev) => ({
                  ...prev,
                  concept: e.target.value,
                }))
              }
              multiline
              rows={3}
              inputProps={{ maxLength: 50 }}
            />
          </Box>
        </Modal>
        <CreditInstallmentModal
          isOpen={isCreditInstallmentModalOpen}
          onClose={() => {
            setIsCreditInstallmentModalOpen(false);
            setNewSale((prev) => ({
              ...prev,
              paymentMethods: [{ method: "EFECTIVO", amount: prev.total }],
            }));
            setRegisterCheck(false);
            setIsCredit(false);
            setIsCreditCuotasSelected(false);
          }}
          total={newSale.total}
          creditInstallmentDetails={creditInstallmentDetails}
          setCreditInstallmentDetails={setCreditInstallmentDetails}
          selectedCustomer={selectedCustomer}
          setSelectedCustomer={setSelectedCustomer}
          customers={customerOptions}
          customerName={customerName}
          setCustomerName={setCustomerName}
          customerPhone={customerPhone}
          setCustomerPhone={setCustomerPhone}
          onConfirm={handleConfirmCreditInstallment}
          isProcessing={isProcessingPayment}
          isCreditCuotasSelected={isCreditCuotasSelected}
        />
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            if (!isProcessingPayment) {
              setIsPaymentModalOpen(false);
              setTimeout(() => setIsOpenModal(true), 100);
            }
          }}
          total={newSale.total}
          onConfirm={handleConfirmPayment}
          isProcessing={isProcessingPayment}
          isCredit={isCredit}
          registerCheck={registerCheck}
        />
        <PromotionSelectionModal />
        <Notification
          isOpen={isNotificationOpen}
          message={notificationMessage}
          type={notificationType}
          onClose={closeNotification}
        />
        {}
        <BusinessDataModal
          isOpen={isBusinessDataModalOpen}
          onClose={handleCloseBusinessDataModal}
          title="Datos del negocio para tickets"
          onSaveSuccess={handleSaveBusinessDataSuccess}
          showNotificationOnSave={true}
        />
      </Box>
    </ProtectedRoute>
  );
};
export default VentasPage;
