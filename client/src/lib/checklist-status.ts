export interface ChecklistItemStatus {
  completed?: boolean;
  hasStock?: boolean;
}

// Estados existentes: pendiente = false/true, completado = true/true y
// sin stock = false/false. Si llegara un registro histórico incompatible
// (true/false), Sin Stock prevalece para que nunca infle el cumplimiento.
export const isChecklistNoStock = (item?: ChecklistItemStatus | null) => item?.hasStock === false;

export const isChecklistCompleted = (item?: ChecklistItemStatus | null) =>
  item?.completed === true && !isChecklistNoStock(item);

export const isChecklistPending = (item?: ChecklistItemStatus | null) =>
  !isChecklistCompleted(item) && !isChecklistNoStock(item);

export const getChecklistProgress = (items: Array<ChecklistItemStatus | null | undefined>) => {
  const total = items.length;
  const completed = items.filter(isChecklistCompleted).length;
  const noStock = items.filter(isChecklistNoStock).length;

  return {
    total,
    completed,
    noStock,
    completedPercentage: total > 0 ? (completed / total) * 100 : 0,
    noStockPercentage: total > 0 ? (noStock / total) * 100 : 0,
    isComplete: total > 0 && completed === total,
  };
};
