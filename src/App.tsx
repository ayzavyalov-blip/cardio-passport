import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Activity, AlertTriangle, History, CheckCircle2, AlertCircle, Clock,
  ArrowRight, ShieldAlert, FileDown, Shield, List, Save, Network, Database,
  HeartPulse, Baby, Utensils, Cigarette, BookOpen, AlertOctagon, Scale, X,
  ChevronRight, FileCheck, Info
} from 'lucide-react';

// ─── СПРАВОЧНИК ПРАВИЛ ────────────────────────────────────────────────────────
const RD = {
  version: "23.06.2026",
  target_age: { min: 22, max: 25 },
  domains: {
    A: { name: "Семейный анамнез", max: 10 },
    B: { name: "Репродуктивный статус", max: 12 },
    C: { name: "Поведенческие факторы", max: 15 },
    D: { name: "Симптомы и неврология", max: 15 },
    E: { name: "Питание и микронутриенты", max: 20 },
    F: { name: "Физическая активность", max: 10 },
    G: { name: "Антропометрия и АД", max: 20 },
    H: { name: "Лабораторные данные", max: 15 },
  },
  validation: {
    age:         { min: 22, max: 25,   label: "Возраст (лет)" },
    height:      { min: 140, max: 220, label: "Рост (см)" },
    weight:      { min: 35, max: 200,  label: "Вес (кг)" },
    waist:       { min: 50, max: 150,  label: "Талия (см)" },
    sys:         { min: 70, max: 250,  label: "САД (мм рт.ст.)" },
    dia:         { min: 40, max: 150,  label: "ДАД (мм рт.ст.)" },
    cholesterol: { min: 1.0, max: 20.0,label: "Холестерин (ммоль/л)" },
    uric_acid:   { min: 50, max: 1200, label: "Мочевая кислота (мкмоль/л)" },
    albumin:     { min: 15, max: 70,   label: "Альбумин (г/л)" },
    tsh:         { min: 0.01, max: 50, label: "ТТГ (мЕд/л)" },
    glucose:     { min: 1.0, max: 30,  label: "Глюкоза (ммоль/л)" },
    ferritin:    { min: 1, max: 2000,  label: "Ферритин (мкг/л)" },
  },
  lab_ref: {
    cholesterol: { hi: 5.2,  unit: "ммоль/л", note: "КР МЗ РФ «Нарушения липидного обмена» 2023" },
    uric_acid:   { hi: 360,  lo: 155, unit: "мкмоль/л", note: "EULAR 2022; МАРС 2024" },
    albumin:     { lo: 35,   hi: 52,  unit: "г/л", note: "ESPEN 2021; норма вне беременности" },
    // ТТГ: целевое значение в прегравидарном периоде <2,5 мЕд/л (МАРС 2024, протокол КЗ МЗ 2023)
    // Нижняя граница 0,4 мЕд/л — общепринятый консенсус (NHANES-III, Biondi 2019)
    tsh:         { lo: 0.4,  hi: 2.5, unit: "мЕд/л", note: "МАРС 2024: целевой ТТГ <2,5 мЕд/л до зачатия" },
    // Глюкоза: порог риска ГСД в прегравидарном периоде — 5,1 ммоль/л (ВОЗ 2013, КР МЗ РФ «ГСД» 2020)
    // 5,6 ммоль/л — диагностический критерий нарушения гликемии натощак (IFG по ВОЗ 1999/2006)
    // В прегравидарном периоде более актуален порог 5,1 как фактор риска ГСД
    glucose:     { hi: 5.1,  unit: "ммоль/л", note: "ВОЗ 2013; КР МЗ РФ «ГСД» 2020: ≥5,1 — фактор риска ГСД" },
    // Ферритин: целевой уровень в прегравидарном периоде >40 мкг/л (МАРС 2024 v3.1)
    // Порог латентного дефицита — 30 мкг/л (WHO 2020); оптимальный прегравидарный — >40 мкг/л
    ferritin:    { lo: 30,   hi_opt: 40, unit: "мкг/л", note: "МАРС 2024: целевой ферритин >40 мкг/л до зачатия" },
  },
  red_flags: [
    { id:"RF-000", cond:(d,m)=> m.avgSys>=180||m.avgDia>=110, level:"Красный", urgency:"Экстренно", title:"Гипертонический криз / АГ 3 ст.", action:"Немедленный вызов скорой помощи или самостоятельное обращение в приёмный покой", desc:"САД ≥ 180 или ДАД ≥ 110 мм рт.ст." },
    { id:"RF-001", cond:(d,m)=> (m.avgSys>=160&&m.avgSys<180)||(m.avgDia>=100&&m.avgDia<110), level:"Красный", urgency:"В день выявления", title:"АГ 2 ст. — срочная оценка", action:"Очная консультация кардиолога в день выявления; не откладывать", desc:"САД 160–179 или ДАД 100–109 мм рт.ст." },
    { id:"RF-002", cond:(d,m)=> d.coc==='Да'&&(m.avgSys>=140||m.avgDia>=90), level:"Красный", urgency:"В день выявления", title:"КОК при АГ — абсолютное противопоказание", action:"Немедленная отмена КОК, подбор альтернативной контрацепции, консультация гинеколога", desc:"КОК + АД ≥ 140/90 мм рт.ст. (ВОЗ MEC категория 4)" },
    { id:"RF-003", cond:(d,m)=> d.coc==='Да'&&d.migraine==='С аурой'&&d.smoke==='Да', level:"Красный", urgency:"В день выявления", title:"Тройной сосудистый риск", action:"Немедленная отмена КОК, срочная консультация", desc:"КОК + Мигрень с аурой + Никотин" },
    { id:"RF-005", cond:(d,m)=> (m.avgSys>=140&&m.avgSys<160)||(m.avgDia>=90&&m.avgDia<100), level:"Оранжевый", urgency:"До 2 недель", title:"АГ 1 ст. — приоритетная оценка", action:"Консультация кардиолога до зачатия обязательна; домашний мониторинг АД", desc:"АД 140–159/90–99 мм рт.ст." },
    { id:"RF-006", cond:(d,m)=> Number(d.miscarriages)>=2, level:"Оранжевый", urgency:"До 1 месяца", title:"Привычное невынашивание", action:"Обследование на тромбофилию: АФС, коагулограмма; консультация гематолога и акушера-гинеколога", desc:"≥ 2 самопроизвольных выкидышей в анамнезе" },
    { id:"RF-008", cond:(d,m)=> d.albumin&&Number(d.albumin)<35, level:"Оранжевый", urgency:"До 1 месяца", title:"Выраженный нутритивный дефицит", action:"Коррекция белкового статуса; при альбумине < 30 г/л — консультация гастроэнтеролога/нефролога", desc:"Альбумин < 35 г/л" },
  ],
  critical_combinations: [
    { id:"CC-001", cond:(d,m)=> d.coc==='Да'&&d.migraine==='С аурой', effect:"+1 ступень риска", title:"КОК + Мигрень с аурой" },
    { id:"CC-004", cond:(d,m)=> d.spky==='Да'&&Number(d.waist)>=80, effect:"+1 ступень риска", title:"СПКЯ + Абдоминальное ожирение" },
    { id:"CC-011", cond:(d,m)=> Number(d.uric_acid)>360&&m.avgSys>=130, effect:"+1 ступень риска", title:"Гиперурикемия + Повышенное АД" },
    { id:"CC-012", cond:(d,m)=> d.smoke==='Да'&&m.bmi>=30, effect:"+1 ступень риска", title:"Курение + Ожирение" },
    { id:"CC-013", cond:(d,m)=> d.migraine==='С аурой'&&m.bmi>=30, effect:"+1 ступень риска", title:"Мигрень с аурой + Ожирение" },
    { id:"CC-014", cond:(d,m)=> d.spky==='Да'&&Number(d.uric_acid)>360, effect:"+1 ступень риска", title:"СПКЯ + Гиперурикемия" },
  ],
  recs: [
    {
      domain:"Питание",
      problem:"Недостаточное потребление овощей/фруктов или регулярный фастфуд (чеклист FIGO)",
      cond:(d,m)=>m.nutritionRisk,
      actions:[
        "Увеличить потребление свежих овощей и фруктов до ≥ 400 г/сут (рекомендация ВОЗ/FIGO): включать в каждый приём пищи",
        "Ежедневно употреблять источники полноценного белка: птица, рыба, яйца, бобовые, молочные продукты (1,2–1,5 г/кг/сут)",
        "Исключить ультрапереработанные продукты (колбасы, снеки, сладкие напитки), фастфуд ограничить до < 1 раза/нед",
        "Добавить продукты, богатые фолатами: шпинат, брокколи, спаржа, чечевица, авокадо",
        "Повторный нутритивный скрининг по чеклисту FIGO через 3 месяца",
      ],
      pat:"Добавляйте в каждый приём пищи овощи или фрукты, выбирайте белковые блюда (рыба, яйца, творог), ограничьте фастфуд и сладкие напитки.",
      src:"Чеклист питания FIGO 2023",
    },
    {
      domain:"Дотация фолатов",
      problem:"Отсутствие приёма фолиевой кислоты в прегравидарном периоде",
      cond:(d,m)=>d.folate==='Нет',
      actions:[
        "Назначить фолиевую кислоту 400–800 мкг/сут немедленно — не менее чем за 12 недель (3 месяца) до планируемого зачатия",
        "При наличии факторов риска дефектов нервной трубки (семейный анамнез, сахарный диабет, приём противоэпилептических препаратов) — доза 4–5 мг/сут по назначению врача",
        "Совместно принимать витамин B12 (для оптимального метаболизма фолатов): кобаламин 250–500 мкг/сут или в составе прегравидарного комплекса",
        "Продолжать приём фолатов на протяжении всего I триместра беременности (до 12 недель)",
      ],
      pat:"Немедленно начните принимать фолиевую кислоту (витамин B9) — 400 мкг в день. Это защищает нервную систему малыша. Продолжайте до 12-й недели беременности.",
      src:"Протокол МАРС «Прегравидарная подготовка» 2024",
    },
    {
      domain:"Физическая активность",
      problem:"Недостаточный уровень физической активности (< 150 мин/нед)",
      cond:(d,m)=>Number(d.active_min)<150,
      actions:[
        "Целевой уровень: ≥ 150 мин/нед умеренной аэробной активности (ходьба быстрым шагом, плавание, велосипед, скандинавская ходьба)",
        "Начинать постепенно: +10–15% от текущего уровня еженедельно во избежание травм",
        "Ограничить непрерывное сидячее время: вставать и двигаться каждые 45–60 минут",
        "Добавить 2 силовые тренировки в неделю для профилактики инсулинорезистентности",
        "Регулярная физическая активность снижает риск гестационного диабета и преэклампсии на 30–40%",
      ],
      pat:"Стремитесь ходить быстрым шагом не менее 30 минут 5 раз в неделю. Вставайте из-за стола каждый час. Начинайте постепенно, увеличивая нагрузку.",
      src:"Рекомендации ВОЗ по физактивности 2020",
    },
    {
      domain:"Контроль АД",
      problem:"АД ≥ 130/85 мм рт.ст. — тенденция к повышению",
      cond:(d,m)=>(m.avgSys>=130&&m.avgSys<140)||(m.avgDia>=85&&m.avgDia<90),
      actions:[
        "Домашний мониторинг АД: измерять утром и вечером в течение 7 дней, сидя, после 5 мин отдыха — для оценки вне медицинского учреждения",
        "Ограничить натрий: < 5 г/сут поваренной соли; исключить консервы, полуфабрикаты, досаливание пищи",
        "Увеличить потребление калия: бананы, картофель, авокадо, шпинат (антагонизм с натрием снижает АД)",
        "Коррекция образа жизни: физическая активность ≥ 150 мин/нед, отказ от курения, нормализация веса",
        "Повторная оценка АД через 3 месяца; при нарастании — консультация кардиолога",
      ],
      pat:"Ваше давление немного выше нормы. Измеряйте его утром и вечером в течение недели и запишите результаты. Ограничьте соль и ешьте больше овощей — это поможет без таблеток.",
      src:"КР МЗ РФ «АГ у взрослых» 2024",
    },
    {
      domain:"Прегравидарная подготовка в норме",
      problem:"Основные факторы риска не выявлены",
      cond:(d,m)=>m.avgSys<130&&m.avgDia<85&&m.bmi>=18.5&&m.bmi<25&&Number(d.waist)<80&&d.smoke==='Нет'&&d.folate==='Да'&&d.figo_veg==='Достаточно'&&d.figo_fastfood==='Нет'&&Number(d.active_min)>=150&&d.migraine!=='С аурой'&&Number(d.miscarriages)<2,
      actions:[
        "Продолжать приём фолиевой кислоты 400 мкг/сут и йодида калия 200–250 мкг/сут до наступления беременности и в I триместре",
        "Поддерживать физическую активность ≥ 150 мин/нед; предпочтительны умеренные аэробные нагрузки: ходьба, плавание",
        "Сбалансированное питание по принципам средиземноморской диеты: рыба ≥ 2 раз/нед, овощи, фрукты, цельнозерновые",
        "Контроль АД, массы тела и менструального цикла: ежеквартально",
        "Плановый осмотр акушера-гинеколога до зачатия: консультация по срокам, анализы (ОАК, ОАМ, мазок), вакцинация",
        "Повторная оценка рисков: через 3–6 месяцев или при изменении состояния здоровья",
      ],
      pat:"Ваш профиль в норме — это отличный старт для планирования беременности! Продолжайте принимать фолиевую кислоту, питайтесь разнообразно, двигайтесь и запишитесь к гинекологу для плановой подготовки.",
      src:"Протокол МАРС «Прегравидарная подготовка» 2024; КР МЗ РФ «Нормальная беременность» 2023",
    },
    {
      domain:"Масса тела",
      problem:"Избыточная масса тела (ИМТ ≥ 25) или абдоминальное ожирение (талия ≥ 80 см)",
      cond:(d,m)=>m.bmi>=25||Number(d.waist)>=80,
      actions:[
        "Целевое снижение массы тела на 5-10% от исходной до наступления беременности (уровень доказательности А)",
        "Дефицит калорий 300-500 ккал/сут: уменьшение порций, отказ от сладких напитков и алкоголя; жёсткие диеты и голодание противопоказаны",
        "Основа рациона: оливковое масло, рыба 2 раза/нед, бобовые, цельнозерновые, овощи и фрукты",
        "При СПКЯ с ожирением - исключить инсулинорезистентность (HOMA-IR), консультация эндокринолога",
        "Контроль объёма талии каждые 4 недели",
        "При ИМТ > 30: направление к диетологу",
      ],
      pat:"Не нужны жёсткие диеты — важны постоянные небольшие изменения: меньше сладкого, больше движения. Снижение веса на 5–7% уже значительно улучшит шансы на здоровую беременность.",
      src:"КР МЗ РФ «Ожирение» 2024",
    },
    {
      domain:"Отказ от курения",
      problem:"Активное курение / употребление никотинсодержащих изделий",
      cond:(d,m)=>d.smoke==='Да',
      actions:[
        "Полный отказ от всех форм никотина: сигареты, вейпы, электронные сигареты, кальян, снюс — нет безопасных альтернатив",
        "Никотинзаместительная терапия (пластырь, жвачка) допустима при невозможности бросить самостоятельно; после отказа от НЗТ — 3 месяца до планирования зачатия",
        "Варениклин: эффективен для отказа от курения, но при планировании беременности должен быть отменён за ≥ 1 месяц до зачатия",
        "Бупропион: противопоказан при планировании беременности; отменить за ≥ 2 месяца до зачатия",
        "Пассивное курение также вредно: настаивать на создании некурящего окружения дома и на работе",
        "Курение повышает риск преэклампсии в 1,5–2 раза, задержку роста плода в 3–4 раза, преждевременные роды в 2 раза",
      ],
      pat:"Бросьте курить полностью — включая вейпы и электронные сигареты. Если сложно самостоятельно, обратитесь к врачу: существуют эффективные методы помощи.",
      src:"КР МЗ РФ «Нормальная беременность» 2023",
    },
    {
      domain:"КОК и контроль АД",
      problem:"Приём комбинированных оральных контрацептивов без регулярного контроля АД",
      cond:(d,m)=>d.coc==='Да'&&d.bp_measured==='Нет',
      actions:[
        "Немедленно установить базовый уровень АД (трёхкратное измерение в состоянии покоя)",
        "КОК категорически противопоказаны при АД ≥ 140/90 мм рт.ст. — необходима смена метода контрацепции",
        "При АД 130–139/80–89 мм рт.ст. на фоне КОК — альтернатива: прогестин-содержащие монопрепараты или барьерные методы",
        "Контролировать АД каждые 3–6 месяцев на протяжении всего периода приёма КОК",
        "Дополнительно: при приёме КОК > 1 года проверить липидный профиль, уровень глюкозы натощак",
      ],
      pat:"Пожалуйста, измерьте давление — желательно трёхкратно в спокойном состоянии. Сообщите результат врачу: от этого зависит безопасность вашего метода контрацепции.",
      src:"Протокол МАРС «Прегравидарная подготовка» 2024",
    },
  ],
  sources: [
    { short:"КР МЗ РФ «Нормальная беременность» 2023", full:"Клинические рекомендации «Нормальная беременность», МКБ-10: Z32–Z36. Утверждены Министерством здравоохранения Российской Федерации, 2023 г. Применяются с 01.01.2024. ID 288." },
    { short:"КР МЗ РФ «Преэклампсия. Эклампсия» 2024", full:"Клинические рекомендации «Преэклампсия. Эклампсия. Отёки, протеинурия и гипертензивные расстройства во время беременности, в родах и послеродовом периоде», МКБ-10: O10–O16. Утверждены Министерством здравоохранения Российской Федерации, 2024 г. Применяются с 01.01.2025." },
    { short:"КР МЗ РФ «АГ у взрослых» 2024", full:"Клинические рекомендации «Артериальная гипертензия у взрослых», МКБ-10: I10–I15. Утверждены Министерством здравоохранения Российской Федерации, 2024 г. Опубликованы: Российский кардиологический журнал. 2024;29(9):6117. DOI: 10.15829/1560-4071-2024-6117." },
    { short:"КР МЗ РФ «СПКЯ» 2021", full:"Клинические рекомендации «Синдром поликистозных яичников», МКБ-10: E28.2. Утверждены Министерством здравоохранения Российской Федерации, 2021 г." },
    { short:"КР МЗ РФ «Контрацепция» 2021", full:"Клинические рекомендации «Контрацепция», МКБ-10: Z30. Утверждены Министерством здравоохранения Российской Федерации, 2021 г." },
    { short:"КР МЗ РФ «Мигрень» 2021", full:"Клинические рекомендации «Мигрень», МКБ-10: G43. Утверждены Министерством здравоохранения Российской Федерации, 2021 г." },
    { short:"КР МЗ РФ «Подагра» 2021", full:"Клинические рекомендации «Подагра», МКБ-10: M10. Утверждены Министерством здравоохранения Российской Федерации, 2021 г." },
    { short:"КР МЗ РФ «Нарушения липидного обмена» 2023", full:"Клинические рекомендации «Нарушения липидного обмена», МКБ-10: E78. Утверждены Министерством здравоохранения Российской Федерации, 2023 г." },
    { short:"КР МЗ РФ «Ожирение» 2024", full:"Клинические рекомендации «Ожирение», МКБ-10: E66. Утверждены Министерством здравоохранения Российской Федерации, 2024 г." },
    { short:"КР МЗ РФ «Привычный выкидыш» 2022", full:"Клинические рекомендации «Привычный выкидыш», МКБ-10: O26.2, N96. Утверждены Министерством здравоохранения Российской Федерации, 2022 г. ID 721." },
    { short:"Протокол МАРС 2024", full:"Клинический протокол Межрегиональной ассоциации акушеров-гинекологов (МАРС) «Прегравидарная подготовка», версия 3.0. М.: Редакция журнала StatusPraesens, 2024 г." },
    { short:"Чеклист питания FIGO 2023", full:"FIGO Nutrition Checklist for Women before and during Pregnancy. Международная федерация гинекологии и акушерства (FIGO). Разработан 2015, обновлён 2023 г." },
    { short:"FIGO Preconception Checklist 2024", full:"Benedetto C, et al. FIGO Preconception Checklist: Preconception care for mother and baby. International Journal of Gynecology & Obstetrics. 2024;165:1–8. DOI: 10.1002/ijgo.15446." },
    { short:"ВОЗ MEC 2015", full:"Медицинские критерии приемлемости для использования методов контрацепции (U.S. MEC), 5-е издание. Всемирная организация здравоохранения, 2015 г." },
    { short:"Рекомендации ВОЗ по физактивности 2020", full:"Глобальные рекомендации по физической активности и малоподвижному образу жизни. Всемирная организация здравоохранения (ВОЗ), 2020 г." },
    { short:"ESHRE PCOS 2023", full:"International evidence-based guideline for the assessment and management of polycystic ovary syndrome. ESHRE/ASRM, 2023. Hum Reprod Open. 2023;2023(2):hoad036." },
    { short:"ESPEN 2021", full:"Weimann A, et al. ESPEN Practical Guideline: Clinical Nutrition in Surgery. Clinical Nutrition. 2021;40(7):4745–4761. DOI: 10.1016/j.clnu.2021.03.031." },
    { short:"ESC Guidelines АГ 2024", full:"McEvoy JW, et al. 2024 ESC Guidelines for the management of elevated blood pressure and hypertension. European Heart Journal. 2024;45(38):3912–4018. DOI: 10.1093/eurheartj/ehae178. Ключевое изменение: введена новая категория «повышенное АД» (120–139/70–89 мм рт.ст.); определение АГ сохранено ≥ 140/90. Целевое значение на фоне терапии — 120–129/70–79 мм рт.ст. (Заменяет совместные руководства ESC/ESH 2018.)" },
    { short:"EULAR Подагра 2022", full:"Richette P, et al. 2022 updated EULAR recommendations for the diagnosis and management of gout. Annals of the Rheumatic Diseases. 2023;82(1):21–30. DOI: 10.1136/ard-2022-222734." },
  ],
};

// ─── ДЕФОЛТНЫЕ ДАННЫЕ ─────────────────────────────────────────────────────────
const DEFAULT_FORM = {
  patient_name: '',
  age: '',
  family_cvd: '', family_pe: '',
  spky: '', coc: '', bp_measured: '', migraine: '',
  smoke: '', sleep: '', active_min: '',
  figo_veg: '', figo_fastfood: '', folate: '',
  height: '', weight: '', waist: '',
  sys1: '', dia1: '', sys2: '', dia2: '', sys3: '', dia3: '',
  labs_status: 'not_filled',
  cholesterol: '', uric_acid: '', albumin: '',
  tsh: '', glucose: '', ferritin: '',
  cycle: '', miscarriages: '', dysmenorrhea: '',
  pe_own: '', gdm: '', fgr: '', preterm: '', stillbirth: '',
  chronic_htn: '', dm: '', ckd: '', autoimmune: '', thrombosis: '',
  risky_meds: '',
  fish: '', calcium_src: '', iron_src: '', alcohol: '', diet_restrict: '',
  consent_local_save: 'Да',
};

// Демонстрационные данные — заполняются только по кнопке
const DEMO_FORM = {
  ...DEFAULT_FORM,
  patient_name: 'Образцова Анна Ивановна',
  age: '22',
  family_cvd: 'Нет', family_pe: 'Нет',
  spky: 'Нет', coc: 'Нет', bp_measured: 'Да', migraine: 'Нет',
  smoke: 'Нет', sleep: '7–9 часов', active_min: '150',
  figo_veg: 'Достаточно', figo_fastfood: 'Нет', folate: 'Да',
  fish: 'Да', calcium_src: 'Да', iron_src: 'Достаточно', alcohol: 'Нет',
  height: '165', weight: '65', waist: '75',
  sys1: '118', dia1: '76', sys2: '120', dia2: '78', sys3: '116', dia3: '74',
  cycle: 'Регулярный (21–35 дней)', miscarriages: '0', dysmenorrhea: 'Нет',
  pe_own: 'Нет', gdm: 'Нет', fgr: 'Нет', preterm: 'Нет', stillbirth: 'Нет',
  chronic_htn: 'Нет', dm: 'Нет', ckd: 'Нет', autoimmune: 'Нет', thrombosis: 'Нет',
  risky_meds: 'Нет', diet_restrict: 'Нет',
  cholesterol: '4.8', uric_acid: '280', albumin: '42', tsh: '1.5', glucose: '4.9', ferritin: '45',
  labs_status: 'filled',
};

// ─── УТИЛИТЫ ──────────────────────────────────────────────────────────────────
const LAB_KEYS = ['cholesterol','uric_acid','albumin','tsh','glucose','ferritin'] as const;
// Надёжный парсер чисел: принимает запятую как разделитель (4,8 → 4.8), пустую строку → null
function parseNum(value: string | number | undefined | null): number | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim().replace(',', '.');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
function calcBMI(h: string, w: string): number {
  const hv = parseNum(h); const wv = parseNum(w);
  if (!hv || !wv || hv < 100) return 0;
  return parseFloat((wv / ((hv / 100) ** 2)).toFixed(1));
}
// Только валидные пары САД/ДАД
function getValidBpPairs(form: any) {
  return [1,2,3].map(i => ({
    sys: parseNum(form[`sys${i}`]),
    dia: parseNum(form[`dia${i}`]),
  })).filter(p =>
    p.sys !== null && p.dia !== null &&
    p.sys >= 70 && p.sys <= 250 &&
    p.dia >= 40 && p.dia <= 150 &&
    p.dia < p.sys && (p.sys - p.dia) >= 20
  );
}
function avgPairs(pairs: {sys:number,dia:number}[], key: 'sys'|'dia'): number {
  if (!pairs.length) return 0;
  return Math.round(pairs.reduce((a,p) => a + p[key], 0) / pairs.length);
}

// ─── ЦВЕТ КАТЕГОРИИ РИСКА ─────────────────────────────────────────────────────
function riskColors(cat) {
  if (cat === 'Высокий')    return { bg:'bg-red-50',    border:'border-red-300',    text:'text-red-700',    dot:'bg-red-500' };
  if (cat === 'Повышенный') return { bg:'bg-orange-50', border:'border-orange-300', text:'text-orange-700', dot:'bg-orange-500' };
  if (cat === 'Умеренный')  return { bg:'bg-amber-50',  border:'border-amber-300',  text:'text-amber-700',  dot:'bg-amber-500' };
  return                           { bg:'bg-green-50',  border:'border-green-300',  text:'text-green-700',  dot:'bg-green-500' };
}

// ─── РАДАР ────────────────────────────────────────────────────────────────────
// ─── СТАБИЛЬНЫЙ SELECT ───────────────────────────────────────────────────────
// Вынесен за пределы App — предотвращает потерю фокуса на Android Chrome.
// Синхронизирует значение с родителем только onBlur (аналогично NumInput).
// ─── СТАБИЛЬНЫЙ ТЕКСТОВЫЙ ИНПУТ ─────────────────────────────────────────────
// Аналог NumInput для текстовых полей — обновляет родителя только onBlur
const StableTextInput = React.memo(function StableTextInput({
  value, onChange, className, placeholder, type = 'text'
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
  type?: string;
}) {
  const [local, setLocal] = React.useState(value);
  const focused = React.useRef(false);
  const prevValue = React.useRef(value);

  React.useEffect(() => {
    if (!focused.current) setLocal(value);
  }, [value]);

  return (
    <input
      type={type}
      value={local}
      onChange={e => setLocal(e.target.value)}
      onFocus={() => { focused.current = true; prevValue.current = local; }}
      onBlur={e => {
        focused.current = false;
        if (e.target.value !== prevValue.current) onChange(e.target.value);
      }}
      className={className}
      placeholder={placeholder}
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
    />
  );
});
// Ключевое решение для Android Chrome:
// - Хранит значение в ЛОКАЛЬНОМ useState — ни один внешний рендер не трогает поле
// - Обновляет родителя только onBlur (когда пользователь уходит с поля)
// - Синхронизируется с внешним value только если пользователь не в фокусе
const NumInput = React.memo(function NumInput({
  value, onChange, className, placeholder, mode = 'numeric'
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
  mode?: string;
}) {
  const [local, setLocal] = useState(value);
  const focused = useRef(false);

  // Синхронизировать извне только если поле не в фокусе
  useEffect(() => {
    if (!focused.current) setLocal(value);
  }, [value]);

  return (
    <input
      type="text"
      inputMode={mode as any}
      value={local}
      onChange={e => setLocal(e.target.value)}
      onFocus={() => { focused.current = true; }}
      onBlur={() => { focused.current = false; onChange(local); }}
      className={className}
      placeholder={placeholder}
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
    />
  );
});

// ─── СТАБИЛЬНЫЙ SELECT (аналог NumInput для выпадающих списков) ──────────────
// На Android Chrome onChange на select вызывает ре-рендер и сбрасывает скролл.
// Решение: локальный state + мгновенная синхронизация с родителем.
const StableSelect = React.memo(function StableSelect({
  value, onChange, className, children, title
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  children: React.ReactNode;
  title?: string;
}) {
  const [local, setLocal] = React.useState(value);
  const focused = React.useRef(false);
  const prevValue = React.useRef(value);

  React.useEffect(() => {
    if (!focused.current) setLocal(value);
  }, [value]);

  return (
    <select
      value={local}
      className={className}
      title={title}
      onChange={e => setLocal(e.target.value)}
      onFocus={() => { focused.current = true; prevValue.current = local; }}
      onBlur={e => {
        focused.current = false;
        // Обновляем родителя ТОЛЬКО если значение реально изменилось
        if (e.target.value !== prevValue.current) {
          onChange(e.target.value);
        }
      }}
    >
      {children}
    </select>
  );
});

export default function App() {
  const [view, setView]         = useState('dashboard');
  const [role, setRole]         = useState('Врач');
  const [step, setStep]         = useState(1);
  const [isCalc, setIsCalc]     = useState(false);
  const [tab, setTab]           = useState('summary');
  const [form, setForm]         = useState(DEFAULT_FORM);
  const [report, setReport]     = useState('');
  const [history, setHistory]   = useState([]);
  const [calcHistory, setCalcHistory] = useState([]);
  const [showSources, setShowSources] = useState(false);
  const f = useCallback((patch: Record<string,any>) => {
    // Сохраняем позицию скролла ДО обновления формы
    const scrollEl = (window as any).__wizardScroll as HTMLElement | undefined;
    const savedScroll = scrollEl?.scrollTop ?? 0;

    setForm((prev: any) => {
      const next = {...prev, ...patch};
      try {
        if (next.consent_local_save !== 'Нет') {
          localStorage.setItem('cardio_draft', JSON.stringify(next));
        } else {
          localStorage.removeItem('cardio_draft');
        }
      } catch {}
      return next;
    });

    // Восстанавливаем скролл ПОСЛЕ ре-рендера
    if (savedScroll > 0) {
      requestAnimationFrame(() => {
        const el = (window as any).__wizardScroll as HTMLElement | undefined;
        if (el) el.scrollTop = savedScroll;
      });
    }
  }, []);

  // Восстановление черновика при первой загрузке
  useEffect(() => {
    try {
      const saved = localStorage.getItem('cardio_draft');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Восстанавливаем если есть хоть какие-то данные (ФИО или возраст)
        if (parsed.patient_name || parsed.age) {
          setForm(prev => ({...DEFAULT_FORM, ...parsed}));
        }
      }
    } catch {}
  }, []);



  // ── МЕТРИКИ ─────────────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const bmi = calcBMI(form.height, form.weight);
    const bpPairs = getValidBpPairs(form);
    const avgSys = avgPairs(bpPairs, 'sys');
    const avgDia = avgPairs(bpPairs, 'dia');
    const map = avgSys > 0 && avgDia > 0 ? Math.round(avgDia + (avgSys - avgDia) / 3) : 0;
    const nutritionRisk = form.figo_veg === 'Мало' || form.figo_fastfood === 'Да';

    // Полнота лабораторного блока
    const labKeys = LAB_KEYS;
    const filledLabs = labKeys.filter(k => { const v = parseNum(form[k]); return v !== null; });
    const labsCompleteness = Math.round((filledLabs.length / labKeys.length) * 100);

    // Незаполненные клинические поля (для раздела ограничений)
    const clinicalFields: [string,string][] = [
      ['smoke','Курение'], ['migraine','Мигрень'], ['spky','СПКЯ'],
      ['family_pe','ПЭ в семье'], ['family_cvd','ССЗ в семье'],
      ['pe_own','ПЭ у самой'], ['gdm','ГДМ'], ['chronic_htn','Хроническая АГ'],
      ['dm','Сахарный диабет'], ['ckd','Заболевание почек'],
      ['autoimmune','Аутоиммунные заболевания'], ['thrombosis','Тромбозы'],
    ];
    const missingClinical = clinicalFields.filter(([k]) => !form[k]).map(([,l]) => l);
    const missingLabs = labKeys.filter(k => { const v = parseNum(form[k]); return v === null; })
      .map(k => ({'cholesterol':'Холестерин','uric_acid':'МК','albumin':'Альбумин','tsh':'ТТГ','glucose':'Глюкоза','ferritin':'Ферритин'}[k] || k));

    return { bmi, avgSys, avgDia, map, bpPairsCount: bpPairs.length, nutritionRisk, labsCompleteness, filledLabsCount: filledLabs.length, missingClinical, missingLabs };
  }, [form]);

  // ── ВАЛИДАЦИЯ ───────────────────────────────────────────────────────────────
  const valid = useMemo(() => {
    const fe: Record<string,string> = {};
    const labInt: Record<string,{text:string,color:string}> = {};
    const vr = RD.validation;

    // Шаг 1: ФИО — обязательное
    if (!form.patient_name || form.patient_name.trim().length < 2)
      fe.patient_name = 'Обязательное поле';

    // Шаг 1: возраст
    const age = parseNum(form.age);
    if (age === null || age < vr.age.min || age > vr.age.max)
      fe.age = `Доступно только для ${vr.age.min}–${vr.age.max} лет`;

    const am = parseNum(form.active_min);
    if (am !== null && (am < 0 || am > 1500))
      fe.active_min = 'от 0 до 1500 мин/нед';

    // Шаг 2: антропометрия с parseNum
    const h = parseNum(form.height), w = parseNum(form.weight), wt = parseNum(form.waist);
    if (h !== null && (h < vr.height.min || h > vr.height.max))
      fe.height = `${vr.height.min}–${vr.height.max} см`;
    if (w !== null && (w < vr.weight.min || w > vr.weight.max))
      fe.weight = `${vr.weight.min}–${vr.weight.max} кг`;
    if (wt !== null && (wt < vr.waist.min || wt > vr.waist.max))
      fe.waist = `${vr.waist.min}–${vr.waist.max} см`;

    // Шаг 2: АД — полная попарная валидация
    [1,2,3].forEach(i => {
      const s = parseNum(form[`sys${i}`]), d = parseNum(form[`dia${i}`]);
      if (s !== null && (s < vr.sys.min || s > vr.sys.max))
        fe[`sys${i}`] = `${vr.sys.min}–${vr.sys.max} мм рт.ст.`;
      else if (d !== null && (d < vr.dia.min || d > vr.dia.max))
        fe[`dia${i}`] = `${vr.dia.min}–${vr.dia.max} мм рт.ст.`;
      else if (s !== null && d !== null && d >= s)
        fe[`dia${i}`] = `ДАД должно быть меньше САД (${s})`;
      else if (s !== null && d !== null && (s - d) < 20)
        fe[`dia${i}`] = `Пульсовое давление < 20 мм рт.ст. — проверьте значения`;
    });

    if (metrics.bpPairsCount === 0 && step === 2)
      fe.bp_required = 'Введите хотя бы одну валидную пару САД/ДАД';

    // Шаг 3: лаборатория с parseNum и прегравидарными порогами
    ['cholesterol','uric_acid','albumin','tsh','glucose','ferritin'].forEach(key => {
      const val = parseNum(form[key]);
      if (val === null) return;
      const v = vr[key]; if (!v) return;
      if (val < v.min || val > v.max) { fe[key] = `${v.min}–${v.max}`; return; }
      const ref = RD.lab_ref[key];
      // Ферритин: две ступени — субоптимальный (30–39) и дефицит (<30)
      if (key === 'ferritin') {
        if (val < 30) labInt[key] = { text:'↓ Дефицит (< 30 мкг/л)', color:'text-red-600' };
        else if (val < 40) labInt[key] = { text:'↓ Субоптимально (< 40 мкг/л)', color:'text-amber-600' };
        else labInt[key] = { text:'✓ Целевой (≥ 40 по МАРС 2024)', color:'text-green-600' };
      } else if (key === 'glucose') {
        if (val >= 5.1) labInt[key] = { text:'↑ Фактор риска ГСД (≥ 5,1)', color:'text-orange-600' };
        else labInt[key] = { text:'✓ В норме', color:'text-green-600' };
      } else {
        if (ref?.hi && val > ref.hi) labInt[key] = { text:'↑ Выше нормы', color:'text-orange-600' };
        else if (ref?.lo && val < ref.lo) labInt[key] = { text:'↓ Ниже нормы', color:'text-blue-600' };
        else labInt[key] = { text:'✓ В норме', color:'text-green-600' };
      }
    });

    // Блокировки по шагам
    const step1Fields = ['patient_name','age','active_min'];
    const step2Fields = ['height','weight','waist','sys1','dia1','sys2','dia2','sys3','dia3','bp_required'];
    const step3Fields = [...LAB_KEYS];
    const errorsForStep = (fields: string[]) => fields.some(k => fe[k]);
    const currentStepInvalid = step===1 ? errorsForStep(step1Fields) : step===2 ? errorsForStep(step2Fields) : errorsForStep(step3Fields);

    // Полнота базовых данных
    let filled = 0; const total = 14;
    if (parseNum(form.age)) filled++;
    if (form.family_pe) filled++;
    if (form.family_cvd) filled++;
    if (form.spky) filled++;
    if (form.coc) filled++;
    if (form.smoke) filled++;
    if (parseNum(form.height)) filled++;
    if (parseNum(form.weight)) filled++;
    if (parseNum(form.waist)) filled++;
    if (metrics.bpPairsCount >= 1) filled += 2;
    if (form.figo_veg) filled++;
    if (form.active_min !== '') filled++;
    const completeness = Math.round((filled / total) * 100);

    // Достоверность — учитывает реальную заполненность лаборатории
    let reliability = 'Низкая';
    if (completeness >= 85 && metrics.labsCompleteness === 100) reliability = 'Высокая';
    else if (completeness >= 85 && metrics.labsCompleteness > 0) reliability = 'Средняя+';
    else if (completeness >= 85) reliability = 'Средняя';

    return { ok: Object.keys(fe).length===0, fe, labInt, completeness, reliability, currentStepInvalid };
  }, [form, step, metrics]);

  // ── СКОРИНГ ─────────────────────────────────────────────────────────────────
  const scoring = useMemo(() => {
    let total = 0;
    const breakdown: {d:string,factor:string,pts:number}[] = [];
    const dom: Record<string,number> = { A:0, B:0, C:0, D:0, E:0, F:0, G:0, H:0 };
    const add = (d: string, factor: string, pts: number) => { total += pts; dom[d] += pts; breakdown.push({d, factor, pts}); };

    // A — Семья
    if (form.family_cvd === 'Да') add('A','Ранние ССЗ у родственников первой линии', 2);
    if (form.family_pe  === 'Да') add('A','Преэклампсия в семейном анамнезе', 3);
    if (Number(form.miscarriages) >= 2) add('A','Привычное невынашивание (≥ 2 выкидышей)', 3);
    if (form.pe_own === 'Да')     add('A','Преэклампсия в собственном анамнезе', 4);
    if (form.gdm === 'Да')        add('A','Гестационный диабет в анамнезе', 3);
    if (form.fgr === 'Да')        add('A','Задержка роста плода в анамнезе', 2);
    if (form.preterm === 'Да')    add('A','Преждевременные роды в анамнезе', 2);
    if (form.stillbirth === 'Да') add('A','Антенатальная гибель плода в анамнезе', 3);

    // B — Репродукция
    if (form.spky === 'Да') add('B','Синдром поликистозных яичников (СПКЯ)', 3);
    if (form.coc === 'Да' && form.bp_measured === 'Нет') add('B','Приём КОК без контроля АД', 3);
    if (form.cycle && form.cycle !== 'Регулярный (21–35 дней)') add('B','Нарушение менструального цикла', 2);

    // C — Поведение
    if (form.smoke === 'Да') add('C','Курение / никотинсодержащие изделия', 3);
    if (form.sleep === 'Менее 7 часов') add('C','Дефицит сна (менее 7 часов)', 2);
    if (form.alcohol === 'Да') add('C','Регулярное употребление алкоголя', 3);

    // D — Симптомы
    if (form.migraine === 'С аурой') add('D','Мигрень с аурой', 3);

    // E — Питание
    if (form.figo_veg === 'Мало')   add('E','Дефицит овощей и фруктов (чеклист FIGO)', 2);
    if (form.figo_fastfood === 'Да') add('E','Регулярный фастфуд / ультрапереработанное', 2);
    if (form.folate === 'Нет')       add('E','Отсутствие дотации фолатов', 3);
    if (form.fish === 'Нет')         add('E','Нет рыбы в рационе (дефицит ДГК)', 2);
    if (form.diet_restrict === 'Да') add('E','Ограничительная диета / РПП', 3);

    // F — Активность
    const am = parseNum(form.active_min);
    if (am !== null && am < 150) add('F','Недостаточная физическая активность (< 150 мин/нед)', 2);

    // G — Антропометрия и АД
    const bmi = metrics.bmi;
    if (bmi > 0 && bmi < 18.5) add('G','Дефицит массы тела (ИМТ < 18,5)', 3);
    else if (bmi >= 30) add('G','Ожирение (ИМТ ≥ 30)', 4);
    else if (bmi >= 25) add('G','Избыточная масса тела (ИМТ 25–29,9)', 2);

    const waist = parseNum(form.waist);
    if (waist !== null && waist >= 88) add('G','Выраженное абдоминальное ожирение (≥ 88 см)', 4);
    else if (waist !== null && waist >= 80) add('G','Абдоминальное ожирение (80–87 см)', 2);

    // АД — только по валидным парам; пороги по ESC Guidelines 2024 + КР МЗ РФ «АГ» 2024
    // ESC 2024: новая категория "elevated BP" = 120–139/70–89; АГ = ≥140/90
    // КР РФ сохраняет порог АГ ≥140/90; высокое нормальное = 130–139/85–89 (по КР 2024)
    if (metrics.avgSys >= 180 || metrics.avgDia >= 110)       add('G','АД ≥ 180/110 мм рт.ст. (АГ 3 ст.)', 10);
    else if (metrics.avgSys >= 160 || metrics.avgDia >= 100)  add('G','АД ≥ 160/100 мм рт.ст. (АГ 2 ст.)', 8);
    else if (metrics.avgSys >= 140 || metrics.avgDia >= 90)   add('G','АД ≥ 140/90 мм рт.ст. (АГ 1 ст.)', 6);
    else if (metrics.avgSys >= 130 || metrics.avgDia >= 85)   add('G','АД 130–139/85–89 мм рт.ст. (высокое нормальное)', 3);
    // ESC 2024: 120–129/70–84 = "elevated BP" — риск выше нормального, но ниже высокого нормального
    else if (metrics.avgSys >= 120 || metrics.avgDia >= 70)   add('G','АД 120–129/70–84 мм рт.ст. (повышенное по ESC 2024)', 1);

    // Соматический анамнез — попадает в домен A
    if (form.chronic_htn === 'Да')  add('A','Хроническая артериальная гипертензия', 4);
    if (form.dm === 'Да')           add('A','Сахарный диабет 1 или 2 типа', 4);
    if (form.ckd === 'Да')          add('A','Хроническая болезнь почек', 4);
    if (form.autoimmune === 'Да')   add('A','Аутоиммунное заболевание (СКВ, АФС)', 4);
    if (form.thrombosis === 'Да')   add('A','Тромбоз в анамнезе', 3);
    if (form.risky_meds === 'Да')   add('B','Лекарства с риском при беременности', 4);

    // H — Лаборатория
    const chol = parseNum(form.cholesterol);
    const ua   = parseNum(form.uric_acid);
    const alb  = parseNum(form.albumin);
    const tsh  = parseNum(form.tsh);
    const glc  = parseNum(form.glucose);
    const fer  = parseNum(form.ferritin);
    if (chol !== null && chol > 5.2)         add('H','Гиперхолестеринемия (> 5,2 ммоль/л)', 2);
    if (ua   !== null && ua   > 360)          add('H','Гиперурикемия (> 360 мкмоль/л)', 2);
    if (alb  !== null && alb  < 35)           add('H','Гипоальбуминемия (< 35 г/л)', 4);
    if (tsh  !== null && (tsh < 0.4 || tsh > 2.5)) add('H','Отклонение ТТГ от нормы', 3);
    if (glc  !== null && glc  >= 5.1)          add('H','Глюкоза натощак ≥ 5,1 ммоль/л (фактор риска ГСД)', 3);
    // Ферритин: МАРС 2024 v3.1 — целевой уровень в прегравидарном периоде >40 мкг/л
    if (fer !== null && fer < 30)      add('H','Дефицит железа: ферритин < 30 мкг/л', 3);
    else if (fer !== null && fer < 40) add('H','Субоптимальный ферритин 30–39 мкг/л (целевой ≥ 40 по МАРС 2024)', 1);

    breakdown.sort((a, b) => b.pts - a.pts);
    const top5 = breakdown.slice(0, 5);

    const activeRF  = RD.red_flags.filter(rf => rf.cond(form, metrics));
    const activeCC  = RD.critical_combinations.filter(cc => cc.cond(form, metrics));
    const activeRecs = RD.recs.filter(r => r.cond(form, metrics));

    let riskCat = 'Низкий';
    if (total >= 6)  riskCat = 'Умеренный';
    if (total >= 12) riskCat = 'Повышенный';
    if (total >= 18) riskCat = 'Высокий';
    if (activeCC.length > 0 && riskCat !== 'Высокий')
      riskCat = riskCat==='Низкий' ? 'Умеренный' : riskCat==='Умеренный' ? 'Повышенный' : 'Высокий';

    return { total, breakdown, dom, top5, activeRF, activeCC, activeRecs, riskCat };
  }, [form, metrics]);

  // ── ГЕНЕРАЦИЯ ЗАКЛЮЧЕНИЯ ─────────────────────────────────────────────────────
  const generateReport = useCallback(() => {
    const d = new Date().toLocaleDateString('ru-RU');
    const age = form.age;
    const name = form.patient_name || 'Пациентка';
    const bmi = metrics.bmi;
    const bp = metrics.avgSys > 0 ? `${metrics.avgSys}/${metrics.avgDia} мм рт.ст.` : 'не оценивалось';

    let t = `ЗАКЛЮЧЕНИЕ ПРЕГРАВИДАРНОГО СКРИНИНГА\n`;
    t += `Дата: ${d}\n`;
    t += `Пациентка: ${name}, ${age} лет\n`;
    if (bmi > 0) t += `ИМТ: ${bmi} кг/м²; АД (среднее из ${metrics.bpPairsCount} изм.): ${bp}\n`;
    t += `\n`;

    t += `ЗАКЛЮЧЕНИЕ\n`;
    t += `По результатам структурированного прегравидарного скрининга выявлена категория риска:\n`;
    t += `${scoring.riskCat.toUpperCase()} (интегральный балл ${scoring.total}).\n\n`;

    const tacticsMap: Record<string,string> = {
      'Низкий': 'Рекомендовано плановое наблюдение акушера-гинеколога. Стандартный объём прегравидарной подготовки.',
      'Умеренный': 'Рекомендована коррекция выявленных модифицируемых факторов риска до наступления беременности. Повторная оценка через 1-3 месяца.',
      'Повышенный': 'Рекомендовано расширенное обследование. Консультация профильных специалистов до зачатия. Индивидуальный план прегравидарной подготовки.',
      'Высокий': 'Наступление беременности без предварительной коррекции факторов риска нежелательно. Обязательна консультация кардиолога и акушера-гинеколога. Мультидисциплинарное ведение.',
    };
    t += `${tacticsMap[scoring.riskCat] || ''}\n\n`;

    if (scoring.activeRF.length) {
      t += `ТРЕВОЖНЫЕ ПРИЗНАКИ (требуют первоочередного внимания):\n`;
      scoring.activeRF.forEach(rf => {
        t += `- ${rf.title} [${rf.urgency}]: ${rf.action}\n`;
      });
      t += `\n`;
    }

    if (scoring.top5.length) {
      t += `ВЕДУЩИЕ ФАКТОРЫ РИСКА:\n`;
      scoring.top5.forEach(f => { t += `- ${f.factor}\n`; });
      t += `\n`;
    } else {
      t += `Значимых факторов риска не выявлено.\n\n`;
    }

    if (scoring.activeRecs.length) {
      t += `РЕКОМЕНДАЦИИ:\n`;
      scoring.activeRecs.forEach(r => {
        t += `${r.domain}:\n`;
        r.actions.slice(0,3).forEach(a => { t += `- ${a}\n`; });
      });
      t += `\n`;
    }

    if (metrics.missingLabs.length > 0) {
      t += `Лабораторные данные не предоставлены: ${metrics.missingLabs.join(', ')}. После получения результатов рекомендуется повторная оценка.\n\n`;
    }

    t += `Следующая оценка: через 1-3 месяца или при изменении клинического статуса.\n`;
    t += `\nВрач: ______________________________  Подпись: ________\n`;
    return t;
  }, [form, scoring, valid, metrics]);

  const isOutlier = form.age !== '' && (Number(form.age) < RD.target_age.min || Number(form.age) > RD.target_age.max);

  // ── HEADER ──────────────────────────────────────────────────────────────────
  const Header = () => (
    <header className="bg-white border-b px-4 md:px-6 h-14 flex justify-between items-center shrink-0 z-50">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center text-white font-black text-xs">КП</div>
        <div className="hidden sm:block">
          <p className="text-sm font-black text-slate-900 leading-none">Кардио-репродуктивный паспорт</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Версия {RD.version}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 border-l pl-3 md:pl-4">
        {['Врач','Пациентка'].map(r => (
          <button key={r} onClick={() => { setRole(r); setView('dashboard'); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${role===r ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>{r}</button>
        ))}
      </div>
    </header>
  );

  // ── DASHBOARD ───────────────────────────────────────────────────────────────
  const Dashboard = () => (
    <div className="overflow-y-auto h-full bg-slate-50">

      {/* Черновик / предупреждение */}
      {(form.age || isOutlier) && (
        <div className="max-w-5xl mx-auto px-4 md:px-8 pt-4 space-y-2">
          {form.age && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <History className="w-4 h-4 text-blue-500 shrink-0"/>
                <p className="text-sm text-blue-900 font-bold">{form.patient_name ? `Черновик: ${form.patient_name}` : `Черновик (возраст ${form.age} лет)`}</p>
                <p className="text-xs text-blue-500 hidden sm:block">— восстановлен из предыдущей сессии</p>
              </div>
              <button onClick={() => { try { localStorage.removeItem('cardio_draft'); } catch {} setForm(DEFAULT_FORM); }}
                className="text-[10px] font-black text-blue-400 hover:text-red-500 uppercase shrink-0 transition">Очистить</button>
            </div>
          )}
          {isOutlier && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5"/>
              <p className="text-sm text-amber-800"><b>Возраст вне целевой группы.</b> Алгоритм валидирован для женщин 22–25 лет.</p>
            </div>
          )}
        </div>
      )}

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 pt-6 pb-2">
        <div className="relative rounded-3xl overflow-hidden bg-slate-900" style={{minHeight:'320px'}}>
          {/* Декоративные круги */}
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-blue-600 opacity-10"/>
          <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-purple-600 opacity-10"/>
          <div className="absolute top-1/2 right-1/4 w-40 h-40 rounded-full bg-teal-500 opacity-5"/>

          <div className="relative z-10 p-6 md:p-12 flex flex-col md:flex-row gap-8 items-start md:items-center">
            {/* Левая часть */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-blue-300 border border-blue-700 bg-blue-900/50">
                  Для женщин 22–25 лет
                </span>
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-400 border border-slate-700 bg-slate-800/50">
                  Версия {RD.version}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-white leading-tight mb-3 tracking-tight">
                Кардио-репродуктивный<br/>
                <span className="text-blue-400">паспорт</span>
              </h1>
              <p className="text-slate-400 text-sm md:text-base leading-relaxed mb-6 max-w-lg">
                Структурированный прегравидарный скрининг кардио-метаболических, нутритивных и репродуктивных рисков. Инструмент поддержки врачебного решения.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => { setView('wizard'); setStep(1); setTab('summary'); setReport(''); }}
                  className="flex items-center gap-2.5 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3.5 rounded-xl font-black uppercase text-xs tracking-wide transition">
                  <FileCheck className="w-4 h-4"/> Начать оценку
                </button>
                <button
                  onClick={() => { setForm(DEMO_FORM); setView('wizard'); setStep(1); setTab('summary'); setReport(''); }}
                  className="flex items-center gap-2 border border-slate-600 hover:border-slate-500 text-slate-400 hover:text-white px-5 py-3.5 rounded-xl font-black uppercase text-xs tracking-wide transition">
                  <Activity className="w-4 h-4"/> Демо
                </button>
              </div>
              <p className="mt-4 text-[10px] text-slate-600 leading-relaxed max-w-lg">
                ⚕ Инструмент поддержки врачебного решения. Не заменяет очную консультацию специалиста. Лабораторные пороги — прегравидарные целевые значения (МАРС 2024, ВОЗ 2013). Весовые коэффициенты требуют клинической валидации.
              </p>
            </div>

            {/* Правая часть — иллюстративные метрики */}
            <div className="shrink-0 grid grid-cols-2 gap-3 w-full md:w-auto md:min-w-[220px]">
              {[
                { label:'Доменов риска', value:'8', sub:'A–H', color:'text-blue-400' },
                { label:'Факторов риска', value:'30+', sub:'оцениваемых', color:'text-teal-400' },
                { label:'Источников', value:'19', sub:'нормативных', color:'text-purple-400' },
                { label:'Шагов опроса', value:'3', sub:'анкета', color:'text-amber-400' },
              ].map(m => (
                <div key={m.label} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                  <p className={`text-2xl font-black ${m.color}`}>{m.value}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{m.sub}</p>
                  <p className="text-[10px] text-slate-400 mt-1 leading-tight">{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 4 ДОМЕНА ──────────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 pt-5">
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: HeartPulse, accent:'bg-rose-500', soft:'bg-rose-50', text:'text-rose-600', title:'Кардиометаболический риск',
              items:['ИМТ и масса тела','Окружность талии','Артериальное давление','Липидный профиль'] },
            { icon: Baby, accent:'bg-purple-500', soft:'bg-purple-50', text:'text-purple-600', title:'Репродуктивный риск',
              items:['СПКЯ, цикл','Акушерский анамнез','КОК и сосуды'] },
            { icon: Utensils, accent:'bg-emerald-500', soft:'bg-emerald-50', text:'text-emerald-700', title:'Нутритивный риск',
              items:['Чеклист FIGO','Дотация фолатов','Ферритин, альбумин'] },
            { icon: Cigarette, accent:'bg-orange-500', soft:'bg-orange-50', text:'text-orange-600', title:'Поведенческий риск',
              items:['Курение / алкоголь','Режим сна','Физическая активность'] },
          ].map(({ icon: Icon, accent, soft, text, title, items }) => (
            <div key={title} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className={`h-1.5 ${accent}`}/>
              <div className="p-4 md:p-5">
                <div className={`w-9 h-9 ${soft} rounded-xl flex items-center justify-center mb-3`}>
                  <Icon className={`w-4.5 h-4.5 ${text}`} style={{width:'18px',height:'18px'}}/>
                </div>
                <p className={`font-black text-xs md:text-sm leading-snug mb-2.5 ${text}`}>{title}</p>
                <ul className="space-y-1">
                  {items.map(it => (
                    <li key={it} className="flex items-start gap-1.5 text-xs text-slate-500">
                      <span className={`w-1 h-1 rounded-full ${accent} mt-1.5 shrink-0`}/>
                      {it}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── ИСТОРИЯ РАСЧЁТОВ ──────────────────────────────────────────────────── */}
      {calcHistory.length > 0 && (
        <div className="max-w-5xl mx-auto px-4 md:px-8 pt-5">
          <div className="bg-white rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                <History className="w-4 h-4 text-blue-500"/> История расчётов
              </h3>
              <button onClick={() => setCalcHistory([])} className="text-[10px] text-slate-400 hover:text-red-500 font-black transition uppercase">Очистить</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left min-w-[580px]">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-5 py-3 pr-4">Пациентка</th>
                    <th className="py-3 pr-4">Дата</th>
                    <th className="py-3 pr-4 text-center">Балл</th>
                    <th className="py-3 pr-4">Категория</th>
                    <th className="py-3 pr-4">ИМТ</th>
                    <th className="py-3 pr-5">Достоверность</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {calcHistory.map((c, i) => {
                    const rc = riskColors(c.riskCat);
                    return (
                      <tr key={i} className="hover:bg-slate-50 transition">
                        <td className="px-5 py-3 pr-4">
                          <p className="font-bold text-slate-800">{c.name || '—'}</p>
                          <p className="text-[10px] text-slate-400">{c.age} лет</p>
                        </td>
                        <td className="py-3 pr-4 text-slate-500 whitespace-nowrap">
                          {new Date(c.date).toLocaleDateString('ru-RU')} {new Date(c.date).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}
                        </td>
                        <td className="py-3 pr-4 text-center">
                          <span className="text-lg font-black text-blue-700">{c.score}</span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`px-2.5 py-1 rounded-lg font-black text-[11px] uppercase ${rc.bg} ${rc.text} border ${rc.border}`}>
                            {c.riskCat}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-slate-600">{c.bmi}</td>
                        <td className="py-3 pr-5">
                          <span className={`font-black text-[11px] ${c.reliability==='Высокая'?'text-green-600':c.reliability==='Средняя+'?'text-teal-600':c.reliability==='Средняя'?'text-amber-600':'text-slate-400'}`}>
                            {c.reliability}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── НОРМАТИВНАЯ БАЗА ──────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 pt-5 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Нормативная база */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-500"/> Нормативная база
              </h3>
              <button onClick={() => setShowSources(true)} className="text-[10px] text-blue-600 font-black hover:text-blue-800 transition">Все источники →</button>
            </div>
            <div className="space-y-1.5">
              {RD.sources.slice(0,6).map(s => (
                <div key={s.short} className="flex items-start gap-2 text-xs text-slate-600 py-1.5 border-b border-slate-50 last:border-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0"/>
                  <span className="leading-snug">{s.short}</span>
                </div>
              ))}
              <button onClick={() => setShowSources(true)} className="text-[10px] text-slate-400 hover:text-blue-600 font-bold mt-1 transition">
                + ещё {RD.sources.length - 6} источников
              </button>
            </div>
          </div>

          {/* Требования + шкала риска */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h3 className="font-black text-slate-800 text-sm flex items-center gap-2 mb-3">
                <Database className="w-4 h-4 text-slate-400"/> Требования к данным
              </h3>
              <div className="space-y-3">
                <div className="flex gap-3 p-3 bg-slate-50 rounded-xl">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0 pt-0.5 w-16">Базовый</span>
                  <span className="text-xs text-slate-600 leading-relaxed">Анамнез, антропометрия, АД — 3 шага</span>
                </div>
                <div className="flex gap-3 p-3 bg-blue-50 rounded-xl">
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest shrink-0 pt-0.5 w-16 leading-tight">Расши-<br/>ренный</span>
                  <span className="text-xs text-slate-600 leading-relaxed">Дополнительно: ТТГ, глюкоза, ферритин, холестерин, МК, альбумин</span>
                </div>
              </div>
            </div>

            {/* Шкала риска */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h3 className="font-black text-slate-800 text-sm mb-3">Шкала категорий риска</h3>
              <div className="space-y-2">
                {[
                  {cat:'Низкий', range:'0–5 балл.', bar:'w-1/4', col:'bg-green-500', text:'text-green-700'},
                  {cat:'Умеренный', range:'6–11 балл.', bar:'w-2/4', col:'bg-amber-400', text:'text-amber-700'},
                  {cat:'Повышенный', range:'12–17 балл.', bar:'w-3/4', col:'bg-orange-500', text:'text-orange-700'},
                  {cat:'Высокий', range:'≥ 18 балл.', bar:'w-full', col:'bg-red-500', text:'text-red-700'},
                ].map(r => (
                  <div key={r.cat} className="flex items-center gap-3">
                    <span className={`text-[11px] font-black w-20 shrink-0 ${r.text}`}>{r.cat}</span>
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${r.col} ${r.bar} rounded-full`}/>
                    </div>
                    <span className="text-[10px] text-slate-400 w-16 text-right shrink-0">{r.range}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Нормативная база */}
      {showSources && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white">
              <h2 className="font-black text-slate-900 text-sm uppercase">Нормативная база алгоритма</h2>
              <button onClick={() => setShowSources(false)} className="p-2 rounded-full hover:bg-slate-100"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6 space-y-3">
              {RD.sources.map((s,i) => (
                <div key={s.short} className="flex gap-3 p-4 border border-slate-100 rounded-xl bg-slate-50 hover:bg-white transition">
                  <span className="text-[10px] font-black text-slate-400 w-5 shrink-0 mt-0.5">{i+1}</span>
                  <div>
                    <p className="text-[10px] font-black text-blue-700 uppercase tracking-wide mb-1">{s.short}</p>
                    <p className="text-xs text-slate-700 leading-relaxed">{s.full}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Подсказка ошибки под полем
  const Err = ({ k }) => valid.fe[k]
    ? <p className="mt-1 text-[11px] text-red-600 font-bold flex items-center gap-1">
        <span className="inline-block w-3 h-3 rounded-full bg-red-500 text-white text-[8px] font-black flex items-center justify-center shrink-0">!</span>
        Допустимо: {valid.fe[k]}
      </p>
    : null;

  const errBorder = (k) => valid.fe[k] ? 'border-red-400 bg-red-50 focus:border-red-500' : '';

  // ── WIZARD ──────────────────────────────────────────────────────────────────
  const sel = 'w-full p-3 border rounded-xl text-sm bg-slate-50 font-medium outline-none focus:border-blue-500 focus:bg-white transition';
  const inp = 'w-full p-3 border rounded-xl text-sm bg-slate-50 font-medium outline-none focus:border-blue-500 focus:bg-white transition no-spin';
  const lbl = 'text-xs font-black text-slate-600 block mb-1.5';

  const Wizard = () => (
    <div className="flex flex-col h-full">
      {/* Прогресс */}
      <div className="bg-white border-b px-4 md:px-8 py-3 shrink-0 flex flex-col gap-2 shadow-sm">
        <div className="flex gap-2 items-center">
          {[
            {n:1,l:'Анамнез'},
            {n:2,l:'Антропометрия'},
            {n:3,l:'Лаборатория'},
          ].map(({n,l}) => (
            <React.Fragment key={n}>
              <div className="flex items-center gap-1.5 shrink-0">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition ${n===step ? 'bg-blue-600 text-white' : n < step ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  {n < step ? '✓' : n}
                </div>
                <span className={`text-[11px] font-black transition ${n===step ? 'text-blue-700' : n < step ? 'text-green-600' : 'text-slate-300'}`}>{l}</span>
              </div>
              {n < 3 && <div className={`flex-1 h-0.5 rounded-full ${n < step ? 'bg-green-400' : 'bg-slate-100'}`}/>}
            </React.Fragment>
          ))}
          {isOutlier && <span className="text-[10px] text-amber-600 font-black bg-amber-50 px-2 py-1 rounded-lg shrink-0 ml-2">Возраст вне нормы</span>}
        </div>
        {/* Почему заблокирована кнопка */}
        {valid.currentStepInvalid && (() => {
          const msgs: string[] = [];
          if (valid.fe.patient_name) msgs.push('ФИО пациентки');
          if (valid.fe.age) msgs.push('возраст вне диапазона 22–25 лет');
          if (valid.fe.height || valid.fe.weight || valid.fe.waist) msgs.push('антропометрия вне допустимых значений');
          if ([1,2,3].some(i => valid.fe[`sys${i}`] || valid.fe[`dia${i}`])) msgs.push('некорректные значения АД');
          if (valid.fe.bp_required) msgs.push('введите хотя бы одно измерение АД');
          return msgs.length > 0 ? (
            <p className="text-[10px] text-red-500 font-bold flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-full bg-red-500 text-white flex items-center justify-center text-[8px] shrink-0">!</span>
              Необходимо исправить: {msgs.join(', ')}
            </p>
          ) : null;
        })()}
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-36" style={{overscrollBehavior:'contain'}}
        ref={el => { if (el) (window as any).__wizardScroll = el; }}>
        <div className="max-w-3xl mx-auto space-y-6">

          {step === 1 && (
            <div className="space-y-5">
              {/* Общие сведения */}
              <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200">
                <h3 className="font-black text-xs uppercase text-slate-400 tracking-widest border-b pb-3 mb-4">Общие сведения</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className={lbl}>ФИО пациентки <span className="text-red-500">*</span></label>
                    <StableTextInput value={form.patient_name} onChange={v=>f({patient_name:v})}
                      className={`${inp} ${errBorder('patient_name')}`} placeholder="Фамилия Имя Отчество"/>
                    <Err k="patient_name"/>
                  </div>
                  <div>
                    <label className={lbl}>Возраст (лет) <span className="text-red-500">*</span></label>
                    <NumInput value={form.age} onChange={v=>f({age:v})} className={`${inp} text-center font-black ${errBorder('age')}`}/>
                    <Err k="age"/>
                    {!valid.fe.age && form.age && <p className="mt-1 text-[10px] text-green-600 font-bold">✓ Возраст в допустимом диапазоне</p>}
                  </div>
                </div>
              </div>

              {/* Семейный анамнез */}
              <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200">
                <h3 className="font-black text-xs uppercase text-slate-400 tracking-widest border-b pb-3 mb-4">Семейный анамнез</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className={lbl}>ССЗ у родственников первой линии</label><StableSelect value={form.family_cvd} onChange={v=>f({family_cvd:v})} className={sel}><option value="">— Не указано</option><option>Нет</option><option>Да</option></StableSelect></div>
                  <div><label className={lbl}>Преэклампсия у матери или сестёр</label><StableSelect value={form.family_pe} onChange={v=>f({family_pe:v})} className={sel}><option value="">— Не указано</option><option>Нет</option><option>Да</option></StableSelect></div>
                </div>
              </div>

              {/* Репродуктивный статус */}
              <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200">
                <h3 className="font-black text-xs uppercase text-slate-400 tracking-widest border-b pb-3 mb-4">Репродуктивный статус</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className={lbl}>Регулярность менструального цикла</label><StableSelect value={form.cycle} onChange={v=>f({cycle:v})} className={sel}><option value="">— Не указано</option><option>Регулярный (21–35 дней)</option><option>Нерегулярный (&gt; 35 или &lt; 21 дня)</option><option>Отсутствует &gt; 3 месяцев</option></StableSelect></div>
                  <div><label className={lbl}>СПКЯ</label><StableSelect value={form.spky} onChange={v=>f({spky:v})} className={sel}><option value="">— Не указано</option><option>Нет</option><option>Да</option></StableSelect></div>
                  <div><label className={lbl}>Приём КОК</label><StableSelect value={form.coc} onChange={v=>f({coc:v})} className={sel}><option value="">— Не указано</option><option>Нет</option><option>Да</option></StableSelect></div>
                  <div><label className={lbl}>Выкидыши в анамнезе</label><StableSelect value={form.miscarriages} onChange={v=>f({miscarriages:v})} className={sel}><option value="">— Не указано</option><option value="0">Нет</option><option value="1">1</option><option value="2">≥ 2</option></StableSelect></div>
                  <div><label className={lbl}>Болезненные менструации</label><StableSelect value={form.dysmenorrhea} onChange={v=>f({dysmenorrhea:v})} className={sel}><option value="">— Не указано</option><option>Нет</option><option>Умеренные</option><option>Тяжёлые (требуют анальгетиков)</option></StableSelect></div>
                  {form.coc === 'Да' && (
                    <div className="sm:col-span-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <label className={lbl}>АД контролируется на фоне КОК?</label>
                      <StableSelect value={form.bp_measured} onChange={v=>f({bp_measured:v})} className={sel}><option value="">— Не указано</option><option value="Да">Да</option><option value="Нет">Нет</option></StableSelect>
                    </div>
                  )}
                </div>
              </div>

              {/* Симптомы + поведение */}
              <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200">
                <h3 className="font-black text-xs uppercase text-slate-400 tracking-widest border-b pb-3 mb-4">Симптомы и образ жизни</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className={lbl}>Мигрень</label><StableSelect value={form.migraine} onChange={v=>f({migraine:v})} className={sel}><option value="">— Не указано</option><option>Нет</option><option>Без ауры</option><option>С аурой</option></StableSelect></div>
                  <div><label className={lbl}>Курение (сигареты, вейпы, кальян)</label><StableSelect value={form.smoke} onChange={v=>f({smoke:v})} className={sel}><option value="">— Не указано</option><option>Нет</option><option>Да</option></StableSelect></div>
                  <div><label className={lbl}>Алкоголь регулярно</label><StableSelect value={form.alcohol} onChange={v=>f({alcohol:v})} className={sel}><option value="">— Не указано</option><option>Нет</option><option>Да</option></StableSelect></div>
                  <div><label className={lbl}>Продолжительность ночного сна</label><StableSelect value={form.sleep} onChange={v=>f({sleep:v})} className={sel}><option value="">— Не указано</option><option>7–9 часов</option><option>Менее 7 часов</option><option>Более 9 часов</option></StableSelect></div>
                </div>
              </div>

              {/* Питание и физактивность */}
              <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200">
                <h3 className="font-black text-xs uppercase text-slate-400 tracking-widest border-b pb-3 mb-4">Питание и физическая активность</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className={lbl}>Овощи и фрукты (чеклист FIGO)</label><StableSelect value={form.figo_veg} onChange={v=>f({figo_veg:v})} className={sel}><option value="">— Не указано</option><option value="Достаточно">Достаточно (≥ 400 г/сут)</option><option value="Мало">Мало (менее нормы)</option></StableSelect></div>
                  <div><label className={lbl}>Регулярный фастфуд / ультрапереработанное</label><StableSelect value={form.figo_fastfood} onChange={v=>f({figo_fastfood:v})} className={sel}><option value="">— Не указано</option><option>Нет</option><option>Да</option></StableSelect></div>
                  <div><label className={lbl}>Рыба в рационе ≥ 1–2 раз/нед</label><StableSelect value={form.fish} onChange={v=>f({fish:v})} className={sel}><option value="">— Не указано</option><option>Да</option><option>Нет</option></StableSelect></div>
                  <div><label className={lbl}>Ограничительная диета / РПП</label><StableSelect value={form.diet_restrict} onChange={v=>f({diet_restrict:v})} className={sel}><option value="">— Не указано</option><option>Нет</option><option>Да</option></StableSelect></div>
                  <div><label className={lbl}>Фолиевая кислота</label><StableSelect value={form.folate} onChange={v=>f({folate:v})} className={sel}><option value="">— Не указано</option><option value="Да">Да, принимаю</option><option value="Нет">Нет</option></StableSelect></div>
                  <div>
                    <label className={lbl}>Физическая активность (мин/нед)</label>
                    <NumInput value={form.active_min} onChange={v=>f({active_min:v})} className={`${inp} ${errBorder('active_min')}`} placeholder="Напр. 150"/>
                    <Err k="active_min"/>
                  </div>
                </div>
              </div>

              {/* Акушерский анамнез — всегда открыт */}
              <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between border-b pb-3 mb-4">
                  <h3 className="font-black text-xs uppercase text-slate-400 tracking-widest">Акушерский анамнез</h3>
                  <span className="text-[10px] text-slate-400">При наличии прошлых беременностей</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className={lbl}>Преэклампсия у самой пациентки</label><StableSelect value={form.pe_own} onChange={v=>f({pe_own:v})} className={sel}><option value="">— Не указано</option><option>Нет</option><option>Да</option></StableSelect></div>
                  <div><label className={lbl}>Гестационный диабет</label><StableSelect value={form.gdm} onChange={v=>f({gdm:v})} className={sel}><option value="">— Не указано</option><option>Нет</option><option>Да</option></StableSelect></div>
                  <div><label className={lbl}>Задержка роста плода</label><StableSelect value={form.fgr} onChange={v=>f({fgr:v})} className={sel}><option value="">— Не указано</option><option>Нет</option><option>Да</option></StableSelect></div>
                  <div><label className={lbl}>Преждевременные роды</label><StableSelect value={form.preterm} onChange={v=>f({preterm:v})} className={sel}><option value="">— Не указано</option><option>Нет</option><option>Да</option></StableSelect></div>
                  <div><label className={lbl}>Антенатальная гибель плода</label><StableSelect value={form.stillbirth} onChange={v=>f({stillbirth:v})} className={sel}><option value="">— Не указано</option><option>Нет</option><option>Да</option></StableSelect></div>
                </div>
              </div>

              {/* Соматический анамнез — всегда открыт */}
              <div className={`p-5 md:p-6 rounded-2xl border ${(form.chronic_htn==='Да'||form.dm==='Да'||form.ckd==='Да'||form.autoimmune==='Да'||form.thrombosis==='Да'||form.risky_meds==='Да') ? 'border-amber-200 bg-amber-50/30' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                  <h3 className="font-black text-xs uppercase text-slate-400 tracking-widest">Соматический анамнез</h3>
                  {(form.chronic_htn==='Да'||form.dm==='Да'||form.ckd==='Да'||form.autoimmune==='Да'||form.thrombosis==='Да'||form.risky_meds==='Да') && (
                    <span className="text-[10px] text-amber-700 font-bold bg-amber-100 px-2 py-1 rounded-lg">Выявлены факторы высокого риска</span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className={lbl}>Хроническая АГ</label><StableSelect value={form.chronic_htn} onChange={v=>f({chronic_htn:v})} className={sel}><option value="">— Не указано</option><option>Нет</option><option>Да</option></StableSelect></div>
                  <div><label className={lbl}>Сахарный диабет 1 или 2 типа</label><StableSelect value={form.dm} onChange={v=>f({dm:v})} className={sel}><option value="">— Не указано</option><option>Нет</option><option>Да</option></StableSelect></div>
                  <div><label className={lbl}>Заболевание почек (ХБП)</label><StableSelect value={form.ckd} onChange={v=>f({ckd:v})} className={sel}><option value="">— Не указано</option><option>Нет</option><option>Да</option></StableSelect></div>
                  <div><label className={lbl}>Аутоиммунные болезни (СКВ, АФС)</label><StableSelect value={form.autoimmune} onChange={v=>f({autoimmune:v})} className={sel}><option value="">— Не указано</option><option>Нет</option><option>Да</option></StableSelect></div>
                  <div className="sm:col-span-2">
                    <label className={lbl}>Тромбоз в анамнезе (вен или артерий)</label>
                    <StableSelect value={form.thrombosis} onChange={v=>f({thrombosis:v})} className={sel}>
                      <option value="">— Не указано</option><option>Нет</option><option>Да</option>
                    </StableSelect>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={lbl}>Лекарства с риском при беременности</label>
                    <StableSelect value={form.risky_meds} onChange={v=>f({risky_meds:v})} className={sel}>
                      <option value="">— Не указано</option>
                      <option value="Нет">Нет</option>
                      <option value="Да">Да (статины, иАПФ/БРА, ретиноиды)</option>
                      <option value="Да">Да (противоэпилептические препараты)</option>
                      <option value="Да">Да (антикоагулянты прямые/непрямые)</option>
                      <option value="Да">Да (психотропные препараты)</option>
                      <option value="Да">Да (другие)</option>
                    </StableSelect>
                    <p className="text-[10px] text-slate-400 mt-1">Статины, иАПФ, БРА, сартаны, ретиноиды, вальпроаты, карбамазепин, варфарин, НОАК, метотрексат</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              {/* Антропометрия (Домен G) */}
              <div className="bg-white p-5 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between border-b pb-3 mb-5">
                  <h3 className="font-black text-xs uppercase text-slate-500 tracking-widest">Антропометрия</h3>
                  {metrics.bmi > 0 && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-black">
                      ИМТ: {metrics.bmi} {metrics.bmi < 18.5 ? '↓ Дефицит' : metrics.bmi < 25 ? '✓ Норма' : metrics.bmi < 30 ? '↑ Избыток' : '↑↑ Ожирение'}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[{k:'height',l:'Рост (см)'},{k:'weight',l:'Вес (кг)'},{k:'waist',l:'Талия (см)'}].map(({k,l}) => (
                    <div key={k}>
                      <label className={lbl}>{l}</label>
                      <NumInput value={form[k]} onChange={v=>f({[k]:v})} className={`${inp} text-center font-black ${errBorder(k)}`}/>
                      <Err k={k}/>
                    </div>
                  ))}
                </div>
              </div>

              {/* АД */}
              <div className="bg-white p-5 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between border-b pb-3 mb-5">
                  <div>
                    <h3 className="font-black text-xs uppercase text-slate-500 tracking-widest">Офисное АД</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Три измерения с интервалом 1–2 мин в состоянии покоя повышают точность</p>
                  </div>
                  {metrics.bpPairsCount > 0 && (
                    <span className={`text-xs px-3 py-1 rounded-full font-black shrink-0 ${metrics.avgSys >= 140 ? 'bg-red-100 text-red-700' : metrics.avgSys >= 130 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                      Среднее: {metrics.avgSys}/{metrics.avgDia}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[1,2,3].map(i => (
                    <div key={i} className="p-4 border rounded-xl bg-slate-50 space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Измерение {i}</p>
                      <div className="flex gap-2 items-center">
                        <div className="w-full">
                          <NumInput value={form[`sys${i}`]} onChange={v=>f({[`sys${i}`]:v})} placeholder="САД" className={`w-full p-2.5 border rounded-lg font-black text-center outline-none focus:border-blue-500 text-sm ${valid.fe[`sys${i}`] ? 'border-red-400 bg-red-50' : 'bg-white'}`}/>
                          <Err k={`sys${i}`}/>
                        </div>
                        <span className="text-slate-300 font-black shrink-0">/</span>
                        <div className="w-full">
                          <NumInput value={form[`dia${i}`]} onChange={v=>f({[`dia${i}`]:v})} placeholder="ДАД" className={`w-full p-2.5 border rounded-lg font-black text-center outline-none focus:border-blue-500 text-sm ${valid.fe[`dia${i}`] ? 'border-red-400 bg-red-50' : 'bg-white'}`}/>
                          <Err k={`dia${i}`}/>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {valid.fe.bp_required && (
                  <p className="mt-3 text-xs text-red-600 font-bold flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center shrink-0">!</span>
                    {valid.fe.bp_required}
                  </p>
                )}
                {!valid.fe.bp_required && <p className="text-[10px] text-slate-400 mt-3">Вводите в мм рт.ст. Среднее рассчитывается автоматически по заполненным измерениям.</p>}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="bg-white p-5 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-black text-xs uppercase text-slate-500 tracking-widest border-b pb-3 mb-5">Лабораторные данные</h3>
                <p className="text-xs text-slate-500 mb-6 italic">Необязательный блок. При наличии анализов повышает достоверность до «Высокой».</p>

                <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 transition-opacity ${form.labs_status==='no_labs' ? 'opacity-30 pointer-events-none' : ''}`}>
                  {[
                    { k:'cholesterol', l:'Общий холестерин', ref:'Норма: < 5,2 ммоль/л', unit:'ммоль/л' },
                    { k:'uric_acid',   l:'Мочевая кислота', ref:'Норма: 155–360 мкмоль/л', unit:'мкмоль/л' },
                    { k:'albumin',     l:'Альбумин сыворотки', ref:'Норма: 35–52 г/л', unit:'г/л' },
                    { k:'tsh',         l:'ТТГ', ref:'Цель до зачатия: 0,4–2,5 мЕд/л', unit:'мЕд/л' },
                    { k:'glucose',     l:'Глюкоза натощак', ref:'Порог риска ГСД: < 5,1 ммоль/л', unit:'ммоль/л' },
                    { k:'ferritin',    l:'Ферритин', ref:'Цель до зачатия: ≥ 40 мкг/л', unit:'мкг/л' },
                  ].map(({k,l,ref,unit}) => {
                    const vi = valid.labInt[k];
                    return (
                      <div key={k} className="space-y-1.5">
                        <label className={lbl}>{l}</label>
                        <div className="relative">
                          <NumInput value={form[k]} onChange={v=>f({[k]:v, labs_status:'filled'})}
                            mode="decimal"
                            className={`${inp} pr-14 text-center ${errBorder(k)}`}/>
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 font-bold">{unit}</span>
                        </div>
                        <p className="text-[9px] text-slate-400 font-bold">{ref}</p>
                        <Err k={k}/>
                        {!valid.fe[k] && vi && <p className={`text-[10px] font-black uppercase ${vi.color}`}>{vi.text}</p>}
                      </div>
                    );
                  })}
                </div>

                <label className="flex items-center gap-3 mt-6 cursor-pointer pt-5 border-t border-slate-100">
                  <div className="relative">
                    <input type="checkbox" checked={form.labs_status==='no_labs'} className="w-5 h-5 appearance-none border-2 border-slate-300 rounded-md checked:bg-blue-600 checked:border-blue-600 transition"
                      onChange={e=>f({labs_status:e.target.checked?'no_labs':'not_filled', cholesterol:'', uric_acid:'', albumin:'', tsh:'', glucose:'', ferritin:''})}/>
                    <CheckCircle2 className={`absolute inset-0 m-auto w-3.5 h-3.5 text-white transition-opacity ${form.labs_status==='no_labs' ? 'opacity-100' : 'opacity-0'}`}/>
                  </div>
                  <span className="text-sm font-black text-slate-700">Лабораторные данные отсутствуют</span>
                </label>
              </div>

              {/* Полнота и достоверность */}
              <div className="bg-white p-5 md:p-8 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Полнота данных</p>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-black text-blue-600">{valid.completeness}%</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 transition-all" style={{width:`${valid.completeness}%`}}/>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Достоверность оценки</p>
                  <div className="flex items-center gap-2">
                    <Shield className={`w-7 h-7 ${valid.reliability==='Высокая'?'text-green-500':valid.reliability==='Средняя+'?'text-teal-500':valid.reliability==='Средняя'?'text-amber-500':'text-slate-300'}`}/>
                    <div>
                      <span className={`text-lg font-black ${valid.reliability==='Высокая'?'text-green-700':valid.reliability==='Средняя+'?'text-teal-700':valid.reliability==='Средняя'?'text-amber-700':'text-slate-500'}`}>{valid.reliability}</span>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Базовые данные: {valid.completeness}% · Лабораторные: {metrics.labsCompleteness}%
                      </p>
                      {valid.reliability !== 'Высокая' && (
                        <p className="text-[10px] text-amber-600 font-bold mt-0.5">Заполните лабораторные данные выше — станет «Высокая»</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Согласие на хранение черновика — отдельный блок */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-black text-slate-700">Сохранять черновик на этом устройстве</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Данные хранятся только в браузере, не передаются на сервер</p>
                </div>
                <StableSelect value={form.consent_local_save} onChange={v=>f({consent_local_save:v})}
                  className="text-xs font-black border rounded-lg px-3 py-2 outline-none bg-white shrink-0">
                  <option value="Да">Да, сохранять</option>
                  <option value="Нет">Нет</option>
                </StableSelect>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Навигация */}
      <div className="bg-white border-t p-4 md:px-8 flex justify-between items-center shrink-0 shadow-lg z-20" style={{paddingBottom:'max(1rem, env(safe-area-inset-bottom))'}}>
        <button onClick={() => step===1 ? setView('dashboard') : setStep(step-1)}
          className="px-6 py-3 border-2 border-slate-200 rounded-xl text-xs font-black uppercase text-slate-500 hover:bg-slate-50 transition">Назад</button>
        {step < 3 ? (
          <button onClick={() => setStep(step+1)} disabled={valid.currentStepInvalid}
            className="px-8 py-3 bg-blue-600 text-white rounded-xl text-xs font-black uppercase disabled:bg-slate-200 disabled:text-slate-400 transition">Далее</button>
        ) : (
          <button
            disabled={valid.currentStepInvalid || isCalc}
            className="px-8 py-3 bg-blue-700 text-white rounded-xl text-xs font-black uppercase flex items-center gap-3 disabled:bg-slate-200 disabled:text-slate-400 transition"
            onClick={() => {
              setIsCalc(true);
              setTimeout(() => {
                const newReport = generateReport();
                setReport(newReport);
                setHistory([{ date: new Date().toISOString(), text: newReport, author: 'Авточерновик' }]);
                setIsCalc(false);
                setView('results');
                setTab('summary');
                setCalcHistory(prev => [{
                  date: new Date().toISOString(),
                  name: form.patient_name,
                  score: scoring.total,
                  riskCat: scoring.riskCat,
                  bmi: metrics.bmi,
                  avgBP: `${metrics.avgSys}/${metrics.avgDia}`,
                  reliability: valid.reliability,
                  age: form.age,
                }, ...prev].slice(0, 10));
              }, 1200);
            }}>
            {isCalc ? <Clock className="w-4 h-4 animate-spin"/> : <FileCheck className="w-5 h-5"/>} Рассчитать риск
          </button>
        )}
      </div>
    </div>
  );

  // ── RESULTS ──────────────────────────────────────────────────────────────────
  const Results = () => {
    const rc = riskColors(scoring.riskCat);

    // Режим пациентки
    if (role === 'Пациентка') {
      return (
        <div className="overflow-y-auto h-full">
          <div className="max-w-2xl mx-auto p-4 md:p-10 space-y-6" id="print-area">
            {/* Шапка */}
            <div className={`p-6 md:p-10 rounded-2xl border-2 ${rc.border} ${rc.bg} text-center`}>
              <div className={`w-16 h-16 rounded-full ${rc.dot} flex items-center justify-center mx-auto mb-4`}>
                <HeartPulse className="w-8 h-8 text-white"/>
              </div>
              {form.patient_name && <p className="text-lg font-black text-slate-800 mb-1">{form.patient_name}</p>}
              <p className="text-sm text-slate-500 mb-1">Оценка прегравидарного риска</p>
              <p className={`text-2xl font-black ${rc.text} uppercase mt-2`}>{scoring.riskCat} риск</p>
              {/* Человечное объяснение категории */}
              <p className="text-xs text-slate-600 mt-3 max-w-sm mx-auto leading-relaxed">
                {scoring.riskCat === 'Низкий' &&
                  'Ваш профиль в целом благоприятный. Стандартная прегравидарная подготовка под наблюдением врача.'}
                {scoring.riskCat === 'Умеренный' &&
                  'Выявлены факторы, которые стоит скорректировать до беременности. Плановая консультация врача и коррекция образа жизни.'}
                {scoring.riskCat === 'Повышенный' &&
                  'Необходима дополнительная оценка и коррекция нескольких факторов. Рекомендуется расширенное обследование до зачатия.'}
                {scoring.riskCat === 'Высокий' &&
                  'Обнаружены серьёзные факторы риска. Необходима очная консультация кардиолога и акушера-гинеколога до планирования беременности.'}
              </p>
              <p className="text-[10px] text-slate-400 mt-2">Это не диагноз — результат нужно обсудить с врачом</p>
            </div>

            {/* Ваши показатели */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-black text-slate-800 text-sm mb-4">Ваши основные показатели</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {metrics.bmi > 0 && (
                  <div className={`p-4 rounded-xl border text-center ${metrics.bmi < 18.5 ? 'bg-blue-50 border-blue-200' : metrics.bmi < 25 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                    <p className="text-2xl font-black text-slate-900">{metrics.bmi}</p>
                    <p className="text-xs font-bold text-slate-600 mt-1">ИМТ</p>
                    <p className="text-[10px] text-slate-500">норма 18,5–24,9</p>
                    <p className={`text-[10px] font-black mt-1 ${metrics.bmi < 18.5 ? 'text-blue-600' : metrics.bmi < 25 ? 'text-green-600' : 'text-amber-600'}`}>
                      {metrics.bmi < 18.5 ? '↓ Ниже нормы' : metrics.bmi < 25 ? '✓ Норма' : metrics.bmi < 30 ? '↑ Выше нормы' : '↑↑ Ожирение'}
                    </p>
                  </div>
                )}
                {metrics.avgSys > 0 && (
                  <div className={`p-4 rounded-xl border text-center ${metrics.avgSys >= 140 ? 'bg-red-50 border-red-200' : metrics.avgSys >= 130 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                    <p className="text-2xl font-black text-slate-900">{metrics.avgSys}/{metrics.avgDia}</p>
                    <p className="text-xs font-bold text-slate-600 mt-1">АД мм рт.ст.</p>
                    <p className="text-[10px] text-slate-500">норма &lt; 120/70 (ESC 2024)</p>
                    <p className={`text-[10px] font-black mt-1 ${metrics.avgSys >= 140 ? 'text-red-600' : metrics.avgSys >= 130 ? 'text-amber-600' : metrics.avgSys >= 120 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {metrics.avgSys >= 140 ? '↑ Повышено' : metrics.avgSys >= 130 ? '↑ Высокое норм.' : metrics.avgSys >= 120 ? '↑ Повышенное (ESC)' : '✓ Норма'}
                    </p>
                  </div>
                )}
                {Number(form.waist) > 0 && (
                  <div className={`p-4 rounded-xl border text-center ${Number(form.waist) >= 80 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                    <p className="text-2xl font-black text-slate-900">{form.waist} см</p>
                    <p className="text-xs font-bold text-slate-600 mt-1">Талия</p>
                    <p className="text-[10px] text-slate-500">норма &lt; 80 см</p>
                    <p className={`text-[10px] font-black mt-1 ${Number(form.waist) >= 80 ? 'text-amber-600' : 'text-green-600'}`}>
                      {Number(form.waist) >= 80 ? '↑ Выше нормы' : '✓ Норма'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Рекомендации */}
            {scoring.activeRecs.length > 0 && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-black text-slate-800 text-sm mb-4 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500"/> Что требует внимания
                </h3>
                <ul className="space-y-4">
                  {scoring.activeRecs.map((r,i) => (
                    <li key={i} className="flex gap-3 p-3 bg-slate-50 rounded-xl">
                      <span className={`w-2 h-2 rounded-full ${rc.dot} mt-1.5 shrink-0`}/>
                      <span className="text-sm text-slate-700 leading-relaxed">{r.pat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Дальнейшие шаги */}
            <div className="bg-blue-600 text-white p-6 rounded-2xl no-print">
              <h3 className="font-black uppercase text-xs mb-4 text-blue-100 flex items-center gap-2">
                <Clock className="w-4 h-4"/> Дальнейшие шаги
              </h3>
              <p className="text-sm font-medium leading-relaxed">Покажите это заключение вашему лечащему врачу — он составит индивидуальный план подготовки к беременности. Повторите оценку через 1–3 месяца после начала коррекции.</p>
            </div>

            {/* Печать */}
            <button onClick={() => window.print()}
              className="w-full py-4 bg-slate-800 text-white rounded-2xl text-xs font-black uppercase flex items-center justify-center gap-3 hover:bg-slate-700 transition no-print">
              <FileDown className="w-4 h-4"/> Сохранить / Распечатать
            </button>
          </div>
        </div>
      );
    }

    // Режим врача
    const TABS = [
      { id:'summary', l:'Сводка' },
      { id:'explain', l:'Детализация' },
      { id:'report',  l:'Заключение' },
    ];

    return (
      <div className="flex flex-col h-full">
        {/* Шапка результатов — максимально компактная на мобильном */}
        <div className="bg-white border-b px-3 md:px-8 py-2 md:py-3 shrink-0 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-black text-slate-900 uppercase shrink-0">Заключение</span>
                {form.patient_name && <span className="text-xs text-slate-400 truncate max-w-[130px] hidden xs:block">— {form.patient_name}</span>}
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase border hidden sm:inline-block ${valid.reliability==='Высокая' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                  {valid.reliability==='Высокая' ? 'Расширенный' : 'Базовый'}
                </span>
              </div>
              <p className="text-[9px] text-slate-400 mt-0.5 hidden md:block">
                {new Date().toLocaleDateString('ru-RU')} · {valid.reliability==='Высокая' ? 'все данные, включая лабораторию' : 'без лаборатории'}
              </p>
            </div>
            <div className="flex gap-1 shrink-0 no-print">
              <button onClick={() => window.print()}
                className="px-2 py-1.5 bg-slate-800 text-white rounded-lg text-[9px] font-black uppercase hover:bg-slate-700 transition flex items-center gap-1">
                <FileDown className="w-3 h-3"/> PDF
              </button>
              <button onClick={() => { setView('wizard'); setStep(1); }}
                className="px-2 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase hover:bg-slate-200 transition hidden sm:block">
                Изменить
              </button>
              <button onClick={() => { setView('dashboard'); setReport(''); }}
                className="px-2 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase hover:bg-slate-200 transition">✕</button>
            </div>
          </div>
        </div>

        {/* Вкладки */}
        <div className="bg-white border-b px-4 md:px-8 flex gap-3 md:gap-8 shrink-0 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`py-2.5 md:py-4 border-b-4 text-[10px] md:text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition ${tab===t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>{t.l}</button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8" id="print-area">
          <div className="max-w-6xl mx-auto">

            {/* ── СВОДКА ─────────────────────────────────────────────── */}
            {tab === 'summary' && (
              <div className="space-y-6">
                {/* Интегральная карточка */}
                <div className={`p-6 md:p-8 rounded-2xl border-2 ${rc.border} ${rc.bg} flex flex-col sm:flex-row items-center gap-6`}>
                  <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Интегральный балл</p>
                    <div className="text-7xl font-black text-slate-800 leading-none">{scoring.total}</div>
                    <div className={`mt-3 px-5 py-2 rounded-full font-black text-sm uppercase border-2 ${rc.border} ${rc.text} ${rc.bg} inline-block`}>
                      {scoring.riskCat} риск
                    </div>
                  </div>
                  <div className="flex-1 w-full space-y-1.5">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Вклад по доменам</p>
                    {Object.entries(scoring.dom).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).map(([d,v]) => {
                      const pct = Math.min((v/RD.domains[d].max)*100,100);
                      const col = pct>66?'bg-red-500':pct>33?'bg-amber-400':'bg-blue-500';
                      return (
                        <div key={d} className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-slate-500 w-4">{d}</span>
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full ${col} transition-all`} style={{width:`${pct}%`}}/></div>
                          <span className="text-[10px] font-black text-slate-600 w-8 text-right">{v}/{RD.domains[d].max}</span>
                        </div>
                      );
                    })}
                    {Object.values(scoring.dom).every(v=>v===0) && <p className="text-sm text-slate-400 italic">Факторы риска не выявлены</p>}
                    {metrics.avgSys > 0 && (
                      <p className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-100">
                        АД {metrics.avgSys}/{metrics.avgDia} мм рт.ст. · ср. АД (MAP) {metrics.map} мм рт.ст.
                      </p>
                    )}
                  </div>
                </div>

                {/* Тревожные признаки */}
                {scoring.activeRF.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-red-500"/> Тревожные признаки</h3>
                    {scoring.activeRF.map(rf => (
                      <div key={rf.id} className={`p-5 rounded-2xl border-2 ${rf.level==='Красный' ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'}`}>
                        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                          <h4 className="font-black text-slate-900">{rf.title}</h4>
                          <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-lg ${rf.level==='Красный'?'bg-red-100 text-red-700':'bg-orange-100 text-orange-700'}`}>Срочность: {rf.urgency}</span>
                        </div>
                        <p className="text-sm text-slate-600 italic mb-3">Основание: {rf.desc}</p>
                        <div className="p-3 bg-white/70 rounded-xl text-xs font-black text-slate-800 uppercase">Действие: {rf.action}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Критические сочетания */}
                {scoring.activeCC.length > 0 && (
                  <div className="bg-slate-900 p-6 md:p-8 rounded-2xl text-white">
                    <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-4">Критические сочетания факторов</h3>
                    <div className="space-y-3">
                      {scoring.activeCC.map(cc => (
                        <div key={cc.id} className="flex flex-wrap justify-between items-center p-4 bg-white/10 rounded-xl gap-2">
                          <span className="font-bold text-sm">{cc.title}</span>
                          <span className="text-[10px] font-black bg-blue-600 px-3 py-1.5 rounded-lg uppercase">{cc.effect}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Топ факторов */}
                <div className="bg-white p-5 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Ведущие факторы риска</h3>
                  {scoring.top5.length > 0 ? (
                    <div className="space-y-3">
                      {scoring.top5.map((it,i) => (
                        <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-sm font-bold text-slate-700">{it.factor}</span>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-[10px] font-black text-slate-400 uppercase hidden sm:block">Домен {it.d}</span>
                            <span className="font-black text-blue-600 bg-blue-100 px-3 py-1 rounded-lg">+{it.pts}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-sm text-slate-400 italic">Факторы риска не выявлены</p>}
                  <button onClick={() => setTab('explain')}
                    className="mt-5 w-full py-3.5 bg-slate-900 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition">
                    <List className="w-4 h-4"/> Полная детализация расчёта
                  </button>
                </div>

                {/* Рекомендации */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Рекомендации по выявленным проблемам</p>
                  {scoring.activeRecs.length > 0 ? (
                    <div className="space-y-4">
                      {scoring.activeRecs.map((r, i) => (
                        <div key={i} className="border border-slate-100 rounded-xl overflow-hidden">
                          <div className="bg-slate-50 px-4 py-3 border-b border-slate-100">
                            <p className="font-black text-xs text-blue-700 uppercase">{r.domain}</p>
                            <p className="text-xs text-slate-500 italic mt-0.5">{r.problem}</p>
                          </div>
                          <ul className="p-4 space-y-2">
                            {r.actions.map((act, j) => (
                              <li key={j} className="flex gap-2 text-xs text-slate-700 leading-relaxed">
                                <span className="text-blue-500 font-black shrink-0 mt-0.5">→</span>
                                <span>{act}</span>
                              </li>
                            ))}
                            <li className="text-[9px] text-slate-400 pt-1">Источник: {r.src}</li>
                          </ul>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-sm text-slate-400 italic">Рекомендаций нет — факторы риска не выявлены</p>}
                </div>

              {/* Ограничения расчёта */}
              {(metrics.missingClinical.length > 0 || metrics.missingLabs.length > 0) && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                  <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-3">⚠ Ограничения расчёта</p>
                  {metrics.missingClinical.length > 0 && (
                    <p className="text-xs text-amber-800 mb-2"><span className="font-bold">Не указаны клинические данные:</span> {metrics.missingClinical.join(', ')}</p>
                  )}
                  {metrics.missingLabs.length > 0 && (
                    <p className="text-xs text-amber-800 mb-2"><span className="font-bold">Лабораторные данные отсутствуют:</span> {metrics.missingLabs.join(', ')}</p>
                  )}
                  <p className="text-[10px] text-amber-600 italic mt-2">Неуказанные данные не учитываются в расчёте и могут занижать интегральный балл.</p>
                </div>
              )}
            </div>
            )}

            {/* ── ДЕТАЛИЗАЦИЯ ────────────────────────────────────────── */}
            {tab === 'explain' && (
              <div className="space-y-6">
                {/* Вводный блок */}
                <div className="bg-white p-5 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight border-b pb-3 mb-4">Детализация расчёта</h3>
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-xl text-sm text-blue-900 leading-relaxed">
                    <p className="font-black mb-2">О методологии расчёта</p>
                    <p className="mb-2">Интегральный балл суммирует весовые коэффициенты выявленных факторов риска по 8 патогенетическим доменам (A-H). Факторы риска взяты из действующих КР МЗ РФ, МАРС 2024 v3.1, FIGO, ВОЗ, ESC 2024 и ESHRE 2023.</p>
                    <p className="mb-2"><b>Ограничение:</b> числовые веса (+1, +3, +6 и т.д.) и пороги категорий (0-5 / 6-11 / 12-17 / ≥18) установлены экспертным путём. Проспективная валидация на когорте пациенток 22-25 лет не проводилась — это стандартная ситуация для скрининговых инструментов на этапе разработки.</p>
                    <p className="mb-1 text-xs"><b>Лабораторные пороги</b> — прегравидарные целевые значения: ТТГ &lt; 2,5 мЕд/л; глюкоза &lt; 5,1 ммоль/л (критерий риска ГСД, ВОЗ 2013); ферритин: целевой ≥ 40 мкг/л, дефицит &lt; 30 мкг/л (МАРС 2024). Пороги АД: по КР МЗ РФ 2024 и ESC 2024.</p>
                    <p className="text-blue-700 text-xs italic mt-2">Результат требует интерпретации врачом и не является диагностическим заключением.</p>
                  </div>
                </div>


                {/* Таблица факторов */}
                <div className="bg-white p-5 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Выявленные факторы риска</p>
                  {scoring.breakdown.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase tracking-widest">
                          <tr>
                            <th className="p-4 rounded-tl-xl">Клинический фактор</th>
                            <th className="p-4 hidden sm:table-cell">Домен</th>
                            <th className="p-4 text-right rounded-tr-xl">Баллы</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {scoring.breakdown.map((it,i) => (
                            <tr key={i} className="hover:bg-slate-50 transition">
                              <td className="p-4 text-slate-800 font-bold">
                                {it.factor}
                                <span className="block sm:hidden text-[10px] text-blue-500 font-black mt-0.5">[{it.d}] {RD.domains[it.d].name}</span>
                              </td>
                              <td className="p-4 font-black text-blue-600 text-xs hidden sm:table-cell">[{it.d}] {RD.domains[it.d].name}</td>
                              <td className="p-4 text-right font-black text-slate-900">+{it.pts}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-blue-50 border-t-2 border-blue-200">
                          <tr>
                            <td colSpan={2} className="p-4 font-black text-blue-900 text-right uppercase tracking-widest text-xs sm:text-sm">Итоговый интегральный балл:</td>
                            <td className="p-4 text-right font-black text-2xl md:text-3xl text-blue-700">{scoring.total}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <p className="text-slate-400 italic mb-2">Факторы риска не выявлены. Интегральный балл: 0.</p>
                      <p className="text-xs text-slate-400">Все введённые показатели находятся в пределах референсных значений.</p>
                    </div>
                  )}
                </div>

                {/* Интерпретация + категория */}
                <div className="bg-white p-5 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Категория риска — текущий результат</p>
                  <div className="flex flex-col gap-2 mb-4">
                    {[
                      { cat:'Низкий',     range:'0–5',  col:'bg-green-500',  desc:'Профилактический осмотр; стандартная прегравидарная подготовка' },
                      { cat:'Умеренный',  range:'6–11', col:'bg-amber-400',  desc:'Коррекция модифицируемых факторов; повторная оценка через 3 месяца' },
                      { cat:'Повышенный', range:'12–17',col:'bg-orange-500', desc:'Расширенное обследование; мультидисциплинарная консультация до зачатия' },
                      { cat:'Высокий',    range:'≥ 18', col:'bg-red-500',    desc:'Обязательная консультация кардиолога и акушера-гинеколога; индивидуальный план ведения' },
                    ].map(({ cat, range, col, desc, active = scoring.riskCat===cat }) => (
                      <div key={cat} className={`flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-xl border-2 transition ${active ? 'border-slate-700 shadow-md' : 'border-transparent opacity-40'}`}>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className={`w-3 h-3 rounded-full shrink-0 ${col}`}/>
                          <span className="font-black text-sm text-slate-800 w-24">{cat}</span>
                          <span className="text-xs text-slate-500 w-16">{range} балл.</span>
                        </div>
                        <span className="text-xs text-slate-600 sm:border-l sm:pl-3">{desc}</span>
                        {active && <span className="ml-auto text-[10px] font-black bg-slate-900 text-white px-3 py-1 rounded-lg uppercase shrink-0">← Текущий</span>}
                      </div>
                    ))}
                  </div>
                  {scoring.activeCC.length > 0 && (
                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-800 font-medium leading-relaxed">
                      <p className="font-black mb-1">⚠ Повышение категории за счёт критических сочетаний</p>
                      {scoring.activeCC.map(c=><p key={c.id}>— {c.title} ({c.effect})</p>)}
                    </div>
                  )}
                </div>

                {/* Домены — подробно */}
                <div className="bg-white p-5 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-5">Патогенетические домены — вклад в интегральный балл</p>
                  <div className="space-y-4">
                    {Object.entries(RD.domains).sort(([a],[b])=>(scoring.dom[b]||0)-(scoring.dom[a]||0)).map(([d, info]) => {
                      const score = scoring.dom[d] || 0;
                      const pct = Math.min((score / info.max) * 100, 100);
                      const col = pct > 66 ? 'bg-red-500' : pct > 33 ? 'bg-amber-400' : score > 0 ? 'bg-blue-500' : 'bg-slate-200';
                      const factors = scoring.breakdown.filter(b=>b.d===d);
                      return (
                        <div key={d} className="border border-slate-100 rounded-xl p-4">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-[11px] font-black text-white bg-slate-600 w-6 h-6 rounded-md flex items-center justify-center shrink-0">{d}</span>
                            <span className="text-sm font-black text-slate-700 flex-1">{info.name}</span>
                            <span className="text-xs font-black text-slate-500">{score}/{info.max}</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                            <div className={`h-full rounded-full transition-all duration-700 ${col}`} style={{width:`${pct}%`}}/>
                          </div>
                          {factors.length > 0 ? (
                            <ul className="mt-2 space-y-1">
                              {factors.map((f,i)=>(
                                <li key={i} className="flex justify-between text-xs text-slate-600">
                                  <span>— {f.factor}</span>
                                  <span className="font-black text-slate-800 shrink-0 ml-2">+{f.pts}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-[10px] text-slate-400 mt-1 italic">Факторы риска по данному домену не выявлены</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Источники */}
                <div className="bg-slate-50 p-5 md:p-8 rounded-2xl border border-slate-200">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Нормативная база расчёта</p>
                  <div className="space-y-2">
                    {RD.sources.map(s=>(
                      <p key={s.short} className="text-xs text-slate-600 leading-snug border-l-2 border-blue-200 pl-3">{s.full}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── ЗАКЛЮЧЕНИЕ ─────────────────────────────────────────── */}
            {tab === 'report' && (() => {
              // Разбиваем сгенерированный текст на секции для структурированного редактирования
              const sections = [
                { key:'s_info',   label:'Общие сведения', icon:'👤' },
                { key:'s_result', label:'Результат скрининга', icon:'📊' },
                { key:'s_method', label:'Методологическая оговорка', icon:'⚕' },
                { key:'s_risks',  label:'Выявленные факторы риска', icon:'⚠' },
                { key:'s_recs',   label:'Рекомендации', icon:'✓' },
                { key:'s_limits', label:'Ограничения расчёта', icon:'ℹ' },
                { key:'s_next',   label:'Следующий шаг', icon:'📅' },
              ];
              // Собираем текст секций из полного report
              const fullText = report || '';
              return (
                <div className="space-y-4">
                  <div className="flex flex-wrap justify-between items-center gap-3">
                    <div>
                      <h3 className="font-black text-slate-900 text-sm">Рабочее медицинское заключение</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">Авточерновик — редактируйте и сохраняйте</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => navigator.clipboard.writeText(fullText)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-black uppercase text-[10px] transition">
                        Скопировать
                      </button>
                      <button onClick={() => window.print()}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-black uppercase text-[10px] flex items-center gap-1.5 transition no-print">
                        <FileDown className="w-3.5 h-3.5"/> Печать
                      </button>
                    </div>
                  </div>

                  {/* Карточка-шапка нередактируемая */}
                  <div className={`rounded-2xl border-2 ${rc.border} ${rc.bg} overflow-hidden`}>
                    {/* Строка 1: ФИО и дата */}
                    <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-b border-slate-200/60">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-0.5">Пациентка</p>
                        <p className="font-black text-slate-900">{form.patient_name || '—'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-0.5">Дата</p>
                        <p className="font-black text-slate-700">{new Date().toLocaleDateString('ru-RU')}</p>
                      </div>
                    </div>
                    {/* Строка 2: Категория риска и балл */}
                    <div className="flex flex-wrap items-start gap-4 px-5 py-3 border-b border-slate-200/60">
                      <div className="flex-1 min-w-[160px]">
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Категория риска</p>
                        <p className={`font-black text-xl ${rc.text}`}>{scoring.riskCat}</p>
                        <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                          {scoring.riskCat === 'Низкий' && 'Профилактическое наблюдение, стандартная подготовка'}
                          {scoring.riskCat === 'Умеренный' && 'Коррекция модифицируемых факторов до зачатия'}
                          {scoring.riskCat === 'Повышенный' && 'Расширенное обследование, мультидисциплинарная консультация'}
                          {scoring.riskCat === 'Высокий' && 'Обязательная консультация кардиолога и акушера-гинеколога'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Интегральный балл</p>
                        <p className="font-black text-3xl text-slate-800">{scoring.total}</p>
                        <p className="text-[10px] text-slate-400 mt-1">из ~107 возможных</p>
                      </div>
                    </div>
                    {/* Строка 3: Достоверность */}
                    <div className="px-5 py-3">
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Достоверность оценки</p>
                      <div className="flex items-center gap-2">
                        <p className={`font-black text-sm ${valid.reliability==='Высокая'?'text-green-700':valid.reliability==='Средняя+'?'text-teal-700':'text-amber-700'}`}>{valid.reliability}</p>
                        <p className="text-[10px] text-slate-500">
                          {valid.reliability==='Высокая' && '— все данные заполнены, включая лабораторный блок'}
                          {valid.reliability==='Средняя+' && '— лабораторные данные заполнены частично'}
                          {valid.reliability==='Средняя' && '— лабораторные данные отсутствуют, клинические полные'}
                          {valid.reliability==='Низкая' && '— данные заполнены частично, результат ориентировочный'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Текст медицинского заключения */}
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                      <span className="text-slate-400 text-sm">📝</span>
                      <span className="text-xs font-black text-slate-600 uppercase tracking-wide">Текст медицинского заключения</span>
                      <span className="text-[10px] text-slate-400 ml-auto">Редактируйте прямо здесь</span>
                    </div>
                    <textarea value={report} onChange={e=>setReport(e.target.value)}
                      className="w-full p-5 bg-white text-sm text-slate-700 leading-relaxed outline-none resize-none"
                      style={{minHeight:'320px', fontFamily:'Georgia, serif'}}/>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => { const r = generateReport(); setReport(r); setHistory([...history, { date:new Date().toISOString(), text:r, author:'Авто' }]); }}
                      className="flex-1 py-3.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-black uppercase text-xs transition">
                      ↺ Сбросить к авточерновику
                    </button>
                    <button onClick={() => setHistory([...history, { date:new Date().toISOString(), text:report, author:'Врач' }])}
                      className="flex-1 py-3.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 transition">
                      <Save className="w-4 h-4"/> Сохранить версию
                    </button>
                  </div>

                  {/* Журнал версий */}
                  {history.length > 0 && (
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <History className="w-3.5 h-3.5"/> Журнал версий
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {history.slice().reverse().map((h,i) => (
                          <button key={i} type="button"
                            className="bg-white p-3 rounded-xl border border-slate-100 text-xs text-left cursor-pointer hover:border-blue-400 hover:bg-blue-50 active:bg-blue-100 transition relative w-full"
                            onClick={() => { setReport(h.text); }}>
                            {i===0 && <span className="absolute -left-1 -top-1 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white"/>}
                            <div className="flex justify-between text-[9px] text-slate-400 mb-1.5">
                              <span>{new Date(h.date).toLocaleTimeString('ru-RU')}</span>
                              <span className="font-bold text-blue-600">{h.author}</span>
                            </div>
                            <p className="line-clamp-2 text-slate-600">{h.text.substring(0,100)}…</p>
                            <p className="text-[9px] text-blue-500 mt-1.5 font-bold">Нажмите для восстановления</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── JSON ───────────────────────────────────────────────── */}
            {tab === 'json' && (
              <div className="bg-slate-900 p-5 md:p-10 rounded-2xl shadow-2xl">
                <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
                  <h3 className="text-sm font-black text-green-400 uppercase tracking-widest flex items-center gap-2"><Network className="w-4 h-4"/> Исследовательский профиль</h3>
                  <button onClick={() => navigator.clipboard.writeText(JSON.stringify({
                    timestamp: new Date().toISOString(), version: RD.version,
                    metrics: { age:form.age, bmi:metrics.bmi, avgBP:`${metrics.avgSys}/${metrics.avgDia}`, totalScore:scoring.total, riskCategory:scoring.riskCat },
                    domainScores: scoring.dom, completeness:valid.completeness, reliability:valid.reliability,
                    triggeredRules: { redFlags:scoring.activeRF.map(r=>r.id), criticalCombos:scoring.activeCC.map(c=>c.id) }
                  }, null, 2))} className="px-4 py-2 bg-slate-800 hover:bg-green-700 text-white rounded-lg text-[10px] font-black uppercase transition">Скопировать</button>
                </div>
                <pre className="text-green-300 font-mono text-[11px] overflow-x-auto leading-relaxed">{JSON.stringify({
                  timestamp: new Date().toISOString(), version: RD.version,
                  metrics: { age:form.age, bmi:metrics.bmi, avgBP:`${metrics.avgSys}/${metrics.avgDia}`, totalScore:scoring.total, riskCategory:scoring.riskCat },
                  domainScores: scoring.dom, completeness:valid.completeness, reliability:valid.reliability,
                  triggeredRules: { redFlags:scoring.activeRF.map(r=>r.id), criticalCombos:scoring.activeCC.map(c=>c.id) }
                }, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── РЕНДЕР ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col bg-slate-50 text-slate-900 overflow-hidden" style={{height:'100dvh'}}>
      <style>{`
        .no-spin::-webkit-outer-spin-button,
        .no-spin::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .no-spin { -moz-appearance: textfield; }
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; top: 0; left: 0; width: 100%; }
          header, nav, button, .no-print { display: none !important; }
        }
      `}</style>
      <Header/>
      <main className="flex-1 overflow-hidden">
        {view === 'dashboard' && <Dashboard/>}
        {view === 'wizard'    && <Wizard/>}
        {view === 'results'   && <Results/>}
      </main>
    </div>
  );
}
