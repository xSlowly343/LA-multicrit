# Мульти-крит: подбор билда (Lost Ark KR, патч 18.11.2026)

Статический сайт: механика мульти-крита, формулы, калькулятор и конструктор билда
(Evolution, Enlightenment/Leap, гравировки с Фетранитом, синергии группы).

Открыть: https://xslowly343.github.io/LA-multicrit/

Источники данных: официальный патчноут и Official Armory Lost Ark KR, loagg.com,
Mungga Lab, Inven, daloa.xyz, Maxroll; доли урона скиллов — логи боёв lostark.bible
(топ-логи рейдов, 329 логов, ноябрь 2026). Иконки и эмблемы — материалы Smilegate RPG.

## Загрузка персонажа по нику: прокси на Cloudflare Worker

У Оружейной лостарк.рф нет CORS-заголовков, поэтому сайт не может прочитать страницу
персонажа напрямую. Для этого есть маленький прокси `worker/armory-proxy.js`: он получает
ник, запрашивает страницу персонажа и отдаёт её сайту. Пока прокси не подключён, сайт
загружает персонажа через запасной сервис r.jina.ai.

Развернуть (бесплатный тариф Cloudflare):

1. https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Import a repository** →
   выберите `xSlowly343/LA-multicrit`. Project name: `la-multicrit`, Build command пустой,
   Deploy command `npx wrangler deploy` (настройки берутся из `wrangler.toml` в корне). **Deploy**.
2. После сборки скопируйте адрес Worker, например `https://la-multicrit.nekrozzzzzzzz.workers.dev`.
   Проверка: `https://la-multicrit.nekrozzzzzzzz.workers.dev/?name=Ameyoru` — должна открыться
   страница Оружейной.
3. В репозитории откройте `proxy.json`, нажмите карандаш (Edit) и впишите адрес:
   `{"url": "https://la-multicrit.nekrozzzzzzzz.workers.dev"}`. Commit changes.

Через минуту GitHub Pages обновится, и сайт начнёт загружать персонажей через ваш Worker.
Каждый новый коммит в `main` Cloudflare будет пересобирать Worker сам.

Если сайт переедет на другой домен, добавьте его в `ALLOWED_ORIGINS` в начале
`worker/armory-proxy.js` (или переменной окружения `ALLOWED_ORIGINS` в настройках Worker,
через запятую). Бесплатный тариф: 100 000 запросов в день, ответы кешируются на 5 минут.
