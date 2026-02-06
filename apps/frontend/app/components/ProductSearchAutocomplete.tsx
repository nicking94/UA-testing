// app/components/ProductSearchAutocomplete.tsx
"use client";
import {
  Autocomplete,
  TextField,
  Box,
  Typography,
  Checkbox,
  Popper,
  IconButton,
  CircularProgress,
} from "@mui/material";
import { CheckBoxOutlineBlank, CheckBox, Close } from "@mui/icons-material";
import {
  useMemo,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { Product, ProductOption, Rubro } from "@/app/lib/types/types";
import { formatCurrency } from "@/app/lib/utils/currency";
import getDisplayProductName from "@/app/lib/utils/DisplayProductName";
import { productPricesApi } from "@/app/lib/api/product-prices";

interface ProductSearchAutocompleteProps {
  fetchProducts: (query: string) => Promise<Product[]>;
  selectedProducts: ProductOption[];
  onProductSelect: (selectedOptions: ProductOption[]) => void;
  onSearchChange?: (query: string) => void;
  rubro: Rubro;
  selectedPriceListId?: number | null; 
  disabled?: boolean;
  placeholder?: string;
  maxDisplayed?: number;
}

const ProductSearchAutocomplete = ({
  fetchProducts,
  selectedProducts,
  onProductSelect,
  onSearchChange,
  rubro,
  selectedPriceListId = null, 
  disabled = false,
  placeholder = "Seleccionar productos",
  maxDisplayed = 50,
}: ProductSearchAutocompleteProps) => {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const icon = useMemo(() => <CheckBoxOutlineBlank fontSize="small" />, []);
  const checkedIcon = useMemo(() => <CheckBox fontSize="small" />, []);

  const loadOptions = useCallback(
    async (query: string) => {
      setLoading(true);
      try {
        let products = await fetchProducts(query);

        // Filter by rubro client-side as safety, though API should handle it
        if (rubro !== "Todos los rubros") {
          products = products.filter((p) => p.rubro === rubro);
        }

        if (selectedPriceListId && products.length > 0) {
          try {
            const prices = await productPricesApi.getAll({
              priceListId: selectedPriceListId,
              isActive: true,
            });

            const priceMap = new Map(prices.map((pp) => [pp.productId, pp.price]));

            products = products.map((product) => {
              const listPrice = priceMap.get(product.id);
              const currentPrice =
                listPrice !== undefined ? listPrice : product.price;

              return {
                ...product,
                price: currentPrice,
                currentPrice: currentPrice,
              };
            });
          } catch (error) {
            console.error("Error fetching product prices:", error);
            // Fallback to base prices
            products = products.map((p) => ({ ...p, currentPrice: p.price }));
          }
        } else {
             products = products.map((p) => ({ ...p, currentPrice: p.price }));
        }

        const newOptions = products.slice(0, maxDisplayed).map((p) => {
          const stock = Number(p.stock);
          const isValidStock = !isNaN(stock);
          const displayName = getDisplayProductName(p, rubro, true);

          return {
            value: p.id,
            label:
              isValidStock && stock > 0
                ? displayName
                : `${displayName} (agotado)`,
            product: p,
            isDisabled: !isValidStock || stock <= 0,
          } as ProductOption;
        });

        setOptions(newOptions);
      } catch (error) {
        console.error("Error loading options:", error);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    },
    [fetchProducts, rubro, selectedPriceListId, maxDisplayed]
  );

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
        loadOptions(inputValue);
        if (onSearchChange) onSearchChange(inputValue);
    }, 400);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [inputValue, loadOptions, onSearchChange]);

  const handleRemoveProduct = useCallback(
    (productToRemove: ProductOption) => {
      const updatedProducts = selectedProducts.filter(
        (product) => product.value !== productToRemove.value
      );
      onProductSelect(updatedProducts);
    },
    [selectedProducts, onProductSelect]
  );

  const getOptionDisabled = (option: ProductOption): boolean => {
    return option.isDisabled || false;
  };

  return (
    <Autocomplete
      multiple
      open={open}
      onOpen={() => {
        setOpen(true);
        if (options.length === 0) loadOptions("");
      }}
      onClose={() => setOpen(false)}
      options={options}
      getOptionLabel={(option) => option.label}
      getOptionDisabled={getOptionDisabled}
      value={selectedProducts}
      onChange={(event, newValue) => {
        onProductSelect(newValue);
      }}
      inputValue={inputValue}
      onInputChange={(event, newInputValue) => {
        setInputValue(newInputValue);
      }}
      disabled={disabled}
      filterOptions={(x) => x} // Disable client-side filtering
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder={placeholder}
          variant="outlined"
          size="small"
          fullWidth
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      renderTags={(value, getTagProps) =>
        value.map((option, index) => {
          const { key, ...tagProps } = getTagProps({ index });
          return (
            <Box
              component="span"
              key={key}
              {...tagProps}
              sx={{
                backgroundColor: option.isDisabled
                  ? "error.light"
                  : "primary.light",
                color: option.isDisabled
                  ? "error.contrastText"
                  : "primary.contrastText",
                borderRadius: 1,
                padding: "2px 8px 2px 12px",
                margin: "2px",
                fontSize: "0.875rem",
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
                position: "relative",
                "&:hover": {
                  backgroundColor: option.isDisabled
                    ? "error.main"
                    : "primary.main",
                },
              }}
            >
              <Box sx={{ flex: 1, mr: 1 }}>{option.label}</Box>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveProduct(option);
                }}
                sx={{
                  padding: 0,
                  width: 18,
                  height: 18,
                  minWidth: 18,
                  minHeight: 18,
                  color: "inherit",
                  "&:hover": {
                    backgroundColor: "rgba(255, 255, 255, 0.2)",
                  },
                }}
              >
                <Close sx={{ fontSize: 14 }} />
              </IconButton>
            </Box>
          );
        })
      }
      isOptionEqualToValue={(option, value) => option.value === value.value}
      disableCloseOnSelect
      renderOption={({ key, ...props }, option, { selected }) => (
        <li key={key} {...props}>
          <Checkbox
            icon={icon}
            checkedIcon={checkedIcon}
            style={{ marginRight: 8 }}
            checked={selected}
            disabled={option.isDisabled}
          />
          <Box sx={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <Typography
              variant="body2"
              sx={{
                color: option.isDisabled ? "text.disabled" : "text.primary",
              }}
            >
              {option.label}
            </Typography>
            {option.product && (
              <Box sx={{ display: "flex", gap: 2, mt: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  Stock: {option.product.stock} {option.product.unit}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Precio: {formatCurrency(option.product.price)}
                </Typography>
                {selectedPriceListId &&
                  option.product.currentPrice !== option.product.price && (
                    <Typography
                      variant="caption"
                      color="info.main"
                      fontWeight="bold"
                    >
                      (Lista)
                    </Typography>
                  )}
              </Box>
            )}
          </Box>
        </li>
      )}
      noOptionsText={loading ? "Buscando..." : "No se encontraron productos"}
      loading={loading}
      loadingText="Cargando productos..."
      PopperComponent={(props) => (
        <Popper {...props} placement="bottom-start" style={{ zIndex: 1300 }} />
      )}
      limitTags={3}
      disableListWrap
      sx={{
        "& .MuiAutocomplete-inputRoot": {
          padding: "4px 8px",
        },
        "& .MuiAutocomplete-tag": {
          margin: "2px 4px 2px 0",
        },
      }}
    />
  );
};

export default ProductSearchAutocomplete;