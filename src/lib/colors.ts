export const cssHslVar = (name: string) => {
  const root = document.documentElement;
  const raw = getComputedStyle(root).getPropertyValue(name).trim();
  // raw is like "262 83% 58%" -> return full hsl string
  return `hsl(${raw})`;
};

export const chartColor = (index: number) => {
  const map = ['--chart-1', '--chart-2', '--chart-3', '--chart-4'] as const;
  const varName = map[index % map.length];
  return cssHslVar(varName);
};
