import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity, AlertTriangle, History, CheckCircle2, AlertCircle, Clock,
  ArrowRight, ShieldAlert, FileDown, Shield, List, Save, Network, Database,
  HeartPulse, Baby, Utensils, Cigarette, BookOpen, AlertOctagon, Scale, X,
  ChevronRight, FileCheck, Info
} from 'lucide-react';

// ─── СПРАВОЧНИК ПРАВИЛ ────────────────────────────────────────────────────────
const RD = {
  version: "7.1",
  target_age: { min: 18, max: 23 },
  domains: {
    A: { name: "Семейный анамнез", max: 10 },
    B: { name: "Репродуктивный статус", max: 12 },
    C: { name: "Поведенческие факторы", max: 15 },
    D: { name: "Симптомы и воспаление", max: 15 },
    E: { name: "Питание и микронутриенты", max: 20 },
    F: { name: "Физическая активность", max: 10 },
    G: { name: "Антропометрия и АД", max: 20 },
    H: { name: "Лабораторные данные", max: 15 },
  },
  validation: {
    age:         { min: 15, max: 50,   label: "Возраст (лет)" },
    height:      { min: 140, max: 220, label: "Рост (см)" },
    weight:      { min: 35, max: 200,  label: "Вес (кг)" },
    waist:       { min: 50, max: 150,  label: "Талия (см)" },
    sys:         { min: 70, max: 250,  label: "САД (мм рт.ст.)" },
    dia:         { min: 40, max: 150,  label: "ДАД (мм рт.ст.)" },
    cholesterol: { min: 1.0, max: 20.0,label: "Холестерин (ммоль/л)" },
    uric_acid:   { min: 50, max: 1200, label: "Мочевая кислота (мкмоль/л)" },
    albumin:     { min: 15, max: 70,   label: "Альбумин (г/л)" },
  },
  lab_ref: {
    cholesterol: { hi: 5.2,  unit: "ммоль/л" },
    uric_acid:   { hi: 357,  lo: 155, unit: "мкмоль/л" },
    albumin:     { lo: 35,   hi: 52,  unit: "г/л" },
  },
  red_flags: [
    { id:"RF-001", cond:(d,m)=> m.avgSys>=160||m.avgDia>=100, level:"Красный", urgency:"24–72 часа", title:"Критическое артериальное давление", action:"Срочная очная консультация кардиолога", desc:"САД ≥ 160 или ДАД ≥ 100 мм рт.ст." },
    { id:"RF-003", cond:(d,m)=> d.coc==='Да'&&d.migraine==='С аурой'&&d.smoke==='Да', level:"Красный", urgency:"24–72 часа", title:"Тройной сосудистый риск", action:"Немедленная отмена КОК, срочная консультация", desc:"КОК + Мигрень с аурой + Никотин" },
    { id:"RF-005", cond:(d,m)=> (m.avgSys>=140&&m.avgSys<160)||(m.avgDia>=90&&m.avgDia<100), level:"Оранжевый", urgency:"До 1 месяца", title:"Клинически значимое АД", action:"Приоритетная кардиологическая оценка", desc:"АД ≥ 140/90 мм рт.ст." },
    { id:"RF-008", cond:(d,m)=> m.nutritionRisk&&d.albumin&&Number(d.albumin)<35, level:"Оранжевый", urgency:"До 1 месяца", title:"Выраженный нутритивный дефицит", action:"Коррекция белкового статуса под контролем нутрициолога", desc:"Неблагоприятный нутрипрофиль FIGO + Альбумин < 35 г/л" },
  ],
  critical_combinations: [
    { id:"CC-001", cond:(d,m)=> d.coc==='Да'&&d.migraine==='С аурой', effect:"+1 ступень риска", title:"КОК + Мигрень с аурой" },
    { id:"CC-004", cond:(d,m)=> d.spky==='Да'&&Number(d.waist)>=80, effect:"+1 ступень риска", title:"СПКЯ + Абдоминальное ожирение" },
    { id:"CC-011", cond:(d,m)=> Number(d.uric_acid)>360&&m.avgSys>=130, effect:"+1 ступень риска", title:"Гиперурикемия + Повышенное АД" },
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
      src:"Рекомендации ВОЗ по физической активности 2020",
    },
    {
      domain:"Контроль АД",
      problem:"АД ≥ 130/80 мм рт.ст. — тенденция к повышению",
      cond:(d,m)=>m.avgSys>=130||m.avgDia>=80,
      actions:[
        "Провести суточное мониторирование АД (СМАД) для исключения маскированной гипертензии и гипертензии белого халата",
        "Вести домашний дневник АД: измерять утром (через 1 ч после подъёма) и вечером, сидя, после 5 мин отдыха, в течение 7 дней",
        "Исключить вторичные причины гипертензии: УЗИ почек, анализ мочи, ТТГ, уровень альдостерона/ренина",
        "Ограничить потребление натрия: < 5 г поваренной соли в сутки (не досаливать пищу, избегать консервов и полуфабрикатов)",
        "Увеличить потребление калия: бананы, картофель, авокадо, шпинат — антагонизм с натрием снижает АД",
        "Беременность при АД ≥ 130/80 требует мультидисциплинарного ведения; консультация кардиолога до зачатия",
      ],
      pat:"Измеряйте АД утром и вечером 7 дней подряд и записывайте показания. Ограничьте соль, ешьте больше овощей и фруктов. Запишитесь на консультацию к врачу.",
      src:"КР МЗ РФ «Преэклампсия. Эклампсия» 2021",
    },
    {
      domain:"Масса тела",
      problem:"Избыточная масса тела (ИМТ ≥ 25) или абдоминальное ожирение (талия ≥ 80 см)",
      cond:(d,m)=>m.bmi>=25||Number(d.waist)>=80,
      actions:[
        "Целевое снижение массы тела на 5–10% от исходной до наступления беременности (уровень доказательности А)",
        "Дефицит калорий 300–500 ккал/сут за счёт уменьшения порций, исключения сладких напитков и алкоголя; без жёстких диет",
        "Средиземноморская диета — приоритетный паттерн питания: оливковое масло, рыба, бобовые, цельнозерновые, овощи",
        "Ожирение при СПКЯ (при наличии) требует консультации эндокринолога для исключения инсулинорезистентности (HOMA-IR)",
        "Контроль объёма талии каждые 4 недели — показатель висцерального жира важнее ИМТ",
        "При ИМТ > 30: консультация диетолога, рассмотреть участие в структурированной программе снижения веса",
      ],
      pat:"Не нужны жёсткие диеты — важны постоянные небольшие изменения: меньше сладкого, больше движения. Снижение веса на 5–7% уже значительно улучшит шансы на здоровую беременность.",
      src:"КР МЗ РФ «Ожирение у взрослых» 2020",
    },
    {
      domain:"Отказ от курения",
      problem:"Активное курение / употребление никотинсодержащих изделий",
      cond:(d,m)=>d.smoke==='Да',
      actions:[
        "Полный отказ от всех форм никотина: сигареты, вейпы, электронные сигареты, кальян, снюс — нет безопасных альтернатив",
        "Никотинзаместительная терапия (пластырь, жвачка) допустима при невозможности бросить самостоятельно; после отказа от НЗТ — 3 месяца до планирования зачатия",
        "Бупропион и варениклин — эффективны, но не рекомендованы при планировании беременности: требуется консультация нарколога",
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
        "КОК категорически противопоказаны при АД ≥ 140/90 мм рт.ст. — требуется смена метода контрацепции",
        "При АД 130–139/80–89 мм рт.ст. на фоне КОК — рассмотреть прогестин-содержащие монопрепараты или барьерные методы",
        "Контролировать АД каждые 3–6 месяцев на протяжении всего периода приёма КОК",
        "Дополнительно: при приёме КОК > 1 года проверить липидный профиль, уровень глюкозы натощак",
      ],
      pat:"Пожалуйста, измерьте давление — желательно трёхкратно в спокойном состоянии. Сообщите результат врачу: от этого зависит безопасность вашего метода контрацепции.",
      src:"Протокол МАРС «Прегравидарная подготовка» 2024",
    },
  ],
  sources: [
    { short:"КР МЗ РФ «Нормальная беременность» 2023", full:"Клинические рекомендации МЗ РФ «Нормальная беременность», утв. 2023 г." },
    { short:"КР МЗ РФ «Преэклампсия. Эклампсия» 2021", full:"Клинические рекомендации МЗ РФ «Преэклампсия. Эклампсия. Отёки, протеинурия и гипертензивные расстройства во время беременности, в родах и послеродовом периоде», утв. 2021 г." },
    { short:"Протокол МАРС 2024", full:"Клинический протокол Межрегиональной ассоциации акушеров-гинекологов (МАРС) «Прегравидарная подготовка», 2024 г." },
    { short:"Чеклист питания FIGO 2023", full:"FIGO Nutrition Checklist for Preconception and Pregnancy, Международная федерация гинекологии и акушерства (FIGO), 2023 г." },
    { short:"Рекомендации ВОЗ 2020", full:"Глобальные рекомендации Всемирной организации здравоохранения по физической активности и малоподвижному образу жизни, ВОЗ, 2020 г." },
    { short:"КР МЗ РФ «Ожирение у взрослых» 2020", full:"Клинические рекомендации МЗ РФ «Ожирение у взрослых», утв. 2020 г." },
  ],
};

// ─── ДЕФОЛТНЫЕ ДАННЫЕ ─────────────────────────────────────────────────────────
const DEFAULT_FORM = {
  age: 21,
  family_cvd: 'Нет', family_pe: 'Нет',
  spky: 'Нет', coc: 'Нет', bp_measured: 'Да', migraine: 'Нет',
  smoke: 'Нет', sleep: '7–9 часов', active_min: 150,
  figo_veg: 'Достаточно', figo_fastfood: 'Нет', folate: 'Да',
  height: 165, weight: 65, waist: 75,
  sys1: 120, dia1: 80, sys2: 122, dia2: 82, sys3: 118, dia3: 78,
  labs_status: 'not_filled',
  cholesterol: '', uric_acid: '', albumin: '',
};

// ─── УТИЛИТЫ ──────────────────────────────────────────────────────────────────
function calcBMI(h, w) {
  const hm = Number(h) / 100;
  return hm > 0 ? parseFloat((Number(w) / (hm * hm)).toFixed(1)) : 0;
}
function avgArr(arr) {
  const vals = arr.map(Number).filter(v => v > 50);
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
}

// ─── ЦВЕТ КАТЕГОРИИ РИСКА ─────────────────────────────────────────────────────
function riskColors(cat) {
  if (cat === 'Высокий')    return { bg:'bg-red-50',    border:'border-red-300',    text:'text-red-700',    dot:'bg-red-500' };
  if (cat === 'Повышенный') return { bg:'bg-orange-50', border:'border-orange-300', text:'text-orange-700', dot:'bg-orange-500' };
  if (cat === 'Умеренный')  return { bg:'bg-amber-50',  border:'border-amber-300',  text:'text-amber-700',  dot:'bg-amber-500' };
  return                           { bg:'bg-green-50',  border:'border-green-300',  text:'text-green-700',  dot:'bg-green-500' };
}

// ─── РАДАР ────────────────────────────────────────────────────────────────────
function RadarChart({ scores }) {
  const SIZE = 300; const C = SIZE / 2; const R = 100;
  const domains = Object.keys(RD.domains);
  const pts = domains.map((d, i) => {
    const a = (Math.PI * 2 * i) / domains.length - Math.PI / 2;
    const frac = Math.min((scores[d] || 0) / RD.domains[d].max, 1);
    return [C + R * frac * Math.cos(a), C + R * frac * Math.sin(a)];
  });
  const ptStr = pts.map(p => p.join(',')).join(' ');
  return (
    <svg width="100%" viewBox={`0 0 ${SIZE} ${SIZE}`} className="overflow-visible max-w-[260px] mx-auto">
      {[0.25,0.5,0.75,1].map(s => (
        <polygon key={s} fill="none" stroke="#E2E8F0" strokeWidth="1"
          points={domains.map((_,i) => { const a=(Math.PI*2*i)/domains.length-Math.PI/2; return `${C+R*s*Math.cos(a)},${C+R*s*Math.sin(a)}`; }).join(' ')} />
      ))}
      {domains.map((_,i) => { const a=(Math.PI*2*i)/domains.length-Math.PI/2; return <line key={i} x1={C} y1={C} x2={C+R*Math.cos(a)} y2={C+R*Math.sin(a)} stroke="#E2E8F0" strokeWidth="1"/>; })}
      <polygon points={ptStr} fill="rgba(37,99,235,0.18)" stroke="#2563EB" strokeWidth="2"/>
      {pts.map(([x,y],i) => <circle key={i} cx={x} cy={y} r="4" fill="#2563EB"/>)}
      {domains.map((d,i) => {
        const a=(Math.PI*2*i)/domains.length-Math.PI/2;
        const lx=C+(R+28)*Math.cos(a); const ly=C+(R+28)*Math.sin(a);
        return (
          <g key={d}>
            <text x={lx} y={ly} fontSize="11" fontWeight="700" fill="#475569" textAnchor="middle" dominantBaseline="middle">{d}</text>
            <text x={lx} y={ly+13} fontSize="8" fill="#94A3B8" textAnchor="middle" dominantBaseline="middle">{scores[d]||0}/{RD.domains[d].max}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── КОМПОНЕНТ ПРОГРЕССБАРА ДОМЕНА ────────────────────────────────────────────
function DomainBar({ label, letter, score, max }) {
  const pct = Math.min((score / max) * 100, 100);
  const col = pct > 66 ? 'bg-red-500' : pct > 33 ? 'bg-amber-400' : 'bg-blue-500';
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold text-slate-600"><span className="text-blue-600 mr-1">[{letter}]</span>{label}</span>
        <span className="text-xs font-black text-slate-800">{score}/{max}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${col}`} style={{width:`${pct}%`}}/>
      </div>
    </div>
  );
}

// ─── ОСНОВНОЕ ПРИЛОЖЕНИЕ ──────────────────────────────────────────────────────
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
  const f = (patch) => setForm(prev => ({...prev, ...patch}));

  // ── МЕТРИКИ ─────────────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const bmi = calcBMI(form.height, form.weight);
    const avgSys = avgArr([form.sys1, form.sys2, form.sys3]);
    const avgDia = avgArr([form.dia1, form.dia2, form.dia3]);
    const sysVals = [form.sys1,form.sys2,form.sys3].map(Number).filter(v=>v>50);
    const nutritionRisk = form.figo_veg !== 'Достаточно' || form.figo_fastfood === 'Да';
    return { bmi, avgSys, avgDia, sysCount: sysVals.length, nutritionRisk };
  }, [form]);

  // ── ВАЛИДАЦИЯ ───────────────────────────────────────────────────────────────
  const valid = useMemo(() => {
    const fe = {};  // fieldErrors: { fieldKey: 'сообщение' }
    const labInt = {};
    const vr = RD.validation;

    // Шаг 1: возраст и активность
    const age = Number(form.age);
    if (age && (age < vr.age.min || age > vr.age.max))
      fe.age = `${vr.age.min}–${vr.age.max} лет`;

    const am = Number(form.active_min);
    if (form.active_min !== '' && (am < 0 || am > 10000))
      fe.active_min = 'от 0 до 10 000 мин/нед';

    // Шаг 2: антропометрия
    const h = Number(form.height), w = Number(form.weight), wt = Number(form.waist);
    if (h && (h < vr.height.min || h > vr.height.max))
      fe.height = `${vr.height.min}–${vr.height.max} см`;
    if (w && (w < vr.weight.min || w > vr.weight.max))
      fe.weight = `${vr.weight.min}–${vr.weight.max} кг`;
    if (wt && (wt < vr.waist.min || wt > vr.waist.max))
      fe.waist = `${vr.waist.min}–${vr.waist.max} см`;

    // Шаг 2: АД
    [1,2,3].forEach(i => {
      const s = Number(form[`sys${i}`]), d = Number(form[`dia${i}`]);
      if (s && (s < vr.sys.min || s > vr.sys.max))
        fe[`sys${i}`] = `${vr.sys.min}–${vr.sys.max}`;
      if (d && (d < vr.dia.min || d > vr.dia.max))
        fe[`dia${i}`] = `${vr.dia.min}–${vr.dia.max}`;
      if (s && d && d >= s)
        fe[`dia${i}`] = 'ДАД < САД';
    });

    // Шаг 2: хотя бы одно измерение АД
    const sysVals = [form.sys1,form.sys2,form.sys3].map(Number).filter(v=>v>50);
    if (sysVals.length === 0 && step === 2)
      fe.bp_required = 'Введите хотя бы одно измерение АД';

    // Шаг 3: лаборатория
    ['cholesterol','uric_acid','albumin'].forEach(key => {
      const val = Number(form[key]);
      if (!val) return;
      const v = vr[key]; const ref = RD.lab_ref[key];
      if (val < v.min || val > v.max) { fe[key] = `${v.min}–${v.max}`; return; }
      if (ref.hi && val > ref.hi) labInt[key] = { text:'Выше нормы', color:'text-orange-600' };
      else if (ref.lo && val < ref.lo) labInt[key] = { text:'Ниже нормы', color:'text-blue-600' };
      else labInt[key] = { text:'В норме', color:'text-green-600' };
    });

    // Ошибки по текущему шагу (для блокировки кнопки)
    const step1Fields = ['age', 'active_min'];
    const step2Fields = ['height','weight','waist','sys1','dia1','sys2','dia2','sys3','dia3','bp_required'];
    const step3Fields = ['cholesterol','uric_acid','albumin'];

    const errorsForStep = (fields) => fields.some(k => fe[k]);
    const step1Invalid = errorsForStep(step1Fields);
    const step2Invalid = errorsForStep(step2Fields);
    const step3Invalid = errorsForStep(step3Fields);

    const currentStepInvalid = step === 1 ? step1Invalid : step === 2 ? step2Invalid : step3Invalid;

    // полнота
    let filled = 0; const total = 14;
    if (form.age) filled++;
    if (form.family_pe) filled++;
    if (form.family_cvd) filled++;
    if (form.spky) filled++;
    if (form.coc) filled++;
    if (form.smoke) filled++;
    if (Number(form.height) > 0) filled++;
    if (Number(form.weight) > 0) filled++;
    if (Number(form.waist) > 0) filled++;
    if (sysVals.length >= 1) filled += 3;
    if (form.figo_veg) filled++;
    if (form.active_min !== '') filled++;
    const completeness = Math.round((filled / total) * 100);

    let reliability = 'Низкая';
    if (completeness >= 90 && form.labs_status === 'filled') reliability = 'Высокая';
    else if (completeness >= 90) reliability = 'Средняя';

    return { ok: Object.keys(fe).length === 0, fe, labInt, completeness, reliability, currentStepInvalid };
  }, [form, step, metrics]);

  // ── СКОРИНГ ─────────────────────────────────────────────────────────────────
  const scoring = useMemo(() => {
    let total = 0;
    const breakdown = [];
    const dom = { A:0, B:0, C:0, D:0, E:0, F:0, G:0, H:0 };
    const add = (d, factor, pts) => { total += pts; dom[d] += pts; breakdown.push({d, factor, pts}); };

    // A — Семья
    if (form.family_cvd === 'Да') add('A','Ранние ССЗ у родственников первой линии', 2);
    if (form.family_pe === 'Да')  add('A','Преэклампсия в семейном анамнезе', 3);

    // B — Репродукция
    if (form.spky === 'Да') add('B','Синдром поликистозных яичников (СПКЯ)', 3);
    if (form.coc === 'Да' && form.bp_measured === 'Нет') add('B','Приём КОК без контроля артериального давления', 3);

    // C — Поведение
    if (form.smoke === 'Да') add('C','Курение / никотинсодержащие изделия', 3);
    if (form.sleep === 'Менее 7 часов') add('C','Дефицит сна (менее 7 часов)', 2);

    // D — Симптомы
    if (form.migraine === 'С аурой') add('D','Мигрень с аурой', 3);

    // E — Питание
    if (form.figo_veg !== 'Достаточно') add('E','Дефицит овощей и фруктов (чеклист FIGO)', 2);
    if (form.figo_fastfood === 'Да')    add('E','Регулярное употребление фастфуда', 2);
    if (form.folate === 'Нет')          add('E','Отсутствие дотации фолатов', 3);

    // F — Активность
    if (Number(form.active_min) < 150) add('F','Недостаточная физическая активность (< 150 мин/нед)', 2);

    // G — Антропометрия и АД
    const bmi = metrics.bmi;
    if (bmi >= 30)     add('G','Ожирение (ИМТ ≥ 30)', 4);
    else if (bmi >= 25) add('G','Избыточная масса тела (ИМТ 25–29,9)', 2);

    const waist = Number(form.waist);
    if (waist >= 88)      add('G','Выраженное абдоминальное ожирение (≥ 88 см)', 4);
    else if (waist >= 80) add('G','Абдоминальное ожирение (80–87 см)', 2);

    // АД: ориентир — среднее из введённых измерений
    if (metrics.avgSys >= 140 || metrics.avgDia >= 90) add('G','АД ≥ 140/90 мм рт.ст.', 6);
    else if (metrics.avgSys >= 130 || metrics.avgDia >= 80) add('G','АД ≥ 130/80 мм рт.ст.', 3);

    // H — Лаборатория
    if (form.cholesterol && Number(form.cholesterol) > 5.2) add('H','Гиперхолестеринемия (> 5,2 ммоль/л)', 2);
    if (form.uric_acid   && Number(form.uric_acid)   > 357) add('H','Гиперурикемия (> 357 мкмоль/л)', 2);
    if (form.albumin     && Number(form.albumin)     < 35)  add('H','Гипоальбуминемия (< 35 г/л)', 4);

    breakdown.sort((a, b) => b.pts - a.pts);
    const top5 = breakdown.slice(0, 5);

    const activeRF = RD.red_flags.filter(rf => rf.cond(form, metrics));
    const activeCC = RD.critical_combinations.filter(cc => cc.cond(form, metrics));
    const activeRecs = RD.recs.filter(r => r.cond(form, metrics));

    let riskCat = 'Низкий';
    if (total >= 6)  riskCat = 'Умеренный';
    if (total >= 12) riskCat = 'Повышенный';
    if (total >= 18) riskCat = 'Высокий';

    // критические сочетания повышают на одну ступень
    if (activeCC.length > 0 && riskCat !== 'Высокий') {
      riskCat = riskCat === 'Низкий' ? 'Умеренный' : riskCat === 'Умеренный' ? 'Повышенный' : 'Высокий';
    }

    return { total, breakdown, dom, top5, activeRF, activeCC, activeRecs, riskCat };
  }, [form, metrics]);

  // ── ГЕНЕРАЦИЯ ЗАКЛЮЧЕНИЯ ────────────────────────────────────────────────────
  useEffect(() => {
    if (view === 'results' && !report && role === 'Врач') {
      const d = new Date().toLocaleDateString('ru-RU');
      let t = `МЕДИЦИНСКОЕ ЗАКЛЮЧЕНИЕ (${d})\n${'='.repeat(40)}\n\n`;
      t += `Пациентка ${form.age} лет. Категория риска: ${scoring.riskCat} (интегральный балл: ${scoring.total}).\n`;
      t += `Достоверность оценки: ${valid.reliability}. ИМТ: ${metrics.bmi}. Среднее АД: ${metrics.avgSys}/${metrics.avgDia}.\n\n`;
      t += `[ ВЫЯВЛЕННЫЕ ФАКТОРЫ РИСКА ]\n`;
      scoring.top5.forEach(f => { t += `  — ${f.factor} (домен ${f.d}, +${f.pts} балл.)\n`; });
      if (scoring.activeCC.length) { t += `\n[ КРИТИЧЕСКИЕ СОЧЕТАНИЯ ]\n`; scoring.activeCC.forEach(c => { t += `  — ${c.title} (${c.effect})\n`; }); }
      if (scoring.activeRF.length) { t += `\n[ ТРЕВОЖНЫЕ ПРИЗНАКИ ]\n`; scoring.activeRF.forEach(rf => { t += `  — ${rf.urgency}: ${rf.title}. Действие: ${rf.action}.\n`; }); }
      t += `\n[ РЕКОМЕНДАЦИИ ]\n`;
      scoring.activeRecs.forEach(r => {
        t += `  — ${r.domain} (${r.problem}):\n`;
        r.actions.forEach(a => { t += `      • ${a}\n`; });
      });
      t += `\nПовторная оценка риска: перед планированием беременности или через 1–3 месяца после начала коррекции образа жизни.\n`;
      setReport(t);
      setHistory([{ date: new Date().toISOString(), text: t, author: 'Автоматический черновик' }]);
    }
  }, [view, scoring, role, valid, metrics, form]);

  const isOutlier = form.age < RD.target_age.min || form.age > RD.target_age.max;

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
    <div className="overflow-y-auto h-full">
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
        {isOutlier && (
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5"/>
            <div>
              <p className="text-sm font-black text-amber-900">Возраст вне целевой группы</p>
              <p className="text-xs text-amber-700 mt-1">Алгоритм валидирован для женщин <b>18–23 лет</b>. Текущий возраст: {form.age} лет.</p>
            </div>
          </div>
        )}

        {/* Hero */}
        <div className="bg-gradient-to-br from-slate-900 to-blue-950 rounded-2xl md:rounded-3xl p-6 md:p-12 text-white relative overflow-hidden">
          <Activity className="absolute right-0 top-0 w-64 h-64 -mt-16 -mr-16 opacity-5"/>
          <span className="inline-block px-3 py-1 bg-blue-500/20 text-blue-200 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-400/30 mb-4">Для женщин 18–23 лет</span>
          <h2 className="text-2xl md:text-4xl font-black mb-3 tracking-tight">Прегравидарный скрининг рисков</h2>
          <p className="text-slate-300 mb-6 md:mb-8 text-sm md:text-base leading-relaxed max-w-xl">Клинический инструмент ранней оценки кардио-метаболических, нутритивных и репродуктивных рисков перед планированием беременности.</p>
          <button onClick={() => { setView('wizard'); setStep(1); setTab('summary'); setReport(''); }}
            className="bg-blue-500 hover:bg-blue-400 text-white px-6 md:px-8 py-3 md:py-4 rounded-xl font-black uppercase text-xs md:text-sm flex items-center gap-3 transition shadow-lg shadow-blue-500/30">
            Начать оценку профиля <ArrowRight className="w-4 h-4 md:w-5 md:h-5"/>
          </button>
        </div>

        {/* 4 карточки */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[
            { icon: HeartPulse, color:'text-rose-500', bg:'bg-rose-50', title:'Кардиометаболический риск', items:['Масса тела и ИМТ','Окружность талии','Артериальное давление','Липидный профиль'] },
            { icon: Baby, color:'text-purple-500', bg:'bg-purple-50', title:'Репродуктивный риск', items:['СПКЯ','Нарушения цикла','КОК и сосудистый риск'] },
            { icon: Utensils, color:'text-green-600', bg:'bg-green-50', title:'Нутритивный риск', items:['Чеклист питания FIGO','Дотация фолатов','Альбумин сыворотки'] },
            { icon: Cigarette, color:'text-orange-500', bg:'bg-orange-50', title:'Поведенческий риск', items:['Курение и вейпы','Режим сна','Физическая активность'] },
          ].map(({ icon: Icon, color, bg, title, items }) => (
            <div key={title} className="bg-white p-4 md:p-6 rounded-xl md:rounded-2xl border border-slate-200 shadow-sm">
              <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${color}`}/>
              </div>
              <p className="font-black text-slate-800 text-sm md:text-base leading-snug mb-3">{title}</p>
              <ul className="text-xs text-slate-500 space-y-1.5 list-disc pl-3.5">
                {items.map(it => <li key={it}>{it}</li>)}
              </ul>
            </div>
          ))}
        </div>

        {/* История расчётов */}
        {calcHistory.length > 0 && (
          <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                <History className="w-4 h-4 text-blue-500"/> История расчётов
              </h3>
              <button onClick={() => setCalcHistory([])} className="text-[10px] text-slate-400 hover:text-red-500 font-black transition">Очистить</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left min-w-[520px]">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <th className="pb-2 pr-4">Дата и время</th>
                    <th className="pb-2 pr-4">Возраст</th>
                    <th className="pb-2 pr-4">Балл</th>
                    <th className="pb-2 pr-4">Категория риска</th>
                    <th className="pb-2 pr-4">ИМТ</th>
                    <th className="pb-2 pr-4">Ср. АД</th>
                    <th className="pb-2">Достоверность</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {calcHistory.map((c, i) => {
                    const rc = riskColors(c.riskCat);
                    return (
                      <tr key={i} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 pr-4 text-slate-500 font-medium whitespace-nowrap">
                          {new Date(c.date).toLocaleDateString('ru-RU')} {new Date(c.date).toLocaleTimeString('ru-RU', {hour:'2-digit',minute:'2-digit'})}
                        </td>
                        <td className="py-2.5 pr-4 font-bold text-slate-700">{c.age} лет</td>
                        <td className="py-2.5 pr-4 font-black text-blue-700 text-base">{c.score}</td>
                        <td className="py-2.5 pr-4">
                          <span className={`px-2.5 py-1 rounded-lg font-black text-[11px] uppercase ${rc.bg} ${rc.text} border ${rc.border}`}>
                            {c.riskCat}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 font-medium text-slate-600">{c.bmi}</td>
                        <td className="py-2.5 pr-4 font-medium text-slate-600">{c.avgBP}</td>
                        <td className="py-2.5">
                          <span className={`font-black text-[11px] ${c.reliability==='Высокая'?'text-green-600':c.reliability==='Средняя'?'text-amber-600':'text-slate-400'}`}>
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
        )}

        {/* Нормативная база + Требования */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-blue-900 uppercase text-xs flex items-center gap-2"><BookOpen className="w-4 h-4"/> Нормативная база</h3>
              <button onClick={() => setShowSources(true)} className="text-[10px] text-blue-600 font-black hover:underline">Подробнее →</button>
            </div>
            <div className="space-y-2">
              {RD.sources.map(s => (
                <p key={s.short} className="text-xs font-medium text-blue-800 bg-white p-3 rounded-lg shadow-sm leading-snug">{s.full}</p>
              ))}
            </div>
          </div>
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <h3 className="font-black text-slate-800 uppercase text-xs mb-4 flex items-center gap-2"><Database className="w-4 h-4"/> Требования к данным</h3>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Базовый расчёт</p>
                <p className="text-xs text-slate-600 leading-relaxed">Возраст, анамнез (семья, поведение, питание), антропометрия (рост, вес, талия), измерения АД.</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Расширенный расчёт</p>
                <p className="text-xs text-slate-600 leading-relaxed">Дополнительно: холестерин общий, мочевая кислота, альбумин сыворотки.</p>
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
              <h2 className="font-black text-slate-900 uppercase text-sm">Нормативная база алгоритма</h2>
              <button onClick={() => setShowSources(false)} className="p-2 rounded-full hover:bg-slate-100"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6 space-y-4">
              {RD.sources.map(s => (
                <div key={s.short} className="p-4 border rounded-xl bg-slate-50">
                  <p className="text-xs font-black text-blue-700 mb-1 uppercase tracking-wide">{s.short}</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{s.full}</p>
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
      <div className="bg-white border-b px-4 md:px-8 py-3 shrink-0 flex items-center justify-between gap-4 shadow-sm">
        <div className="flex gap-2 items-center flex-1">
          {[1,2,3].map(s => (
            <React.Fragment key={s}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition ${s===step ? 'bg-blue-600 text-white' : s < step ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                {s < step ? '✓' : s}
              </div>
              <span className={`text-[10px] font-black uppercase tracking-wide hidden sm:block ${s===step ? 'text-blue-700' : 'text-slate-400'}`}>
                {s===1 ? 'Анамнез' : s===2 ? 'Антропометрия и АД' : 'Лаборатория'}
              </span>
              {s < 3 && <div className={`flex-1 h-0.5 ${s < step ? 'bg-green-400' : 'bg-slate-100'}`}/>}
            </React.Fragment>
          ))}
        </div>
        {isOutlier && <span className="text-[10px] text-amber-600 font-black bg-amber-50 px-2 py-1 rounded-lg shrink-0">Возраст вне нормы</span>}
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-28">
        <div className="max-w-3xl mx-auto space-y-6">

          {step === 1 && (
            <div className="space-y-6">
              {/* Возраст */}
              <div className="bg-white p-5 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-black text-xs uppercase text-slate-500 tracking-widest border-b pb-3 mb-5">Общие сведения</h3>
                <div className="w-36">
                  <label className={lbl}>Возраст (лет)</label>
                  <input type="number" inputMode="numeric" value={form.age} onChange={e=>f({age:Number(e.target.value)})} className={`${inp} text-center text-2xl font-black ${errBorder('age')}`}/>
                  <Err k="age"/>
                </div>
              </div>

              {/* Семейный анамнез (Домен A) */}
              <div className="bg-white p-5 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-black text-xs uppercase text-slate-500 tracking-widest border-b pb-3 mb-5">Семейный анамнез <span className="text-blue-500">[A]</span></h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className={lbl}>ССЗ у родственников первой линии</label><select value={form.family_cvd} onChange={e=>f({family_cvd:e.target.value})} className={sel}><option>Нет</option><option>Да</option></select></div>
                  <div><label className={lbl}>Преэклампсия у матери или сестёр</label><select value={form.family_pe} onChange={e=>f({family_pe:e.target.value})} className={sel}><option>Нет</option><option>Да</option></select></div>
                </div>
              </div>

              {/* Репродуктивный статус (Домен B) */}
              <div className="bg-white p-5 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-black text-xs uppercase text-slate-500 tracking-widest border-b pb-3 mb-5">Репродуктивный статус <span className="text-blue-500">[B]</span></h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className={lbl}>Синдром поликистозных яичников (СПКЯ)</label><select value={form.spky} onChange={e=>f({spky:e.target.value})} className={sel}><option>Нет</option><option>Да</option></select></div>
                  <div><label className={lbl}>Приём КОК</label><select value={form.coc} onChange={e=>f({coc:e.target.value})} className={sel}><option>Нет</option><option>Да</option></select></div>
                  {form.coc === 'Да' && (
                    <div className="sm:col-span-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <label className={lbl}>АД контролируется на фоне приёма КОК?</label>
                      <select value={form.bp_measured} onChange={e=>f({bp_measured:e.target.value})} className={sel}><option value="Да">Да, контролируется</option><option value="Нет">Нет</option></select>
                    </div>
                  )}
                </div>
              </div>

              {/* Симптомы (Домен D) */}
              <div className="bg-white p-5 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-black text-xs uppercase text-slate-500 tracking-widest border-b pb-3 mb-5">Симптомы <span className="text-blue-500">[D]</span></h3>
                <div><label className={lbl}>Мигрень</label><select value={form.migraine} onChange={e=>f({migraine:e.target.value})} className={sel+" max-w-sm"}><option>Нет</option><option>Без ауры</option><option>С аурой</option></select></div>
              </div>

              {/* Поведение (Домен C) */}
              <div className="bg-white p-5 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-black text-xs uppercase text-slate-500 tracking-widest border-b pb-3 mb-5">Поведенческие факторы <span className="text-blue-500">[C]</span></h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className={lbl}>Курение (сигареты, вейпы, кальян)</label><select value={form.smoke} onChange={e=>f({smoke:e.target.value})} className={sel}><option>Нет</option><option>Да</option></select></div>
                  <div><label className={lbl}>Продолжительность ночного сна</label><select value={form.sleep} onChange={e=>f({sleep:e.target.value})} className={sel}><option>7–9 часов</option><option>Менее 7 часов</option><option>Более 9 часов</option></select></div>
                </div>
              </div>

              {/* Питание и физкультура (Домены E, F) */}
              <div className="bg-white p-5 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-black text-xs uppercase text-slate-500 tracking-widest border-b pb-3 mb-5">Питание и физическая активность <span className="text-blue-500">[E, F]</span></h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className={lbl}>Овощи и фрукты (чеклист FIGO)</label><select value={form.figo_veg} onChange={e=>f({figo_veg:e.target.value})} className={sel}><option value="Достаточно">Достаточно (≥ 400 г/сут)</option><option value="Мало">Мало (менее нормы)</option></select></div>
                  <div><label className={lbl}>Регулярный фастфуд / ультрапереработанное</label><select value={form.figo_fastfood} onChange={e=>f({figo_fastfood:e.target.value})} className={sel}><option>Нет</option><option>Да</option></select></div>
                  <div><label className={lbl}>Фолиевая кислота (дотация фолатов)</label><select value={form.folate} onChange={e=>f({folate:e.target.value})} className={sel}><option value="Да">Да, принимаю</option><option value="Нет">Нет</option></select></div>
                  <div>
                    <label className={lbl}>Физическая активность (мин/нед)</label>
                    <input type="number" inputMode="numeric" value={form.active_min} onChange={e=>f({active_min:e.target.value})} className={`${inp} ${errBorder('active_min')}`} placeholder="Напр. 150"/>
                    <Err k="active_min"/>
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
                  <h3 className="font-black text-xs uppercase text-slate-500 tracking-widest">Антропометрия <span className="text-blue-500">[G]</span></h3>
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
                      <input type="number" inputMode="numeric" value={form[k]} onChange={e=>f({[k]:e.target.value})} className={`${inp} text-center text-xl font-black ${errBorder(k)}`}/>
                      <Err k={k}/>
                    </div>
                  ))}
                </div>
              </div>

              {/* АД (Домен G) */}
              <div className="bg-white p-5 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between border-b pb-3 mb-5">
                  <h3 className="font-black text-xs uppercase text-slate-500 tracking-widest">Офисное АД <span className="text-blue-500">[G]</span></h3>
                  {metrics.sysCount > 0 && (
                    <span className={`text-xs px-3 py-1 rounded-full font-black ${metrics.avgSys >= 140 ? 'bg-red-100 text-red-700' : metrics.avgSys >= 130 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
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
                          <input type="number" inputMode="numeric" placeholder="САД" value={form[`sys${i}`]} onChange={e=>f({[`sys${i}`]:e.target.value})} className={`w-full p-2.5 border rounded-lg font-black text-center outline-none focus:border-blue-500 text-sm no-spin ${valid.fe[`sys${i}`] ? 'border-red-400 bg-red-50' : 'bg-white'}`}/>
                          <Err k={`sys${i}`}/>
                        </div>
                        <span className="text-slate-300 font-black shrink-0">/</span>
                        <div className="w-full">
                          <input type="number" inputMode="numeric" placeholder="ДАД" value={form[`dia${i}`]} onChange={e=>f({[`dia${i}`]:e.target.value})} className={`w-full p-2.5 border rounded-lg font-black text-center outline-none focus:border-blue-500 text-sm no-spin ${valid.fe[`dia${i}`] ? 'border-red-400 bg-red-50' : 'bg-white'}`}/>
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
                <h3 className="font-black text-xs uppercase text-slate-500 tracking-widest border-b pb-3 mb-5">Лабораторные данные <span className="text-blue-500">[H]</span></h3>
                <p className="text-xs text-slate-500 mb-6 italic">Необязательный блок. При наличии анализов повышает достоверность до «Высокой».</p>

                <div className={`grid grid-cols-1 sm:grid-cols-3 gap-6 transition-opacity ${form.labs_status==='no_labs' ? 'opacity-30 pointer-events-none' : ''}`}>
                  {[
                    { k:'cholesterol', l:'Общий холестерин', ref:'Норма: < 5,2 ммоль/л', unit:'ммоль/л' },
                    { k:'uric_acid',   l:'Мочевая кислота', ref:'Норма: 155–357 мкмоль/л', unit:'мкмоль/л' },
                    { k:'albumin',     l:'Альбумин сыворотки', ref:'Норма: 35–52 г/л', unit:'г/л' },
                  ].map(({k,l,ref,unit}) => {
                    const vi = valid.labInt[k];
                    return (
                      <div key={k} className="space-y-1.5">
                        <label className={lbl}>{l}</label>
                        <div className="relative">
                          <input type="number" inputMode="decimal" value={form[k]} onChange={e=>f({[k]:e.target.value, labs_status:'filled'})}
                            className={`${inp} pr-14 text-lg font-black text-center ${errBorder(k)}`}/>
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
                      onChange={e=>f({labs_status:e.target.checked?'no_labs':'not_filled', cholesterol:'', uric_acid:'', albumin:''})}/>
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
                    <Shield className={`w-7 h-7 ${valid.reliability==='Высокая'?'text-green-500':valid.reliability==='Средняя'?'text-amber-500':'text-slate-300'}`}/>
                    <span className={`text-lg font-black ${valid.reliability==='Высокая'?'text-green-700':valid.reliability==='Средняя'?'text-amber-700':'text-slate-500'}`}>{valid.reliability}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Навигация */}
      <div className="bg-white border-t p-4 md:px-8 flex justify-between items-center shrink-0 shadow-lg z-20">
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
                setIsCalc(false);
                setView('results');
                setTab('summary');
                setCalcHistory(prev => [{
                  date: new Date().toISOString(),
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
          <div className="max-w-2xl mx-auto p-4 md:p-10 space-y-6">
            <div className={`p-6 md:p-10 rounded-2xl border-2 ${rc.border} ${rc.bg} text-center`}>
              <div className={`w-16 h-16 rounded-full ${rc.dot} flex items-center justify-center mx-auto mb-4`}>
                <HeartPulse className="w-8 h-8 text-white"/>
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">Ваш профиль здоровья</h2>
              <p className="text-sm text-slate-500 mb-1">Оценка риска</p>
              <p className={`text-xl font-black ${rc.text} uppercase`}>{scoring.riskCat}</p>
            </div>
            {scoring.activeRecs.length > 0 && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-black text-slate-800 uppercase text-xs mb-4 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-amber-500"/> Что требует внимания</h3>
                <ul className="space-y-4">
                  {scoring.activeRecs.map((r,i) => (
                    <li key={i} className="flex gap-3">
                      <span className={`w-2 h-2 rounded-full ${rc.dot} mt-1.5 shrink-0`}/>
                      <span className="text-sm text-slate-700 leading-relaxed">{r.pat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="bg-blue-600 text-white p-6 rounded-2xl">
              <h3 className="font-black uppercase text-xs mb-4 text-blue-100 flex items-center gap-2"><Clock className="w-4 h-4"/> Дальнейшие шаги</h3>
              <p className="text-sm font-medium leading-relaxed">Запишитесь на плановую консультацию к врачу для составления индивидуального плана прегравидарной подготовки. Повторите оценку через 1–3 месяца.</p>
            </div>
          </div>
        </div>
      );
    }

    // Режим врача
    const TABS = [
      { id:'summary', l:'Сводка' },
      { id:'explain', l:'Детализация' },
      { id:'report',  l:'Заключение' },
      { id:'json',    l:'JSON' },
    ];

    return (
      <div className="flex flex-col h-full">
        {/* Шапка результатов */}
        <div className="bg-white border-b px-4 md:px-8 py-4 md:py-6 shrink-0 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase">Медицинское заключение</h2>
                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${valid.reliability==='Высокая' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                  {valid.reliability==='Высокая' ? 'Расширенный результат' : 'Базовый результат'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                <span>Дата: {new Date().toLocaleDateString('ru-RU')}</span>
                <span>•</span>
                <span className={valid.reliability==='Высокая'?'text-green-600':'text-amber-600'}>Достоверность: {valid.reliability}</span>
                <span>•</span>
                <span>ИМТ: {metrics.bmi}</span>
                <span>•</span>
                <span>АД: {metrics.avgSys}/{metrics.avgDia}</span>
              </div>
            </div>
            <button onClick={() => { setView('dashboard'); setReport(''); }}
              className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase hover:bg-slate-200 transition shrink-0">Закрыть</button>
          </div>
        </div>

        {/* Вкладки */}
        <div className="bg-white border-b px-4 md:px-8 flex gap-4 md:gap-8 shrink-0 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`py-4 border-b-4 text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition ${tab===t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>{t.l}</button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
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
                    {Object.entries(scoring.dom).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).map(([d,v]) => (
                      <DomainBar key={d} letter={d} label={RD.domains[d].name} score={v} max={RD.domains[d].max}/>
                    ))}
                    {Object.values(scoring.dom).every(v=>v===0) && <p className="text-sm text-slate-400 italic">Факторы риска не выявлены</p>}
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

                {/* Паутинка + рекомендации */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-3">Фенотипический профиль A–H</p>
                    <RadarChart scores={scoring.dom}/>
                  </div>
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
                </div>
              </div>
            )}

            {/* ── ДЕТАЛИЗАЦИЯ ────────────────────────────────────────── */}
            {tab === 'explain' && (
              <div className="space-y-6">
                <div className="bg-white p-5 md:p-10 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight border-b pb-3 mb-2">Детализация расчёта</h3>
                    <p className="text-sm text-slate-500 italic">Прозрачная матрица начисления баллов по правилам версии {RD.version}. Все расчёты детерминированы.</p>
                  </div>

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
                    <p className="text-slate-400 italic py-8 text-center">Факторы риска не выявлены. Интегральный балл: 0.</p>
                  )}
                </div>

                {/* Интерпретация результата */}
                <div className="bg-white p-5 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Интерпретация: текущий результат</p>
                  <div className="flex flex-col gap-2">
                    {[
                      { cat:'Низкий',     range:'0–5',  col:'bg-green-500',  active: scoring.riskCat==='Низкий' },
                      { cat:'Умеренный',  range:'6–11', col:'bg-amber-400',  active: scoring.riskCat==='Умеренный' },
                      { cat:'Повышенный', range:'12–17',col:'bg-orange-500', active: scoring.riskCat==='Повышенный' },
                      { cat:'Высокий',    range:'≥ 18', col:'bg-red-500',    active: scoring.riskCat==='Высокий' },
                    ].map(({ cat, range, col, active }) => (
                      <div key={cat} className={`flex items-center gap-4 p-3 rounded-xl border-2 transition ${active ? 'border-slate-700 shadow-md' : 'border-transparent opacity-50'}`}>
                        <div className={`w-4 h-4 rounded-full shrink-0 ${col}`}/>
                        <span className="font-black text-sm text-slate-800 w-28">{cat}</span>
                        <span className="text-xs text-slate-500">{range} баллов</span>
                        {active && (
                          <span className="ml-auto text-[10px] font-black bg-slate-900 text-white px-3 py-1 rounded-lg uppercase tracking-wide">← Текущий результат: {scoring.total} балл.</span>
                        )}
                      </div>
                    ))}
                  </div>
                  {scoring.activeCC.length > 0 && (
                    <p className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-xl p-3 mt-4 font-medium">
                      ⚠ Категория повышена на одну ступень из-за критических сочетаний факторов: {scoring.activeCC.map(c=>c.title).join('; ')}
                    </p>
                  )}
                </div>

                {/* Максимальный балл по доменам */}
                <div className="bg-white p-5 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Вклад по доменам (набрано / максимум)</p>
                  <div className="space-y-3">
                    {Object.entries(RD.domains).map(([d, info]) => {
                      const score = scoring.dom[d] || 0;
                      const pct = Math.min((score / info.max) * 100, 100);
                      const col = pct > 66 ? 'bg-red-500' : pct > 33 ? 'bg-amber-400' : score > 0 ? 'bg-blue-500' : 'bg-slate-200';
                      return (
                        <div key={d} className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-slate-500 w-5">{d}</span>
                          <span className="text-xs text-slate-600 w-44 shrink-0 hidden sm:block">{info.name}</span>
                          <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-700 ${col}`} style={{width:`${pct}%`}}/>
                          </div>
                          <span className="text-xs font-black text-slate-700 w-12 text-right shrink-0">{score}/{info.max}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── ЗАКЛЮЧЕНИЕ ─────────────────────────────────────────── */}
            {tab === 'report' && (
              <div className="space-y-6">
                <div className="bg-white p-5 md:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex flex-wrap justify-between items-center border-b pb-4 gap-3">
                    <h3 className="font-black text-slate-900 uppercase text-sm">Рабочее медицинское заключение</h3>
                    <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg uppercase">Авточерновик — доступен для редактирования</span>
                  </div>
                  <textarea value={report} onChange={e=>setReport(e.target.value)}
                    className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-medium text-slate-700 leading-relaxed outline-none focus:border-blue-400 focus:bg-white transition resize-none"
                    style={{minHeight:'420px'}}/>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button onClick={() => setHistory([...history, { date:new Date().toISOString(), text:report, author:'Врач' }])}
                      className="flex-1 py-4 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 transition">
                      <Save className="w-4 h-4"/> Сохранить редакцию
                    </button>
                    <button onClick={() => navigator.clipboard.writeText(report)}
                      className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 transition">
                      Скопировать текст
                    </button>
                  </div>
                </div>

                {/* Журнал версий — под заключением, горизонтально */}
                {history.length > 0 && (
                  <div className="bg-white p-5 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><History className="w-4 h-4"/> Журнал версий</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {history.slice().reverse().map((h,i) => (
                        <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs relative cursor-pointer hover:border-blue-300 transition" onClick={() => setReport(h.text)}>
                          {i===0 && <span className="absolute -left-1.5 -top-1.5 w-3 h-3 bg-blue-500 rounded-full border-2 border-white"/>}
                          <div className="flex justify-between text-[9px] font-black text-slate-400 mb-2">
                            <span>{new Date(h.date).toLocaleTimeString('ru-RU')}</span>
                            <span>{h.author}</span>
                          </div>
                          <p className="line-clamp-3 text-slate-600 leading-relaxed">{h.text}</p>
                          <p className="text-[9px] text-blue-500 mt-2 font-bold">Нажмите для восстановления</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

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
    <div className="h-screen flex flex-col bg-slate-50 text-slate-900 overflow-hidden">
      <style>{`
        .no-spin::-webkit-outer-spin-button,
        .no-spin::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .no-spin { -moz-appearance: textfield; }
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
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
