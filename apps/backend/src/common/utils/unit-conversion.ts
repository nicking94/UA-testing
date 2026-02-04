export const CONVERSION_FACTORS = {
  Gr: { base: 'Kg', factor: 0.001 },
  Kg: { base: 'Kg', factor: 1 },
  Ton: { base: 'Kg', factor: 1000 },
  Ml: { base: 'L', factor: 0.001 },
  L: { base: 'L', factor: 1 },
  Mm: { base: 'M', factor: 0.001 },
  Cm: { base: 'M', factor: 0.01 },
  Pulg: { base: 'M', factor: 0.0254 },
  M: { base: 'M', factor: 1 },
  'Unid.': { base: 'Unid.', factor: 1 },
  Unid: { base: 'Unid.', factor: 1 }, // Added for database compatibility
  Docena: { base: 'Unid.', factor: 12 },
  Ciento: { base: 'Unid.', factor: 100 },
  Bulto: { base: 'Bulto', factor: 1 },
  Caja: { base: 'Caja', factor: 1 },
  Cajón: { base: 'Cajón', factor: 1 },
  Cajon: { base: 'Cajón', factor: 1 }, // Added for database compatibility
  'M²': { base: 'M²', factor: 1 },
  M2: { base: 'M²', factor: 1 }, // Added for database compatibility
  'M³': { base: 'M³', factor: 1 },
  M3: { base: 'M³', factor: 1 }, // Added for database compatibility
  V: { base: 'V', factor: 1 },
  A: { base: 'A', factor: 1 },
  W: { base: 'W', factor: 1 },
  General: { base: 'General', factor: 1 },
} as const;

export const convertToBaseUnit = (quantity: number, fromUnit: string): number => {
  const unitInfo = CONVERSION_FACTORS[fromUnit as keyof typeof CONVERSION_FACTORS];
  return unitInfo ? quantity * unitInfo.factor : quantity;
};

export const convertFromBaseUnit = (quantity: number, toUnit: string): number => {
  const unitInfo = CONVERSION_FACTORS[toUnit as keyof typeof CONVERSION_FACTORS];
  return unitInfo ? quantity / unitInfo.factor : quantity;
};

export const convertUnit = (
  quantity: number,
  fromUnit: string,
  toUnit: string,
): number => {
  if (fromUnit === toUnit) return quantity;
  const fromInfo = CONVERSION_FACTORS[fromUnit as keyof typeof CONVERSION_FACTORS];
  const toInfo = CONVERSION_FACTORS[toUnit as keyof typeof CONVERSION_FACTORS];
  if (!fromInfo || !toInfo) return quantity;
  if (fromInfo.base !== toInfo.base) return quantity;
  const inBase = quantity * fromInfo.factor;
  return inBase / toInfo.factor;
};
