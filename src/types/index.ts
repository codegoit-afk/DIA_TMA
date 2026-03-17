export type User = {
  telegram_id: number;
  username?: string;
  first_name?: string;
  role: 'user' | 'admin';
  created_at: string;
};

export type CoefMatrixRow = {
  min: number;
  max: number;
  coef: number;
};

export type Profile = {
  telegram_id: number;
  hypo_threshold: number;
  target_sugar_min: number;
  target_sugar_max: number;
  target_sugar_ideal: number;
  xe_weight: number;
  use_k2: boolean;
  insulin_dia: number;
  isf: number;
  coef_matrix: CoefMatrixRow[];
  updated_at: string;
};

export type FoodItemEstimation = {
  name: string;
  estimated_weight_g: number;
  carbs_per_100g: number;
  total_carbs_g: number;
  xe: number;
};

export type AIResponse = {
  thinking_process: {
    hand_scale_cm: string;
    analysis: string;
  };
  items_breakdown: FoodItemEstimation[];
  total_xe: number;
  glycemic_alert: string | null;
};

export type FoodLog = {
  id: string;
  telegram_id: number;
  current_sugar: number;
  photo_url?: string;
  ai_raw_response?: AIResponse;
  total_xe: number;
  recommended_dose?: number;
  actual_dose: number;
  created_at: string;
};

export type CalculatorState = {
  sugar: string;
  previewUrl: string | null;
  result: { dose: number, xe: number, coef: number, dps: number } | null;
  aiData: AIResponse | null;
};
