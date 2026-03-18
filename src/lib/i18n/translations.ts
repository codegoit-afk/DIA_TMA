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
    xe_from: "ХЕ ОТ",
    xe_to: "ХЕ ДО",
    ins_per_xe: "Инс на 1 ХЕ",
    save_settings: "Сохранить настройки",

    // Fat split logic
    fat_alert_title: "Высокое содержание жиров!",
    fat_alert_desc: "Рекомендуется разделить дозу: уколите 80% сейчас, а оставшиеся 20% — через 1.5 часа (проверьте сахар).",
    dose_now: "Сразу:",
    dose_later: "Через 1.5ч:",

    // Logs
    logs_title: "История логов",
    carbs_label: "Углеводы",
    ai_suggested: "ИИ советовал:",
    history_empty: "История пуста",

    // CGM
    cgm_integration: "Интеграция CGM (Мониторинг)",
    cgm_source: "Источник данных",
    cgm_token: "Токен API (Опционально)",

    // My Foods
    my_foods_title: "Моя еда",
    my_foods_count: "блюд сохранено",
    my_foods_empty_title: "Список пуста",
    my_foods_empty_desc: "Сохраняй свои стандартные блюда для быстрого добавления",
    add_first_meal: "+ Добавить блюдо",
    add_food_title: "Новое блюдо",
    food_name_placeholder: "Название блюда",
    food_xe_placeholder: "Колич. ХЕ (напр., 3.5)",
    food_desc_placeholder: "Описание (необязательно)",
    food_saved: "Блюдо сохранено!",
    food_deleted: "Блюдо удалено",
    food_nav: "Еда",
    save_to_my_foods: "Сохранить блюдо",
    correct_xe: "Уточнить ХЕ",
    search_foods: "Поиск блюд...",
    quick_log_desc: "Быстрый лог из Моей еды",
    save: "Сохранить",

    // IOB & Basal
    iob_active: "Активный инсулин",
    iob_note: "учтен в дозе",
    insulin_dia_label: "Длительность действия инсулина (DIA, ч)",
    analytics_title: "Аналитика",
    analytics_nav: "Тренды"
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
    xe_from: "ХО ВІД",
    xe_to: "ХО ДО",
    ins_per_xe: "Інс на 1 ХО",
    save_settings: "Зберегти налаштування",

    // Fat split logic
    fat_alert_title: "Високий вміст жирів!",
    fat_alert_desc: "Рекомендується розділити дозу: вколіть 80% зараз, а решту 20% — через 1.5 години (перевірте цукор).",
    dose_now: "Одразу:",
    dose_later: "Через 1.5г:",

    // Logs
    logs_title: "Історія логів",
    carbs_label: "Вуглеводи",
    ai_suggested: "ШІ радив:",
    history_empty: "Історія порожня",

    // CGM
    cgm_integration: "Інтеграція CGM (Моніторинг)",
    cgm_source: "Джерело даних",
    cgm_token: "Токен API (Опціонально)",

    // My Foods
    my_foods_title: "Моя їжа",
    my_foods_count: "страв збережено",
    my_foods_empty_title: "Список порожній",
    my_foods_empty_desc: "Збережи свої стандартні страви для швидкого додавання",
    add_first_meal: "+ Додати страву",
    add_food_title: "Нова страва",
    food_name_placeholder: "Назва страви",
    food_xe_placeholder: "Кільк. ХО (напр., 3.5)",
    food_desc_placeholder: "Опис (необов'язково)",
    food_saved: "Страву збережено!",
    food_deleted: "Страву видалено",
    food_nav: "їжа",
    save_to_my_foods: "Зберегти страву",
    correct_xe: "Уточнити ХО",
    search_foods: "Пошук страв...",
    quick_log_desc: "Швидкий лог з Моєї їжі",
    save: "Зберегти",

    // IOB & Basal
    iob_active: "Активний інсулін",
    iob_note: "враховано в дозі",
    insulin_dia_label: "Тривалість дії інсуліну (DIA, г)",
    analytics_title: "Аналітика",
    analytics_nav: "Тренди"
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
    xe_from: "XE FROM",
    xe_to: "XE TO",
    ins_per_xe: "Insulin per XE",
    save_settings: "Save Settings",

    // Fat split logic
    fat_alert_title: "High Fat Content!",
    fat_alert_desc: "Consider a split dose: inject 80% now, and the remaining 20% in 1.5 hours (check your sugar).",
    dose_now: "Now:",
    dose_later: "In 1.5h:",

    // Logs
    logs_title: "Log History",
    carbs_label: "Carbs",
    ai_suggested: "AI Suggested:",
    history_empty: "History is empty",

    // CGM
    cgm_integration: "CGM Integration (Monitoring)",
    cgm_source: "Data Source",
    cgm_token: "API Token (Optional)",

    // My Foods
    my_foods_title: "My Foods",
    my_foods_count: "meals saved",
    my_foods_empty_title: "No saved foods yet",
    my_foods_empty_desc: "Save your standard meals for quick one-tap logging",
    add_first_meal: "+ Add a meal",
    add_food_title: "New meal",
    food_name_placeholder: "Meal name (e.g. Oatmeal)",
    food_xe_placeholder: "XE Amount (e.g. 3.5)",
    food_desc_placeholder: "Description (optional)",
    food_saved: "Meal saved!",
    food_deleted: "Meal deleted",
    food_nav: "Food",
    save_to_my_foods: "Save meal",
    correct_xe: "Adjust XE",
    search_foods: "Search meals...",
    quick_log_desc: "Quick Log from My Foods",
    save: "Save",

    // IOB & Basal
    iob_active: "Active Insulin",
    iob_note: "factored in dose",
    insulin_dia_label: "Insulin Duration of Action (DIA, h)",
    analytics_title: "Analytics",
    analytics_nav: "Trends"
  }
};
