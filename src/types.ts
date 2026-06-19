export type Theme = "light" | "dark" | "system";

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface MasterItem {
  id: string;
  categoryId: string;
  name: string;
  defaultUnit: string;
  notes?: string;
}

export interface ShoppingList {
  id: string;
  name: string;
  date: string;
  status: "active" | "completed" | "archived";
  itemCount: number;
}

export interface ShoppingListItem {
  id: string;
  masterItemId: string;
  quantity: number;
  unit: string;
  checked: boolean;
}
