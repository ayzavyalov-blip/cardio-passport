# Кардио-репродуктивный паспорт

Клинический инструмент прегравидарного скрининга рисков для женщин 18–23 лет.

## Структура репозитория

```
├── src/
│   ├── App.tsx        ← ВСЯ ЛОГИКА И ИНТЕРФЕЙС (редактировать здесь)
│   ├── main.tsx       ← Точка входа (не трогать)
│   └── index.css      ← Tailwind (не трогать)
├── index.html         ← HTML-обёртка (не трогать)
├── vite.config.ts     ← Настройки сборщика
├── package.json       ← Зависимости
└── .github/
    └── workflows/
        └── deploy.yml ← Автодеплой на GitHub Pages
```

**Для обновления приложения достаточно отредактировать `src/App.tsx` и запушить в `main`.**  
GitHub Actions автоматически пересоберёт и задеплоит сайт за ~1 минуту.

---

## Первый запуск (один раз)

### 1. Создать репозиторий на GitHub

1. Зайти на [github.com/new](https://github.com/new)
2. Назвать репозиторий, например: `cardio-passport`
3. Выбрать **Public**
4. Нажать **Create repository**

### 2. Настроить vite.config.ts

Открыть файл `vite.config.ts` и заменить `cardio-passport` на имя вашего репозитория:

```ts
base: '/ваше-имя-репозитория/',
```

### 3. Загрузить файлы

```bash
git init
git add .
git commit -m "init"
git branch -M main
git remote add origin https://github.com/ВАШ_ЛОГИН/ВАШ_РЕПО.git
git push -u origin main
```

### 4. Включить GitHub Pages

1. Открыть репозиторий → **Settings** → **Pages**
2. В разделе **Source** выбрать **GitHub Actions**
3. Сохранить

После первого пуша GitHub Actions запустится автоматически.  
Сайт будет доступен по адресу: `https://ВАШ_ЛОГИН.github.io/ВАШ_РЕПО/`

---

## Локальная разработка

```bash
npm install
npm run dev
```

Откроется `http://localhost:5173`

---

## Как обновить приложение

1. Отредактировать `src/App.tsx`
2. Проверить локально: `npm run dev`
3. Запушить:

```bash
git add src/App.tsx
git commit -m "обновление логики расчёта"
git push
```

Через ~60 секунд сайт обновится автоматически.

---

## Хостинг (альтернатива GitHub Pages)

**GitHub Pages** — бесплатно, без ограничений для открытых репо, домен вида `login.github.io/repo`.

Для **собственного домена** (например, через nic.ru):
1. Купить домен на nic.ru
2. В настройках Pages добавить Custom domain
3. На nic.ru прописать CNAME-запись: `ваш-домен → ВАШ_ЛОГИН.github.io`

---

## Зависимости

| Пакет | Версия | Назначение |
|---|---|---|
| react | 18 | UI-фреймворк |
| lucide-react | 0.383 | Иконки |
| tailwindcss | 3 | CSS-утилиты |
| vite | 5 | Сборщик |
