export interface Product {
  name: string;
  category: string;
  flavor: string;
  size_ml: number;
  cost_price: number;
  sell_price: number;
}

export const products: Product[] = [
  // TRADICIONAL
  { name: "Suco de Laranja", category: "tradicional", flavor: "Laranja", size_ml: 350, cost_price: 2.80, sell_price: 6.50 },
  { name: "Suco de Laranja Família", category: "tradicional", flavor: "Laranja", size_ml: 1000, cost_price: 4.50, sell_price: 11.00 },
  { name: "Suco de Uva", category: "tradicional", flavor: "Uva", size_ml: 350, cost_price: 3.20, sell_price: 7.50 },
  { name: "Suco de Uva Família", category: "tradicional", flavor: "Uva", size_ml: 1000, cost_price: 5.50, sell_price: 14.00 },
  { name: "Suco de Maçã", category: "tradicional", flavor: "Maçã", size_ml: 350, cost_price: 2.50, sell_price: 5.50 },
  { name: "Suco de Maracujá", category: "tradicional", flavor: "Maracujá", size_ml: 350, cost_price: 2.60, sell_price: 6.00 },
  { name: "Suco de Maracujá 500ml", category: "tradicional", flavor: "Maracujá", size_ml: 500, cost_price: 3.50, sell_price: 8.00 },
  { name: "Suco de Abacaxi", category: "tradicional", flavor: "Abacaxi", size_ml: 350, cost_price: 2.40, sell_price: 5.50 },
  { name: "Suco de Limão", category: "tradicional", flavor: "Limão", size_ml: 350, cost_price: 2.20, sell_price: 5.00 },

  // CITRICO
  { name: "Laranja com Acerola", category: "citrico", flavor: "Laranja com Acerola", size_ml: 350, cost_price: 3.00, sell_price: 7.00 },
  { name: "Limão Siciliano", category: "citrico", flavor: "Limão Siciliano", size_ml: 350, cost_price: 3.50, sell_price: 8.50 },
  { name: "Tangerina", category: "citrico", flavor: "Tangerina", size_ml: 350, cost_price: 3.20, sell_price: 7.50 },
  { name: "Laranja com Gengibre", category: "citrico", flavor: "Laranja com Gengibre", size_ml: 350, cost_price: 3.80, sell_price: 9.00 },

  // TROPICAL
  { name: "Suco de Manga", category: "tropical", flavor: "Manga", size_ml: 350, cost_price: 3.00, sell_price: 7.00 },
  { name: "Suco de Manga 500ml", category: "tropical", flavor: "Manga", size_ml: 500, cost_price: 4.00, sell_price: 9.50 },
  { name: "Suco de Goiaba", category: "tropical", flavor: "Goiaba", size_ml: 350, cost_price: 2.80, sell_price: 6.50 },
  { name: "Suco de Caju", category: "tropical", flavor: "Caju", size_ml: 350, cost_price: 3.00, sell_price: 7.00 },
  { name: "Açaí com Banana", category: "tropical", flavor: "Açaí com Banana", size_ml: 350, cost_price: 5.00, sell_price: 11.00 },
  { name: "Suco de Cupuaçu", category: "tropical", flavor: "Cupuaçu", size_ml: 350, cost_price: 4.50, sell_price: 10.00 },

  // PREMIUM
  { name: "Laranja Orgânica", category: "premium", flavor: "Laranja Orgânica", size_ml: 200, cost_price: 3.50, sell_price: 7.00 },
  { name: "Laranja Orgânica 500ml", category: "premium", flavor: "Laranja Orgânica", size_ml: 500, cost_price: 5.50, sell_price: 12.00 },
  { name: "Uva Orgânica", category: "premium", flavor: "Uva Orgânica", size_ml: 200, cost_price: 4.00, sell_price: 8.00 },
  { name: "Mirtilo com Romã", category: "premium", flavor: "Mirtilo com Romã", size_ml: 200, cost_price: 5.00, sell_price: 11.00 },
  { name: "Água de Coco Natural", category: "premium", flavor: "Água de Coco", size_ml: 350, cost_price: 3.50, sell_price: 8.00 },
  { name: "Suco Verde Detox", category: "premium", flavor: "Detox", size_ml: 350, cost_price: 5.50, sell_price: 12.00 },

  // LIGHT
  { name: "Laranja Zero", category: "light", flavor: "Laranja Zero", size_ml: 350, cost_price: 3.00, sell_price: 7.00 },
  { name: "Uva Zero", category: "light", flavor: "Uva Zero", size_ml: 350, cost_price: 3.50, sell_price: 8.00 },
  { name: "Limão Zero", category: "light", flavor: "Limão Zero", size_ml: 350, cost_price: 2.80, sell_price: 6.50 },
  { name: "Chá Mate com Limão", category: "light", flavor: "Chá Mate com Limão", size_ml: 350, cost_price: 2.50, sell_price: 6.00 },
];
