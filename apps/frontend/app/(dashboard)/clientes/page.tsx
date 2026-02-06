"use client";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  useTheme,
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  Visibility,
  Email,
  Badge,
  Groups,
  Assignment,
} from "@mui/icons-material";
import { useRubro } from "@/app/context/RubroContext";
import { Budget, Customer, Sale } from "@/app/lib/types/types";
import { useNotification } from "@/app/hooks/useNotification";
import { useCustomersApi } from "@/app/hooks/useCustomersApi";
import { useSalesApi } from "@/app/hooks/useSalesApi";
import { useBudgetsApi } from "@/app/hooks/useBudgetsApi";
import { CustomerFilters } from "@/app/lib/api/customers";
import Modal from "@/app/components/Modal";
import Button from "@/app/components/Button";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import { usePagination } from "@/app/context/PaginationContext";
import SearchBar from "@/app/components/SearchBar";
import Pagination from "@/app/components/Pagination";
import Input from "@/app/components/Input";
import Select from "@/app/components/Select";
import CustomChip from "@/app/components/CustomChip";
import CustomGlobalTooltip from "@/app/components/CustomTooltipGlobal";

const ClientesPage = () => {
  const { rubro } = useRubro();
  const theme = useTheme();
  const { fetchCustomers, addCustomer, updateCustomer, deleteCustomer } =
    useCustomersApi();
  const { sales: allSales, fetchSales } = useSalesApi();
  const { fetchBudgets, updateBudget } = useBudgetsApi();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState<
    Omit<Customer, "id" | "createdAt" | "updatedAt" | "purchaseHistory">
  >({
    name: "",
    phone: "",
    email: "",
    address: "",
    cuitDni: "",
    status: "activo",
    pendingBalance: 0,
  });
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [customerBudgets, setCustomerBudgets] = useState<Budget[]>([]);
  const [customerSales, setCustomerSales] = useState<Sale[]>([]);
  const [isBudgetsModalOpen, setIsBudgetsModalOpen] = useState(false);
  const [isSalesModalOpen, setIsSalesModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(
    null
  );
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const { showNotification } = useNotification();
  const { currentPage, itemsPerPage, setCurrentPage } = usePagination();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const showNotificationRef = useRef(showNotification);

  useEffect(() => {
    showNotificationRef.current = showNotification;
  }, [showNotification]);

  const getTableHeaderStyle = () => ({
    bgcolor: theme.palette.mode === "dark" ? "primary.dark" : "primary.main",
    color: "primary.contrastText",
  });

  const statusOptions = [
    { value: "activo", label: "Activo" },
    { value: "inactivo", label: "Inactivo" },
  ];

  const fetchCustomerBudgets = useCallback(
    async (customer: Customer) => {
      if (!customer) return;
      try {
        const budgets = await fetchBudgets({ customerId: customer.id });
        setCustomerBudgets(budgets);
      } catch (error) {
        console.error("Error al cargar presupuestos:", error);
        showNotificationRef.current("Error al cargar los presupuestos", "error");
      }
    },
    [fetchBudgets]
  );

  const fetchCustomerSales = useCallback(
    async (customer: Customer) => {
      if (!customer) return;
      try {
        const sales = await fetchSales({ customerId: customer.id });
        setCustomerSales(sales);
      } catch (error) {
        console.error("Error al cargar ventas:", error);
        showNotificationRef.current(
          "Error al cargar el historial de compras",
          "error"
        );
      }
    },
    [fetchSales]
  );

  useEffect(() => {
    if (selectedCustomer) {
      const loadCustomerData = async () => {
        await Promise.all([
          fetchCustomerBudgets(selectedCustomer),
          fetchCustomerSales(selectedCustomer),
        ]);
      };
      loadCustomerData();
    } else {
      setCustomerBudgets([]);
      setCustomerSales([]);
    }
  }, [selectedCustomer, fetchCustomerBudgets, fetchCustomerSales]);



  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const filters: CustomerFilters = {};
        if (searchQuery) {
          filters.search = searchQuery;
        }
        if (rubro && rubro !== "Todos los rubros") {
          filters.rubro = rubro;
        }
        const fetchedCustomers = await fetchCustomers(filters);
        const sortedCustomers = [...fetchedCustomers].sort((a, b) =>
          a.name.localeCompare(b.name)
        );
        setCustomers(sortedCustomers);
        setFilteredCustomers(sortedCustomers);
      } catch (error) {
        console.error("Error al cargar clientes:", error);
        showNotification("Error al cargar clientes", "error");
      }
    };
    loadCustomers();
  }, [rubro, searchQuery, fetchCustomers, showNotification]);

  const indexOfLastCustomer = currentPage * itemsPerPage;
  const indexOfFirstCustomer = indexOfLastCustomer - itemsPerPage;
  const currentCustomers = filteredCustomers.slice(
    indexOfFirstCustomer,
    indexOfLastCustomer
  );

  const handleAddCustomer = async () => {
    if (!newCustomer.name.trim()) {
      showNotificationRef.current("El nombre del cliente es requerido", "error");
      return;
    }
    try {
      const existingCustomer = customers.find(
        (c) => c.name.toLowerCase() === newCustomer.name.toLowerCase().trim()
      );
      if (existingCustomer) {
        showNotificationRef.current(
          "Ya existe un cliente con este nombre",
          "error"
        );
        return;
      }
      const customerToAdd = {
        ...newCustomer,
        id: generateCustomerId(newCustomer.name),
        name: newCustomer.name.trim(),
        rubro: rubro === "Todos los rubros" ? undefined : rubro,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const createdCustomer = await addCustomer(customerToAdd);
      setCustomers([...customers, createdCustomer]);
      setFilteredCustomers([...filteredCustomers, createdCustomer]);
      setNewCustomer({
        name: "",
        phone: "",
        email: "",
        address: "",
        cuitDni: "",
        status: "activo",
        pendingBalance: 0,
      });
      setIsModalOpen(false);
      showNotificationRef.current("Cliente agregado correctamente", "success");
    } catch (error) {
      console.error("Error al agregar cliente:", error);
      showNotificationRef.current("Error al agregar cliente", "error");
    }
  };

  const generateCustomerId = (name: string): string => {
    const cleanName = name
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9-]/g, "");
    const timestamp = Date.now().toString().slice(-5);
    return `${cleanName}-${timestamp}`;
  };

  const getCustomerPendingBalance = (customer: Customer): number => {
    return customer.pendingBalance || 0;
  };

  const handleDeleteClick = (customer: Customer) => {
    const pendingBalance = getCustomerPendingBalance(customer);
    if (pendingBalance > 0) {
      showNotificationRef.current(
        `No se puede eliminar el cliente porque tiene un saldo pendiente de $${pendingBalance.toFixed(
          2
        )}`,
        "error"
      );
      return;
    }
    setCustomerToDelete(customer);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = useCallback(async () => {
    if (!customerToDelete) return;
    try {
      const customerSales = allSales.filter(
        (sale) => sale.customerId === customerToDelete.id
      );
      if (customerSales.length > 0) {
        showNotificationRef.current(
          "No se puede eliminar el cliente porque tiene una cuenta corriente pendiente de pago",
          "error"
        );
        return;
      }
      await deleteCustomer(customerToDelete.id);
      setFilteredCustomers((prev) =>
        prev.filter((c) => c.id !== customerToDelete.id)
      );
      setCustomers((prev) => prev.filter((c) => c.id !== customerToDelete.id));
      showNotificationRef.current("Cliente eliminado correctamente", "success");
    } catch (error) {
      console.error("Error al eliminar cliente:", error);
      showNotificationRef.current("Error al eliminar cliente", "error");
    } finally {
      setIsDeleteModalOpen(false);
      setCustomerToDelete(null);
    }
  }, [customerToDelete, allSales, deleteCustomer]);

  const handleEditClick = (customer: Customer) => {
    setEditingCustomer(customer);
    setNewCustomer({
      name: customer.name,
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
      cuitDni: customer.cuitDni || "",
      status: customer.status,
      pendingBalance: customer.pendingBalance,
    });
    setIsModalOpen(true);
  };

  const handleUpdateCustomer = async () => {
    if (!editingCustomer || !newCustomer.name.trim()) {
      showNotificationRef.current("El nombre del cliente es requerido", "error");
      return;
    }
    try {
      const existingCustomer = customers.find(
        (c) =>
          c.id !== editingCustomer.id &&
          c.name.toLowerCase() === newCustomer.name.toLowerCase().trim()
      );
      if (existingCustomer) {
        showNotificationRef.current(
          "Ya existe un cliente con este nombre",
          "error"
        );
        return;
      }
      const updatedCustomer = {
        name: newCustomer.name.trim(),
        phone: newCustomer.phone,
        email: newCustomer.email,
        address: newCustomer.address,
        cuitDni: newCustomer.cuitDni,
        status: newCustomer.status,
        pendingBalance: newCustomer.pendingBalance,
        rubro: rubro === "Todos los rubros" ? undefined : rubro,
      };
      const updated = await updateCustomer(editingCustomer.id, updatedCustomer);
      if (editingBudget) {
        await updateBudget(editingBudget.id, {
          customerName: updated.name,
        });
      }
      setCustomers(
        customers.map((c) => (c.id === editingCustomer.id ? updated : c))
      );
      setFilteredCustomers(
        filteredCustomers.map((c) =>
          c.id === editingCustomer.id ? updated : c
        )
      );
      setNewCustomer({
        name: "",
        phone: "",
        email: "",
        address: "",
        cuitDni: "",
        status: "activo",
        pendingBalance: 0,
      });
      setEditingCustomer(null);
      setEditingBudget(null);
      setIsModalOpen(false);
      showNotificationRef.current(
        "Cliente actualizado correctamente",
        "success"
      );
    } catch (error) {
      console.error("Error al actualizar cliente:", error);
      showNotificationRef.current("Error al actualizar cliente", "error");
    }
  };

  const handleViewPurchaseHistory = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setIsSalesModalOpen(true);
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleViewBudgetItems = useCallback((budget: Budget) => {
    setSelectedBudget(budget);
  }, []);

  const handleCloseBudgetsModal = useCallback(() => {
    setIsBudgetsModalOpen(false);
    setSelectedCustomer(null);
    setSelectedBudget(null);
    setCustomerBudgets([]);
  }, []);

  const handleCloseSalesModal = useCallback(() => {
    setIsSalesModalOpen(false);
    setSelectedCustomer(null);
    setCustomerSales([]);
  }, []);

  const handleOpenBudgetsModal = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setIsBudgetsModalOpen(true);
  }, []);

  const BudgetsModalContent = useMemo(() => {
    if (!selectedCustomer) return null;
    return selectedBudget ? (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
          <Box>
            <Typography variant="subtitle2" fontWeight="bold">
              Fecha:
            </Typography>
            <Typography>
              {new Date(selectedBudget.date).toLocaleDateString("es-AR")}
            </Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" fontWeight="bold">
              Total:
            </Typography>
            <Typography>${selectedBudget.total.toFixed(2)}</Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" fontWeight="bold">
              Seña:
            </Typography>
            <Typography>${selectedBudget.deposit || "0.00"}</Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" fontWeight="bold">
              Saldo:
            </Typography>
            <Typography>${selectedBudget.remaining.toFixed(2)}</Typography>
          </Box>
          <Box sx={{ gridColumn: "span 2" }}>
            <Typography variant="subtitle2" fontWeight="bold">
              Estado:
            </Typography>
            <CustomChip
              label={selectedBudget.status}
              color={
                selectedBudget.status === "aprobado"
                  ? "success"
                  : selectedBudget.status === "rechazado"
                  ? "error"
                  : "warning"
              }
              size="small"
            />
          </Box>
          {selectedBudget.notes && (
            <Box sx={{ gridColumn: "span 2" }}>
              <Typography variant="subtitle2" fontWeight="bold">
                Notas:
              </Typography>
              <Typography>{selectedBudget.notes}</Typography>
            </Box>
          )}
        </Box>
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" fontWeight="medium" mb={2}>
            Items del Presupuesto
          </Typography>
          {selectedBudget.items ? (
            Array.isArray(selectedBudget.items) &&
            selectedBudget.items.length > 0 ? (
              <TableContainer component={Paper} sx={{ maxHeight: "35vh" }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell
                        sx={{ bgcolor: "primary.main", color: "white" }}
                      >
                        Descripción
                      </TableCell>
                      <TableCell
                        sx={{ bgcolor: "primary.main", color: "white" }}
                        align="center"
                      >
                        Cantidad
                      </TableCell>
                      <TableCell
                        sx={{ bgcolor: "primary.main", color: "white" }}
                        align="center"
                      >
                        Precio
                      </TableCell>
                      <TableCell
                        sx={{ bgcolor: "primary.main", color: "white" }}
                        align="center"
                      >
                        Total
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedBudget.items.map((item, index) => (
                      <TableRow key={index} hover>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell align="center">
                          {item.quantity + " " + item.unit}
                        </TableCell>
                        <TableCell align="center">
                          ${item.price.toFixed(2)}
                        </TableCell>
                        <TableCell align="center">
                          ${(item.quantity * item.price).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography color="text.secondary">
                No hay items en este presupuesto
              </Typography>
            )
          ) : (
            <Typography color="text.secondary">
              No se encontraron items
            </Typography>
          )}
        </Box>
      </Box>
    ) : (
      <Box sx={{ maxHeight: "60vh", mb: 2, overflow: "auto" }}>
        {customerBudgets.length > 0 ? (
          <TableContainer component={Paper}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ bgcolor: "primary.main", color: "white" }}>
                    Fecha
                  </TableCell>
                  <TableCell
                    sx={{ bgcolor: "primary.main", color: "white" }}
                    align="center"
                  >
                    Total
                  </TableCell>
                  <TableCell
                    sx={{ bgcolor: "primary.main", color: "white" }}
                    align="center"
                  >
                    Estado
                  </TableCell>
                  <TableCell
                    sx={{ bgcolor: "primary.main", color: "white" }}
                    align="center"
                  >
                    Acciones
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customerBudgets.map((budget) => (
                  <TableRow key={budget.id} hover>
                    <TableCell>
                      {new Date(budget.date).toLocaleDateString("es-AR")}
                    </TableCell>
                    <TableCell align="center">
                      ${budget.total.toFixed(2)}
                    </TableCell>
                    <TableCell align="center">
                      <CustomChip
                        label={budget.status}
                        color={
                          budget.status === "aprobado"
                            ? "success"
                            : budget.status === "rechazado"
                            ? "error"
                            : "warning"
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <CustomGlobalTooltip title="Ver detalles">
                        <IconButton
                          onClick={() => handleViewBudgetItems(budget)}
                          size="small"
                          sx={{
                            borderRadius: "4px",
                            color: "primary.main",
                            "&:hover": {
                              backgroundColor: "primary.main",
                              color: "white",
                            },
                          }}
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                      </CustomGlobalTooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Assignment sx={{ fontSize: 64, color: "grey.400", mb: 2 }} />
            <Typography color="text.secondary">
              No hay presupuestos para este cliente
            </Typography>
          </Box>
        )}
      </Box>
    );
  }, [
    selectedCustomer,
    selectedBudget,
    customerBudgets,
    handleViewBudgetItems,
  ]);

  const SalesModalContent = useMemo(() => {
    if (!selectedCustomer) return null;
    return (
      <Box sx={{ maxHeight: "60vh", mb: 2, overflow: "auto" }}>
        {customerSales.length > 0 ? (
          <TableContainer component={Paper}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ bgcolor: "primary.main", color: "white" }}>
                    Fecha
                  </TableCell>
                  <TableCell sx={{ bgcolor: "primary.main", color: "white" }}>
                    Productos
                  </TableCell>
                  <TableCell
                    sx={{ bgcolor: "primary.main", color: "white" }}
                    align="center"
                  >
                    Total
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customerSales.map((sale) => (
                  <TableRow key={sale.id} hover>
                    <TableCell>
                      {new Date(sale.date).toLocaleDateString("es-AR")}
                    </TableCell>
                    <TableCell>
                      {sale.products.map((product, idx) => (
                        <Box key={idx} sx={{ fontSize: "0.875rem" }}>
                          {product.name} x {product.quantity}
                        </Box>
                      ))}
                    </TableCell>
                    <TableCell align="center">
                      ${sale.total.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Assignment sx={{ fontSize: 48, color: "grey.400", mb: 2 }} />
            <Typography color="text.secondary">
              No hay compras registradas para este cliente
            </Typography>
          </Box>
        )}
      </Box>
    );
  }, [selectedCustomer, customerSales]);

  const DeleteCustomerModalContent = useMemo(
    () => (
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Eliminar Cliente"
        bgColor="bg-white dark:bg-gray_b"
        buttons={
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
            <Button
              variant="text"
              onClick={() => setIsDeleteModalOpen(false)}
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
              color="error"
              onClick={handleConfirmDelete}
              isPrimaryAction={true}
              sx={{
                bgcolor: "error.main",
                "&:hover": { bgcolor: "error.dark" },
              }}
            >
              Sí, Eliminar
            </Button>
          </Box>
        }
      >
        <Box sx={{ textAlign: "center", py: 2 }}>
          <Delete
            sx={{ fontSize: 48, color: "error.main", mb: 2, mx: "auto" }}
          />
          <Typography variant="h6" fontWeight="semibold" sx={{ mb: 1 }}>
            ¿Está seguro/a que desea eliminar al cliente?
          </Typography>
          <Typography variant="body2" fontWeight="semibold" sx={{ mb: 1 }}>
            <strong>{customerToDelete?.name}</strong> será eliminado
            permanentemente.
          </Typography>
        </Box>
      </Modal>
    ),
    [isDeleteModalOpen, customerToDelete, handleConfirmDelete]
  );

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
          Clientes
        </Typography>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
            width: "100%",
          }}
        >
          <Box
            sx={{
              width: "100%",
              maxWidth: "400px",
            }}
          >
            <SearchBar onSearch={handleSearch} />
          </Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              width: "100%",
              visibility: rubro === "Todos los rubros" ? "hidden" : "visible",
            }}
          >
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setIsModalOpen(true)}
              sx={{
                bgcolor: "primary.main",
                "&:hover": { bgcolor: "primary.dark" },
              }}
            >
              Nuevo Cliente
            </Button>
          </Box>
        </Box>
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
              sx={{ maxHeight: "60vh", mb: 2, flex: 1 }}
            >
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={getTableHeaderStyle()}>Nombre</TableCell>
                    <TableCell sx={getTableHeaderStyle()}>Contacto</TableCell>
                    <TableCell sx={getTableHeaderStyle()} align="center">
                      Estado
                    </TableCell>
                    <TableCell sx={getTableHeaderStyle()} align="center">
                      Fecha de Registro
                    </TableCell>
                    <TableCell sx={getTableHeaderStyle()} align="center">
                      Acciones
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {currentCustomers.length > 0 ? (
                    currentCustomers.map((customer) => (
                      <TableRow key={customer.id} hover>
                        <TableCell>
                          <Typography fontWeight="medium">
                            {customer.name}
                          </Typography>
                          {getCustomerPendingBalance(customer) > 0 && (
                            <Typography
                              variant="caption"
                              color="error"
                              fontWeight="bold"
                            >
                              Saldo: $
                              {getCustomerPendingBalance(customer).toFixed(2)}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <Badge sx={{ mr: 1, fontSize: "0.875rem" }} />
                            {customer.phone || "Sin teléfono"}
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              mt: 0.5,
                            }}
                          >
                            <Email sx={{ mr: 1, fontSize: "0.875rem" }} />
                            {customer.email || "Sin email"}
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <CustomChip
                            label={customer.status}
                            color={
                              customer.status === "activo"
                                ? "success"
                                : "default"
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          {customer.createdAt
                            ? new Date(customer.createdAt).toLocaleDateString(
                                "es-AR"
                              )
                            : "N/A"}
                        </TableCell>
                        <TableCell align="center">
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "center",
                              gap: 1,
                            }}
                          >
                            <CustomGlobalTooltip title="Historial de compras">
                              <IconButton
                                onClick={() =>
                                  handleViewPurchaseHistory(customer)
                                }
                                size="small"
                                sx={{
                                  borderRadius: "4px",
                                  color: "primary.main",
                                  "&:hover": {
                                    backgroundColor: "primary.main",
                                    color: "white",
                                  },
                                }}
                              >
                                <Assignment fontSize="small" />
                              </IconButton>
                            </CustomGlobalTooltip>
                            <CustomGlobalTooltip title="Ver presupuestos">
                              <IconButton
                                onClick={() => handleOpenBudgetsModal(customer)}
                                size="small"
                                sx={{
                                  borderRadius: "4px",
                                  color: "warning.main",
                                  "&:hover": {
                                    backgroundColor: "warning.main",
                                    color: "white",
                                  },
                                }}
                              >
                                <Visibility fontSize="small" />
                              </IconButton>
                            </CustomGlobalTooltip>
                            <CustomGlobalTooltip title="Editar">
                              <IconButton
                                onClick={() => handleEditClick(customer)}
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
                            <CustomGlobalTooltip title="Eliminar">
                              <IconButton
                                onClick={() => handleDeleteClick(customer)}
                                size="small"
                                sx={{
                                  borderRadius: "4px",
                                  color: "error.main",
                                  "&:hover": {
                                    backgroundColor: "error.main",
                                    color: "white",
                                  },
                                }}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </CustomGlobalTooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                        <Groups
                          sx={{ fontSize: 64, color: "grey.400", mb: 2 }}
                        />
                        <Typography color="text.secondary">
                          No hay clientes registrados
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
          <Pagination
            text="Clientes por página"
            text2="Total de clientes"
            totalItems={filteredCustomers.length}
          />
        </Box>

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingCustomer ? "Editar Cliente" : "Nuevo Cliente"}
          bgColor="bg-white dark:bg-gray_b"
          buttons={
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
              <Button
                variant="text"
                onClick={() => setIsModalOpen(false)}
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
                onClick={
                  editingCustomer ? handleUpdateCustomer : handleAddCustomer
                }
                sx={{
                  bgcolor: "primary.main",
                  "&:hover": { bgcolor: "primary.dark" },
                }}
              >
                {editingCustomer ? "Actualizar" : "Guardar"}
              </Button>
            </Box>
          }
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Input
              label="Nombre y Apellido"
              value={newCustomer.name}
              onChange={(v) => setNewCustomer({ ...newCustomer, name: String(v) })}
              required
            />
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <Input
                label="Teléfono"
                value={newCustomer.phone || ""}
                onChange={(v) => setNewCustomer({ ...newCustomer, phone: String(v) })}
              />
              <Input
                label="CUIT / DNI"
                value={newCustomer.cuitDni || ""}
                onChange={(v) => setNewCustomer({ ...newCustomer, cuitDni: String(v) })}
              />
            </Box>
            <Input
              label="Email"
              value={newCustomer.email || ""}
              onChange={(v) => setNewCustomer({ ...newCustomer, email: String(v) })}
            />
            <Input
              label="Dirección"
              value={newCustomer.address || ""}
              onChange={(v) => setNewCustomer({ ...newCustomer, address: String(v) })}
            />
            <Select
              label="Estado"
              value={newCustomer.status}
              options={statusOptions}
              onChange={(v) =>
                setNewCustomer({
                  ...newCustomer,
                  status: v as "activo" | "inactivo",
                })
              }
            />
          </Box>
        </Modal>

        <Modal
          isOpen={isBudgetsModalOpen}
          onClose={handleCloseBudgetsModal}
          title={`Presupuestos - ${selectedCustomer?.name || ""}`}
          bgColor="bg-white dark:bg-gray_b"
          maxWidth="md"
          buttons={
            <Button variant="contained" onClick={handleCloseBudgetsModal}>
              Cerrar
            </Button>
          }
        >
          {BudgetsModalContent}
        </Modal>

        <Modal
          isOpen={isSalesModalOpen}
          onClose={handleCloseSalesModal}
          title={`Historial de Compras - ${selectedCustomer?.name || ""}`}
          bgColor="bg-white dark:bg-gray_b"
          maxWidth="md"
          buttons={
            <Button variant="contained" onClick={handleCloseSalesModal}>
              Cerrar
            </Button>
          }
        >
          {SalesModalContent}
        </Modal>

        {DeleteCustomerModalContent}
      </Box>
    </ProtectedRoute>
  );
};

export default ClientesPage;
