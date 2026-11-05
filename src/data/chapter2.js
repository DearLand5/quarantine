// Глава 2 «Котельная». Все данные главы регистрируются в общих таблицах (сообщения, диалоги, задания,
// предметы, улики, фото), чтобы системы оставались общими. Сюжет зависит от решений первой главы.
import { t2, day2 } from '../utils/time.js';
import { SEQUENCES, AMBIENT, RESPONSES } from './messages.js';
import { DIALOGUES } from './dialogues.js';
import { QUESTS } from './quests.js';
import { ITEMS, CLUES } from './items.js';
import { CHARACTERS } from './characters.js';
import { PHOTO_META, PAINT_2D } from '../phone/PhotoFactory.js';
import { Random } from '../utils/Random.js';

// ------------------------------------------------------------------ задания, предметы, улики
Object.assign(QUESTS, {
  c2_main: { title: 'Котельная', objectives: [
    { id: 'read', text: 'Прочитать, что писали соседи за день' },
    { id: 'key', text: 'Найти ключ от котельной (кв. 45)' },
    { id: 'power', text: 'Включить питание лифта на щитке в коридоре' },
    { id: 'ride', text: 'В кабине зажать «Стоп» и «П»' },
    { id: 'door3', text: 'Открыть дверь 3 в котельную' },
    { id: 'find', text: 'Найти Саныча' },
  ] },
  c2_truth: { title: 'Объект 17', objectives: [
    { id: 'tape', text: 'Послушать плёнку на магнитофоне' },
    { id: 'decide', text: 'Решить, что делать с резонатором' },
    { id: 'escape', text: 'Вернуться к лифту и подняться' },
  ] },
});

Object.assign(ITEMS, {
  key_boiler: { name: 'Ключ от котельной', icon: '🗝️', desc: 'Длинный бородчатый ключ на кольце с жестяной биркой «Котельная. Дв. 3». Бирка подписана рукой Петра Крылова.' },
  walkie: { name: 'Детская рация', icon: '📻', desc: 'Пластмассовая рация Сони, вторая из пары. Марина сказала: «Соня говорит, по ней ночью кто-то разговаривает». Шипит, когда рядом что-то не так.' },
  crowbar: { name: 'Монтировка Лапина', icon: '🔧', desc: 'Тяжёлая, в ржавчине. Геннадий Борисович отдал её молча. Подойдёт, чтобы отжать заевшую дверь.' },
  sanych_phone: { name: 'Телефон Саныча', icon: '📱', desc: 'Кнопочный телефон дворника. Последнее неотправленное сообщение: «не верьте мне если я поднимусь». В галерее — три снимка.' },
  tape_1984: { name: 'Плёнка «Запись 14»', icon: '🎞️', desc: 'Катушка магнитной ленты. На коробке: «Зап. 14. 20.III.89. Крылов, Ветров. НЕ КОПИРОВАТЬ».', clue: 'tape_1984' },
});

Object.assign(CLUES, {
  sanych_voice: { title: 'Голосовое Саныча', text: 'Голосовое от Саныча пришло через сутки после того, как он пропал: лифт ходит в подвал, ключ у Зины, «не открывайте, если я сам поднимусь».' },
  tenth_floor: { title: 'Десятый этаж', text: 'УК объявила, что эвакуацию начнут с десятого этажа. В доме девять этажей.' },
  sanych_photos: { title: 'Снимки Саныча', text: 'На последнем снимке Саныча — сам Саныч, со спины, лицом к светящейся стене. Кто его снимал?' },
  chalk: { title: 'Надпись мелом', text: '«Не отвечать им. Они не знают твой голос, пока ты молчишь. — П.К. 1990».' },
  tape_1984: { title: 'Запись 14', text: 'Резонатор держит девятнадцать голосов, хотя закладывали шесть. Если отключить сеть, дом забудет всех, кого записал, — даже живых.' },
  sanych_echo: { title: 'Саныч внизу', text: 'Саныч стоял лицом к стене и отвечал только фразами из чата. Потом свет погас, и его не стало.' },
  graf: { title: 'Ошейник Графа', text: 'В сарайке номер 23 — ошейник Графа. Застёгнутый. Без собаки.' },
});

// ------------------------------------------------------------------ фотографии Саныча
Object.assign(PHOTO_META, {
  sanych_1: { caption: 'Подвал, 19:31', tags: ['basement', 'hatch'] },
  sanych_2: { caption: 'Подвал, 19:38', tags: ['lab'] },
  sanych_3: { caption: 'Подвал, 19:40', tags: ['lab', 'sanych'] },
});

function photoCanvas(seed, draw) {
  const c = document.createElement('canvas');
  c.width = 480; c.height = 360;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0a0a09'; ctx.fillRect(0, 0, 480, 360);
  draw(ctx, new Random(seed));
  const img = ctx.getImageData(0, 0, 480, 360);
  const r = new Random(seed + 1);
  for (let i = 0; i < img.data.length; i += 4) { const n = (r.next() - 0.5) * 40; img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n; }
  ctx.putImageData(img, 0, 0);
  return c;
}

Object.assign(PAINT_2D, {
  sanych_1: () => photoCanvas(31, (ctx) => {
    ctx.fillStyle = '#2a2620'; ctx.fillRect(0, 230, 480, 130);
    ctx.fillStyle = '#000'; ctx.fillRect(170, 220, 150, 80);
    ctx.strokeStyle = '#6a5a44'; ctx.lineWidth = 6; ctx.strokeRect(165, 216, 160, 88);
    ctx.strokeStyle = '#555'; ctx.lineWidth = 4;
    for (const x of [215, 275]) { ctx.beginPath(); ctx.moveTo(x, 222); ctx.lineTo(x, 300); ctx.stroke(); }
    for (let y = 232; y < 300; y += 14) { ctx.beginPath(); ctx.moveTo(215, y); ctx.lineTo(275, y); ctx.stroke(); }
    const g = ctx.createRadialGradient(245, 180, 0, 245, 180, 260);
    g.addColorStop(0, 'rgba(255,250,220,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 480, 360);
  }),
  sanych_2: () => photoCanvas(32, (ctx) => {
    for (let row = 0; row < 7; row++) for (let col = 0; col < 12; col++) {
      const x = col * 42 + (row % 2) * 21, y = row * 38 + 20;
      ctx.fillStyle = `rgba(${90 + (col * 7) % 40},${100 + (row * 11) % 50},210,${0.3 + ((row + col) % 4) / 8})`;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) { const a = Math.PI / 3 * k; ctx.lineTo(x + Math.cos(a) * 18, y + Math.sin(a) * 18); }
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 280, 480, 80);
  }),
  sanych_3: () => photoCanvas(33, (ctx) => {
    for (let row = 0; row < 7; row++) for (let col = 0; col < 12; col++) {
      const x = col * 42 + (row % 2) * 21, y = row * 38 + 10;
      ctx.fillStyle = `rgba(110,120,220,${0.25 + ((row * 3 + col) % 5) / 10})`;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) { const a = Math.PI / 3 * k; ctx.lineTo(x + Math.cos(a) * 18, y + Math.sin(a) * 18); }
      ctx.fill();
    }
    // Саныч со спины, в ватнике, лицом к стене
    ctx.fillStyle = '#121310';
    ctx.beginPath(); ctx.ellipse(240, 120, 30, 36, 0, 0, 7); ctx.fill();
    ctx.fillRect(190, 150, 100, 170);
    ctx.fillStyle = '#20221c'; ctx.fillRect(196, 160, 88, 6);
    ctx.fillStyle = '#e8ffe8'; ctx.font = '14px "PT Mono", monospace';
    ctx.fillText('27.10  19:40', 360, 345);
  }),
});

// ------------------------------------------------------------------ дневная хроника (вставляется в начале главы)
export function dayLog(c) {
  const zinaGone = c.flag('zina_missing');
  const opened = c.ch1Outcome() === 'opened';
  const log = [
    { chat: 'house', at: '08:02', from: 'uk', text: 'Уважаемые жители! Режим ограничений сохраняется. Гуманитарная помощь будет поднята к окнам первого этажа в 12:00.' },
    { chat: 'house', at: '08:15', from: 'gennady', text: 'Внимание. Воду распределяю я. Списки у меня. Без самодеятельности.' },
    { chat: 'house', at: '08:17', from: 'denis', text: 'распределяет воду, которой у него сорок бутылок в прихожей. я видел' },
    { chat: 'house', at: '08:17', from: 'gennady', text: 'Шаров.' },
    { chat: 'house', at: '09:40', from: 'olga', text: 'У кого ночью стучали — отметьтесь, пожалуйста. Хочу понять, по каким этажам это шло.' },
    { chat: 'house', at: '09:42', from: 'artur', text: 'У нас на 3-м стучали в 37 и 38. Граф лаял до утра.' },
    { chat: 'house', at: '09:44', from: 'lisa', text: 'у нас на 7м тихо. только шаги в 61й, а там с весны никто не живёт' },
    { chat: 'house', at: '12:31', from: 'marina', text: c.flag('inhaler_delivered') ? 'Спасибо всем, кто помог ночью. Соня в порядке, рисует.' : 'Соне лучше. Сами справились.' },
    { chat: 'house', at: '14:05', from: 'artur', text: 'Граф сбежал!!! Выскочил, когда военные открывали дверь подъезда, и побежал ВНИЗ. В подвал. Двери в подвал ведь заперты?..' },
    { chat: 'house', at: '14:06', from: 'gennady', text: 'Заперты. Ключи у меня и у Мухина.' },
    { chat: 'house', at: '14:07', from: 'denis', text: 'Мухин — это Саныч. Который со вчерашнего вечера в подвале' },
    { chat: 'house', at: '16:20', from: 'uk', text: 'Информация: завтра с 09:00 начнётся поэтапный вывод жителей. Первым выводится 10 этаж.' },
    { chat: 'house', at: '16:21', from: 'lisa', text: 'какой десятый. у нас девять этажей' },
    { chat: 'house', at: '16:24', from: 'denis', text: 'опечатка. наверное' },
    { chat: 'house', at: '19:12', from: 'vetrov', text: 'сутки.' },
    { chat: 'house', at: '19:13', from: 'olga', text: 'Что «сутки»?' },
    { chat: 'house', at: '19:13', from: 'denis', text: 'сутки как Саныч пропал. 19:12. он это время пишет' },
  ];
  if (zinaGone) {
    log.push(
      { chat: 'house', at: '10:02', from: 'marina', text: 'Зинаида Павловна, вы как? Ответьте, пожалуйста' },
      { chat: 'house', at: '10:30', from: 'olga', text: 'Геннадий Борисович, у вас есть ключ от 45-й?' },
      { chat: 'house', at: '10:41', from: 'gennady', text: 'Дверь закрыта изнутри на цепочку. Я стучал. Тикают часы.' },
      { chat: 'house', at: '21:52', from: 'zinaida', text: 'кирюша зайди ко мне' },
      { chat: 'house', at: '21:52', from: 'marina', text: 'ЗИНАИДА ПАВЛОВНА!! вы живы?? ответьте!!' },
    );
  } else {
    log.push(
      { chat: 'house', at: '10:05', from: 'zinaida', text: 'всем доброе утро я живая не открывала никому' },
      { chat: 'house', at: '10:06', from: 'artur', text: 'Зинаида Павловна, вы лучшая' },
    );
  }
  if (opened) {
    log.push(
      { chat: 'house', at: '03:12', from: 'player', fake: true, text: 'я в коридоре. откройте. это Кирилл' },
      { chat: 'house', at: '07:30', from: 'marina', text: 'Кирилл, это вы писали в три ночи?' },
      { chat: 'house', at: '07:41', from: 'denis', text: 'не отвечает. камера показывает, что из 47 ночью никто не выходил' },
    );
  }
  log.push(
    { chat: 'mom', at: '09:10', from: 'mom', text: 'Кирюш, по телевизору сказали, всё под контролем и завтра вас начнут выводить. Ты ел?' },
    { chat: 'mom', at: '11:22', from: 'mom', text: 'Кирилл, ответь. Я волнуюсь' },
    { chat: 'denis', at: '06:40', from: 'denis', text: zinaGone
      ? 'не спал. пересмотрел камеру. в 4:10 по коридору прошла Зинаида Павловна. в ночнушке. туда-обратно двенадцать раз. а утром её дверь закрыта изнутри'
      : 'не спал. пересмотрел камеру. в 4:10 у 52й опять стоял этот длинный. потом подошёл к твоей двери. постоял. ушёл' },
    { chat: 'irina', at: '09:05', from: 'irina', text: 'Кирилл, доброе утро! Заказчик ждёт. Пришлёте хотя бы первую половину? 😊' },
  );
  return log.map((m) => ({ ...m, at: day2(m.at), read: m.at < '21:00' }));
}

// ------------------------------------------------------------------ цепочки сообщений главы 2
Object.assign(SEQUENCES, {
  c2_intro: [
    { chat: 'mchs', from: 'mchs', delay: 2, typing: 0, text: 'ОПОВЕЩЕНИЕ: Жителям д. 14 по ул. Тополиная. Завтра с 09:00 — поэтапный вывод. Ожидайте у дверей квартир. Двери не открывать до команды «Свои».' },
    { chat: 'house', from: 'lisa', delay: 6, text: '«свои». господи. пароль как в кино' },
    { chat: 'house', from: 'artur', delay: 3, text: 'Граф так и не вернулся. Я слышу, как он лает. Снизу. Из вентиляции.' },
  ],
  c2_sanych_voice: [
    { chat: 'house', from: 'sanych', key: 'san_v', voice: { duration: 14, transcript: '…кто слышит… это Саныч. Лифт… лифт ходит вниз. Включите на щитке «ЛИФТ», в кабине зажать «Стоп» и «П» разом… Я в котельной, дверь три… ключ у Зины, Пётр ей оставлял… И это… если я сам к вам поднимусь — не открывайте. Не открывайте мне.' } },
    { do: (c) => { c.setFlag('c2_know_lift'); c.clue('sanych_voice'); } },
    { chat: 'house', from: 'denis', delay: 4, typing: 4, text: 'ЧТО. это Саныч??' },
    { chat: 'house', from: 'denis', delay: 2, typing: 5, text: 'стоп. по времени отправки — 19:12 вчера. оно сутки висело в отправке' },
    { chat: 'house', from: 'olga', delay: 3, typing: 6, text: 'Если он жив — ему нужна помощь. Сутки без воды. Кто-нибудь может спуститься?' },
    { chat: 'house', from: 'gennady', delay: 3, text: 'Никто никуда не спускается. Лифт отключён штабом.' },
    { chat: 'house', from: 'artur', delay: 3, text: 'Граф тоже внизу…' },
    {
      choice: {
        id: 'c2_go', chat: 'house', timeout: 30,
        options: [
          { id: 'go', text: 'Я спущусь. Денис, смотри камеру в коридоре.', intents: ['offer_help', 'agree'], do: (c) => { c.setFlag('c2_announced'); c.rel.adjust('olga', { trust: 8 }); c.rel.adjust('denis', { trust: 5 }); c.rel.adjust('gennady', { trust: -5 }); }, next: 'c2_go_yes' },
          { id: 'trap', text: 'Это может быть не он. Саныч сам просит ему не открывать.', intents: ['disagree', 'ask_knock'], do: (c) => { c.setFlag('c2_doubt'); c.rel.adjust('gennady', { trust: 3 }); }, next: 'c2_go_doubt' },
        ],
      },
    },
  ],
  c2_go_yes: [
    { chat: 'house', from: 'denis', text: 'смотрю. внизу связи не будет, имей в виду' },
    { chat: 'house', from: 'gennady', delay: 3, text: 'Ермаков, я запрещаю.' },
    { chat: 'house', from: 'olga', delay: 3, text: 'Возьмите воду. И фонарь.' },
  ],
  c2_go_doubt: [
    { chat: 'house', from: 'denis', typing: 4, text: 'логично. но если это он — он там сутки сидит' },
    { chat: 'house', from: 'zinaida', delay: 5, cond: (c) => !c.flag('zina_missing'), typing: 7, text: 'Кирюша зайди ко мне есть у Пети ключ от котельной я думаю пора' },
  ],
  c2_zina_alive: [
    { chat: 'zinaida', from: 'zinaida', typing: 8, text: 'Кирюша зайди ко мне. Петин ключ от котельной у меня. Я думаю пора' },
    { chat: 'zinaida', from: 'zinaida', delay: 3, typing: 5, text: 'только сначала постучи и скажи кто ты' },
  ],
  c2_zina_echo: [
    { chat: 'zinaida', from: 'zinaida', typing: 6, text: 'кирюша зайди ко мне' },
    { chat: 'zinaida', from: 'zinaida', delay: 4, typing: 6, text: 'ключ на серванте' },
    { chat: 'zinaida', from: 'zinaida', delay: 4, typing: 3, text: 'дверь открыта' },
    { do: (c) => c.setFlag('c2_zina_echo_sent') },
  ],
  c2_mom: [
    { chat: 'mom', from: 'mom', typing: 4, text: 'Кирюша, по телевизору сказали — вас завтра выводят. С десятого этажа.' },
    { chat: 'mom', from: 'mom', delay: 2, typing: 3, text: 'У вас же девять этажей?' },
    { do: (c) => c.clue('tenth_floor') },
  ],
  c2_gena_lift: [
    { chat: 'house', from: 'gennady', typing: 3, text: 'Кто включил лифт?' },
    { chat: 'house', from: 'denis', delay: 3, text: 'лифт сам приехал на шестой. я на камере видел. двери открылись и стоят' },
  ],
  c2_lab_flood: [
    { chat: 'denis', from: 'denis', delay: 1, typing: 0, text: 'кирилл' },
    { chat: 'denis', from: 'denis', delay: 0.6, typing: 0, text: 'ты где. связи нет у тебя' },
    { chat: 'denis', from: 'denis', delay: 0.6, typing: 0, text: 'у твоей двери кто-то стоит' },
    { chat: 'denis', from: 'denis', delay: 0.6, typing: 0, text: 'это ты?? ты же внизу' },
    { chat: 'denis', from: 'denis', delay: 0.6, typing: 0, text: 'стучит. три раза. к тебе домой' },
    { chat: 'house', from: 'sanych', delay: 1.4, typing: 0, text: 'я поднимаюсь' },
    { chat: 'house', from: 'olga', delay: 0.8, typing: 0, text: 'Александр?! Где вы?' },
    { chat: 'house', from: 'sanych', delay: 0.8, typing: 0, text: 'на шестом. откройте' },
    { do: (c) => c.phone.glitch() },
  ],
  c2_escaped: [
    { chat: 'house', from: 'denis', delay: 3, typing: 2, text: 'кирилл!!! ты вернулся?? лифт пришёл' },
    { chat: 'house', from: 'olga', delay: 3, typing: 3, text: 'Кирилл, вы целы? Что там внизу?' },
  ],
});

// Бытовые разговоры главы 2
AMBIENT.push(
  { id: 'c2_ration', chapter: 2, steps: [
    { from: 'lisa', text: 'кто-нибудь пробовал сухпаёк? там галеты, которыми можно забивать гвозди' },
    { from: 'artur', text: 'Я забил. Полка держится.' },
    { from: 'zinaida', cond: (c) => !c.flag('zina_missing'), typing: 6, text: 'галеты надо в чае размачивать девочки мальчики' },
  ] },
  { id: 'c2_list', chapter: 2, steps: [
    { from: 'olga', typing: 6, text: 'Завтра выводят. Соберите документы, лекарства, воду. Детей и пожилых — первыми, я договорюсь.' },
    { from: 'gennady', text: 'Договариваюсь я.' },
    { from: 'olga', text: 'Договаривайтесь вместе со мной, Геннадий Борисович.' },
  ] },
  { id: 'c2_graf', chapter: 2, steps: [
    { from: 'artur', text: 'Он опять лает. Под полом. Я лёг на пол и слушал. Он лает, как будто зовёт' },
    { from: 'marina', text: 'Артур, ложитесь спать, пожалуйста' },
  ] },
);

Object.assign(RESPONSES.denis, {
  c2_basement: ['внизу связи нет. если что — кричи. шучу. не кричи'],
});

// ------------------------------------------------------------------ разговоры вживую (глава 2)
function addEntries(npc, entries, nodes) {
  const g = DIALOGUES[npc];
  g.entries.unshift(...entries);
  Object.assign(g.nodes, nodes);
}

addEntries('zinaida', [
  { cond: (c) => c.chapter === 2 && !c.hasItem('key_boiler'), node: 'c2_key' },
  { cond: (c) => c.chapter === 2, node: 'c2_after' },
], {
  c2_key: {
    text: 'Пришёл. Садись… нет, некогда, вижу. Вот. Петин ключ от котельной, на бирке его рукой написано. Я его сорок лет на гвоздике держала.',
    do: (c) => { c.give('key_boiler'); c.quest.objective('c2_main', 'key'); },
    choices: [
      { text: 'Что ещё говорил Пётр про подвал?', next: 'c2_petya' },
      { text: 'Спасибо. Я найду Саныча.', next: 'c2_bye' },
    ],
  },
  c2_petya: {
    text: 'Говорил: если дом заговорит, надо выключить «сеть». Красный рубильник. А потом добавлял: «Только тогда он замолчит навсегда, Зина. Со всеми, кого запомнил». Я не поняла тогда. И сейчас не понимаю.',
    mood: 'тихо',
    do: (c) => c.setFlag('c2_know_switch'),
    next: 'c2_bye',
  },
  c2_bye: { text: 'Иди. И не отвечай там никому, Кирюша. Петя мелом на стене писал: «Не отвечать». Я видела.', end: true },
  c2_after: { text: 'Нашёл Саныча? Нет? Иди, иди, Кирюша. Я тут посижу, часы послушаю.', end: true },
});

addEntries('marina', [
  { cond: (c) => c.chapter === 2 && !c.flag('c2_marina_talk') && c.rel.get('marina').trust >= 15, node: 'c2_walkie' },
  { cond: (c) => c.chapter === 2 && !c.flag('c2_marina_talk'), node: 'c2_cold' },
  { cond: (c) => c.chapter === 2, node: 'c2_after' },
], {
  c2_walkie: {
    text: 'Кирилл, вы правда пойдёте вниз? Подождите. Соня просила передать.',
    do: (c) => c.setFlag('c2_marina_talk'),
    next: 'c2_walkie2',
  },
  c2_walkie2: {
    text: 'Её рация, вторая из пары. Она говорит, ночью по ней кто-то разговаривает. Я думала, фантазии… Но она шипит каждый раз перед тем, как в коридоре стучат. Возьмите. Пожалуйста.',
    do: (c) => c.give('walkie'),
    end: true,
  },
  c2_cold: { text: 'Кирилл… Простите, я не могу сейчас. Соня плохо спит. Будьте осторожны.', do: (c) => c.setFlag('c2_marina_talk'), end: true },
  c2_after: { text: 'Возвращайтесь, Кирилл. Соня спрашивает, вернётся ли «дядя, который принёс лекарство».', end: true },
});

addEntries('gennady', [
  { cond: (c) => c.chapter === 2 && c.npcActivity('gennady') === 'guard' && !c.flag('c2_gena_met'), node: 'c2_lift' },
], {
  c2_lift: {
    text: 'Ермаков. Это вы лифт включили? Штаб его отключил не просто так.',
    do: (c) => c.setFlag('c2_gena_met'),
    choices: [
      { text: 'Саныч внизу сутки. Я его найду и вернусь.', cond: (c) => c.flag('kept_gena_secret') || c.rel.get('gennady').trust >= 5 || c.rel.get('gennady').respect >= 10, do: (c) => { c.setFlag('c2_gena_help'); c.give('crowbar'); c.rel.adjust('gennady', { trust: 10 }); }, next: 'c2_lift_help' },
      { text: 'Саныч внизу сутки. Я его найду и вернусь.', cond: (c) => !(c.flag('kept_gena_secret') || c.rel.get('gennady').trust >= 5 || c.rel.get('gennady').respect >= 10), do: (c) => { c.setFlag('c2_gena_hostile'); c.rel.adjust('gennady', { trust: -5 }); }, next: 'c2_lift_no' },
      { text: 'Вы же сами слышите шаги в 52-й. Это всё связано, и вы знаете.', cond: (c) => c.flag('gena_confessed'), do: (c) => { c.setFlag('c2_gena_help'); c.give('crowbar'); c.rel.adjust('gennady', { respect: 10 }); }, next: 'c2_lift_help' },
    ],
  },
  c2_lift_help: { text: '…Держите. Монтировка — дверь три у них вечно заедает. Я постою здесь. Лифт никуда не денется, пока я стою. Слышите? Никуда.', mood: 'не глядя в глаза', end: true },
  c2_lift_no: { text: 'Спускайтесь, раз такой умный. Но ждать вас я не буду. Лифт поднимется — я его отключу.', mood: 'холодно', end: true },
});

// Ночные правила дверей из главы 1 во второй главе не действуют: соседи ждут Кирилла
for (const id of ['zinaida', 'marina', 'gennady', 'denis']) {
  const base = DIALOGUES[id].door;
  DIALOGUES[id].door = (c) => {
    if (c.chapter !== 2) return base ? base(c) : 'open';
    if (id === 'zinaida' && c.flag('zina_missing')) return null;
    if (id === 'denis' && c.rel.get('denis').trust < 10) return { say: 'Кирилл? Я тебя вижу на камере. Не открою, извини. Пиши.', who: 'denis' };
    return 'open';
  };
}

// Саныч внизу и пульт резонатора — отдельные «собеседники»
DIALOGUES.sanych_echo = {
  entries: [{ node: 's1' }],
  nodes: {
    s1: { speaker: 'sanych_echo', name: 'Саныч', text: 'В подвале вода. Перекрыл стояк.', mood: 'не оборачивается', next: 's2' },
    s2: { speaker: 'sanych_echo', name: 'Саныч', text: 'Там ещё дверь какая-то старая открылась, гляну.', next: 's3' },
    s3: { speaker: 'sanych_echo', name: 'Саныч', text: 'это чё', mood: 'тем же голосом, что в чате', next: 's4' },
    s4: {
      speaker: 'sanych_echo', name: 'Саныч', text: 'Кирилл. Твой голос мы ещё не знаем. Скажи что-нибудь.',
      choices: [
        { text: 'Саныч, это я. Пойдёмте наверх.', do: (c) => { c.setFlag('c2_gave_voice'); c.rel.adjust('denis', { trust: 0 }); }, next: 's_voice' },
        { text: 'Кто вы?', do: (c) => c.setFlag('c2_gave_voice'), next: 's_voice' },
        { text: '(Промолчать)', do: (c) => c.setFlag('c2_kept_silent'), next: 's_silent' },
      ],
    },
    s_voice: { speaker: 'sanych_echo', name: 'Саныч', text: '«Саныч, это я. Пойдёмте наверх», — повторяет он. Твоим голосом. Слово в слово.', mood: 'медленно поворачивает голову', end: true },
    s_silent: { speaker: 'sanych_echo', name: 'Саныч', text: '…Молчит. Ладно. Молчи. Тебя нет. Тебя нет. Тебя нет.', mood: 'голос всё тише', end: true },
  },
};

DIALOGUES.c2_console = {
  entries: [{ node: 'c1' }],
  nodes: {
    c1: {
      speaker: 'narrator', name: 'Резонатор «Кристалл-М»',
      text: (c) => `Пульт гудит. Лампы мигают в такт твоему дыханию. Красный рубильник «СЕТЬ». Микрофон на стойке.${c.flag('c2_tape_heard') ? ' На магнитофоне — плёнка «Запись 14».' : ''}`,
      choices: [
        { text: 'Опустить рубильник «СЕТЬ»', tag: 'дом забудет всех', do: (c) => c.ch2.decide('shutdown'), next: null },
        { text: 'Сказать в микрофон: «Не открывайте никому. Это Кирилл»', tag: 'дом выучит твой голос', do: (c) => c.ch2.decide('record'), next: null },
        { text: 'Забрать плёнку и уйти', tag: 'доказательство', cond: (c) => c.flag('c2_tape_heard'), do: (c) => c.ch2.decide('tape'), next: null },
        { text: 'Отойти от пульта', next: null },
      ],
    },
  },
};

// Плёнка 1984 года: реплики проигрываются по очереди
export const TAPE_LINES = [
  { who: 'Пётр Крылов', pitch: 96, text: 'Запись четырнадцать. Двадцатое марта восемьдесят девятого. Крылов, Ветров.' },
  { who: 'Пётр Крылов', pitch: 96, text: 'Резонатор держит девятнадцать голосов. Девятнадцать, Коля. Мы закладывали шесть.' },
  { who: 'Николай Ветров', pitch: 122, text: 'Петя, он отвечает без запроса. Я ему ничего не говорил, а он сказал «Зина».' },
  { who: 'Пётр Крылов', pitch: 96, text: 'Бетон пишет всё, что слышит. Весь дом — лента. А резонатор её проигрывает. Обратно, в людей.' },
  { who: 'Николай Ветров', pitch: 122, text: 'А если отключить сеть?' },
  { who: 'Пётр Крылов', pitch: 96, text: 'Тогда дом забудет. Всё, что записал. И всех, кого записал. Даже если они ещё живы.' },
  { who: 'Пётр Крылов', pitch: 96, text: '…Стучат. Коля, ты слышишь? Три раза.' },
];

// ------------------------------------------------------------------ расписания жильцов в главе 2
CHARACTERS.gennady.schedule.unshift(
  { when: (c) => c.chapter === 2 && c.flag('lift_power') && !c.flag('c2_gena_met') && !c.flag('c2_in_basement'), at: 'lift', activity: 'guard' },
  { when: (c) => c.chapter === 2 && c.flag('c2_gena_help') && c.flag('c2_in_basement') && !c.flag('c2_escaped'), at: 'lift', activity: 'guard' },
);
CHARACTERS.denis.schedule.unshift({ when: (c) => c.chapter === 2, at: 'in49', activity: 'home' });

// ------------------------------------------------------------------ события главы 2
export const CH2_EVENTS = [
  { id: 'c2_intro', chapter: 2, cond: () => true, do: (c) => { c.quest.start('c2_main'); c.runSeq('c2_intro'); } },
  { id: 'c2_sanych', chapter: 2, cond: (c) => c.since('c2_intro') > 40, do: (c) => c.runSeq('c2_sanych_voice') },
  { id: 'c2_zina', chapter: 2, cond: (c) => c.since('c2_sanych') > 45, do: (c) => c.runSeq(c.flag('zina_missing') ? 'c2_zina_echo' : 'c2_zina_alive') },
  { id: 'c2_mom', chapter: 2, cond: (c) => c.time >= t2('22:40'), do: (c) => c.runSeq('c2_mom') },
  { id: 'c2_door45', chapter: 2, cond: (c) => c.flag('c2_zina_echo_sent') && c.near(-8, -0.6, 2.6), do: (c) => c.ch2.door45Opens() },
  { id: 'c2_lift_msg', chapter: 2, cond: (c) => c.flag('lift_power') && c.since('c2_intro') > 0, do: (c) => c.runSeq('c2_gena_lift') },
  { id: 'c2_lab_flood', chapter: 2, cond: (c) => c.playerRoom() === 'b_lab', do: (c) => c.runSeq('c2_lab_flood') },
  { id: 'c2_end', chapter: 2, cond: (c) => c.flag('c2_escaped') && c.since('c2_escape_ev') > 14 && !c.busy(), do: (c) => c.story.finishChapter() },
  { id: 'c2_escape_ev', chapter: 2, cond: (c) => c.flag('c2_escaped'), do: (c) => c.runSeq('c2_escaped') },
];
