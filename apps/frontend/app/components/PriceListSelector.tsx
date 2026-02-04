"use client";
import React, { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import Select from "@/app/components/Select";
import { PriceList, Rubro } from "@/app/lib/types/types";
import { priceListsApi } from "@/app/lib/api/price-lists";

interface PriceListSelectorProps {
  selectedPriceListId: number | null;
  onPriceListChange: (priceListId: number | null) => void;
  rubro: Rubro;
  disabled?: boolean;
}

const PriceListSelector: React.FC<PriceListSelectorProps> = ({
  selectedPriceListId,
  onPriceListChange,
  rubro,
  disabled = false,
}) => {
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPriceLists = async () => {
      if (rubro === "Todos los rubros") {
        setPriceLists([]);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const allLists = await priceListsApi.getAll();
        const lists = allLists.filter(
          (list: PriceList) => list.rubro === rubro && list.isActive !== false
        );

        // Deduplicate lists by name to avoid showing duplicate defaults if they were double-created
        const uniqueLists = Array.from(
          new Map(lists.map((l) => [l.name.toLowerCase().trim(), l])).values()
        );

        if (uniqueLists.length === 0) {
          const defaultPriceList: Omit<
            PriceList,
            "id" | "createdAt" | "updatedAt"
          > = {
            name: "General",
            rubro,
            isDefault: true,
            isActive: true,
          };
          const created = await priceListsApi.create(defaultPriceList);
          setPriceLists([created]);
          onPriceListChange(created.id);
        } else {
          setPriceLists(uniqueLists);

          if (!selectedPriceListId) {
            const defaultList = uniqueLists.find((list) => list.isDefault);
            if (defaultList) {
              onPriceListChange(defaultList.id);
            } else {
              onPriceListChange(uniqueLists[0].id);
            }
          }
        }
      } catch (err) {
        console.error("Error loading price lists:", err);
      } finally {
        setLoading(false);
      }
    };
    loadPriceLists();
  }, [rubro, selectedPriceListId, onPriceListChange]);

  const options = priceLists.map((list) => ({
    value: list.id.toString(),
    label: list.isDefault ? `${list.name} (Por defecto)` : list.name,
    metadata: list,
  }));

  if (loading) {
    return (
      <Box sx={{ width: "100%" }}>
        <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
          Lista de precios
        </Typography>
        <Select
          label="Cargando..."
          options={[]}
          value=""
          onChange={() => {}}
          fullWidth
          size="small"
          disabled={true}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%" }}>
      <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
        Lista de precios
      </Typography>
      <Select
        label="Seleccionar lista"
        options={options}
        value={selectedPriceListId ? selectedPriceListId.toString() : ""}
        onChange={(value) => {
          if (value === "") {
            onPriceListChange(null);
          } else {
            onPriceListChange(Number(value));
          }
        }}
        fullWidth
        size="small"
        disabled={disabled || priceLists.length === 0}
        getOptionId={(option) => option.metadata?.id?.toString()}
      />
      {priceLists.length === 0 && rubro !== "Todos los rubros" && (
        <Typography variant="caption" color="text.secondary">
          No hay listas de precios creadas para este rubro
        </Typography>
      )}
    </Box>
  );
};

export default PriceListSelector;