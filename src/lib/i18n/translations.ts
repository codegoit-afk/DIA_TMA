export type Language = 'ru' | 'ua' | 'en';

export const translations = {
  ru: {
    app_title: "Калькулятор ХЕ",
    ai_subtitle: "Умный ИИ-расчетчик",
    calculator: "Калькулятор",
    history: "История",
    settings: "Настройки",
    
    // Home tab
    current_sugar: "Текущий сахар (ммоль/л)",
    sugar_placeholder: "5.5",
    sugar_low_warning: "Опасно низкий сахар! Сначала съешь 1-2 ХЕ быстрых углеводов, подожди 15 минут.",
    clarification_label: "Уточнение для ИИ (необязательно)",
    clarification_placeholder: "Например: 'пирожок с картошкой'",
    cancel: "Отмена",
    analyze_btn: "Рассчитать ХЕ",
    analyzing: "Анализ...",
    take_photo_btn: "Сфотографировать еду",
    enter_sugar_first: "Сначала введите сахар",
    
    // Results
    ai_estimate_prefix: "Нейросеть оценила в",
    coef_label: "Коэффициент:",
    dps_label: "ДПС",
    units: "ед.",
    recognized_items: "Распознано на тарелке:",
    recalculate: "Пересчитать",
    save_and_inject: "Сохранить",
    disclaimer: "⚠️ Внимание: Расчеты примерные и основаны на визуальном анализе ИИ. Окончательное решение принимайте с учетом своего самочувствия и рекомендаций лечащего врача.",
    save_error: "Ошибка сохранения",
    save_success: "Сохранено в историю!",
    file_read_error: "Ошибка чтения файла",
    no_file_error: "Файлы не выбраны!",

    // Settings
    basic_settings: "Базовые параметры",
    hypo_threshold: "Порог гипо (ммоль/л)",
    target_sugar: "Идеальный сахар",
    xe_weight_label: "Вес 1 ХЕ (в граммах углеводов)",
    matrix_settings: "Матрица коэффициентов",
    add: "Добавить",
    sugar_from: "Сахар ОТ",
    sugar_to: "Сахар ДО",
    ins_per_xe: "Инс на 1 ХЕ",
    save_settings: "Сохранить настройки",

    // Logs
    logs_title: "История логов",
    carbs_label: "Углеводы",
    ai_suggested: "ИИ советовал:",
    history_empty: "История пуста"
  },
  ua: {
    app_title: "Калькулятор ХО",
    ai_subtitle: "Розумний ШІ-аналізатор",
    calculator: "Калькулятор",
    history: "Історія",
    settings: "Налаштування",
    
    // Home tab
    current_sugar: "Поточний цукор (ммоль/л)",
    sugar_placeholder: "5.5",
    sugar_low_warning: "Небезпечно низький цукор! Спочатку з'їж 1-2 ХО швидких вуглеводів, почекай 15 хвилин.",
    clarification_label: "Уточнення для ШІ (необов'язково)",
    clarification_placeholder: "Наприклад: 'пиріжок з картоплею'",
    cancel: "Скасувати",
    analyze_btn: "Розрахувати ХО",
    analyzing: "Аналіз...",
    take_photo_btn: "Сфотографувати їжу",
    enter_sugar_first: "Спочатку введіть цукор",
    
    // Results
    ai_estimate_prefix: "ШІ оцінив у",
    coef_label: "Коефіцієнт:",
    dps_label: "ДПЦ",
    units: "од.",
    recognized_items: "Розпізнано на тарілці:",
    recalculate: "Перерахувати",
    save_and_inject: "Зберегти",
    disclaimer: "⚠️ Увага: Розрахунки приблизні та базуються на візуальному аналізі ШІ. Приймайте остаточне рішення з урахуванням свого самопочуття та рекомендацій лікаря.",
    save_error: "Помилка збереження",
    save_success: "Збережено в історію!",
    file_read_error: "Помилка читання файлу",
    no_file_error: "Файли не вибрані!",

    // Settings
    basic_settings: "Базові параметри",
    hypo_threshold: "Поріг гіпо (ммоль/л)",
    target_sugar: "Ідеальний цукор",
    xe_weight_label: "Вага 1 ХО (у грамах вуглеводів)",
    matrix_settings: "Матриця коефіцієнтів",
    add: "Додати",
    sugar_from: "Цукор ВІД",
    sugar_to: "Цукор ДО",
    ins_per_xe: "Інс на 1 ХО",
    save_settings: "Зберегти налаштування",

    // Logs
    logs_title: "Історія логів",
    carbs_label: "Вуглеводи",
    ai_suggested: "ШІ радив:",
    history_empty: "Історія порожня"
  },
  en: {
    app_title: "Carb Calculator",
    ai_subtitle: "Smart AI Assistant",
    calculator: "Calculator",
    history: "History",
    settings: "Settings",
    
    // Home tab
    current_sugar: "Current Blood Sugar (mmol/L)",
    sugar_placeholder: "5.5",
    sugar_low_warning: "Dangerously low! Eat fast-acting carbs (15g) and wait 15 mins.",
    clarification_label: "Refinement for AI (optional)",
    clarification_placeholder: "e.g.: 'potato pie' or 'diet coke'",
    cancel: "Cancel",
    analyze_btn: "Calculate Bolus",
    analyzing: "Analyzing...",
    take_photo_btn: "Take Photo of Food",
    enter_sugar_first: "Enter Blood Sugar First",
    
    // Results
    ai_estimate_prefix: "AI Estimated:",
    coef_label: "Ratio:",
    dps_label: "Correction",
    units: "U",
    recognized_items: "Recognized on plate:",
    recalculate: "Recalculate",
    save_and_inject: "Save Log",
    disclaimer: "⚠️ Disclaimer: Calculations are approximate based on AI vision. Always verify and consult your physician for medical decisions.",
    save_error: "Error saving log",
    save_success: "Saved to history!",
    file_read_error: "Error reading file",
    no_file_error: "No files selected!",

    // Settings
    basic_settings: "Basic Parameters",
    hypo_threshold: "Hypo Threshold (mmol/L)",
    target_sugar: "Target Sugar (mmol/L)",
    xe_weight_label: "Grams of carbs per 1 Exchange (XE)",
    matrix_settings: "Ratio Matrix",
    add: "Add",
    sugar_from: "Sugar FROM",
    sugar_to: "Sugar TO",
    ins_per_xe: "Insulin per XE",
    save_settings: "Save Settings",

    // Logs
    logs_title: "Log History",
    carbs_label: "Carbs",
    ai_suggested: "AI Suggested:",
    history_empty: "History is empty"
  }
};
