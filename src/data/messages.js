// Переписки: история до начала игры, сюжетные цепочки сообщений, бытовые разговоры и ответы на свободный ввод.
// Формат шага цепочки:
//   { from, text, key?, reply?, photo?, voice?, delay?, typing?, chat? }   — входящее сообщение
//   { sys: 'текст' }                                                        — системное сообщение чата
//   { edit: key, text }, { del: key }                                       — исправление / удаление
//   { wait: сек }  { do: (c) => … }  { run: 'id' }  { cond: (c) => bool }   — служебные шаги
//   { choice: { id, chat?, options: [{ id, text, intents, cond, do, next }], timeout?, onTimeout? } }
// delay — пауза перед началом набора (реальные секунды), typing — длительность «печатает…».
import { t } from '../utils/time.js';

export const GROUP = 'house';

export const CHATS = {
  house: { type: 'group', title: 'Тополиная 14 · подъезд 2 🏠', members: ['zinaida', 'marina', 'denis', 'gennady', 'olga', 'sanych', 'lisa', 'artur', 'uk'], visible: true, muted: false },
  mchs: { type: 'sms', title: 'ОПОВЕЩЕНИЕ', with: 'mchs', visible: true, readonly: true },
  mom: { type: 'dm', with: 'mom', visible: true, outside: true },
  lyosha: { type: 'dm', with: 'lyosha', visible: true, outside: true },
  irina: { type: 'dm', with: 'irina', visible: true, outside: true },
  denis: { type: 'dm', with: 'denis', visible: true },
  zinaida: { type: 'dm', with: 'zinaida', visible: true },
  gennady: { type: 'dm', with: 'gennady', visible: true },
  marina: { type: 'dm', with: 'marina', visible: false },
  olga: { type: 'dm', with: 'olga', visible: false },
  unknown: { type: 'sms', with: 'unknown', visible: false },
  vetrov: { type: 'dm', with: 'vetrov', visible: false },
};

// ---------------------------------------------------------------- история до начала игры
export const HISTORY = {
  house: [
    { at: '17:52', from: 'uk', text: 'Уважаемые жители! По распоряжению штаба ГОЧС дом временно закрыт для входа и выхода. Причина уточняется. Просим сохранять спокойствие.' },
    { at: '17:53', from: 'artur', text: 'В смысле закрыт? Я с собакой вышел и меня обратно еле пустили' },
    { at: '17:53', from: 'lisa', text: 'у подъезда военные стоят. реально военные' },
    { at: '17:55', from: 'gennady', text: 'Без паники. Я на связи со штабом. Всем оставаться по квартирам.' },
    { at: '17:55', from: 'denis', text: '«на связи со штабом» = посмотрел в окно' },
    { at: '17:56', from: 'gennady', text: 'Шаров, ваш сарказм неуместен.' },
    { at: '18:04', from: 'olga', text: 'Добрый вечер всем. Я медсестра, кв. 31. Если кому-то станет плохо — пишите сюда, подскажу. Чем смогу.' },
    { at: '18:05', from: 'zinaida', text: 'Олечка спасибо тебе дай бог здоровья' },
    { at: '18:20', from: 'marina', text: 'Кто-нибудь знает, надолго? У Сони завтра школа, а у меня отчёт' },
    { at: '18:21', from: 'lisa', text: 'школа отменяется, поздравляю Соню 🎉' },
    { at: '18:40', from: 'artur', text: 'Мне по телефону сказали утечка газа. Газовиков что-то не видно.' },
    { at: '18:41', from: 'denis', text: 'газовики в противогазах и с автоматами. новая форма' },
    { at: '18:41', from: 'gennady', text: 'Не распространяйте слухи.' },
    { at: '19:10', from: 'sanych', text: 'В подвале вода. Перекрыл стояк. Там ещё дверь какая-то старая открылась, гляну' },
    { at: '19:12', from: 'sanych', photo: 'basement_hatch', text: '' },
    { at: '19:12', from: 'sanych', text: 'это чё' },
    { at: '19:14', from: 'denis', text: 'Саныч ты где это? это у нас в подвале??' },
    { at: '19:20', from: 'olga', text: 'Александр, ответьте, пожалуйста' },
    { at: '19:46', from: 'zinaida', text: 'Саныч не отвечает может связь там не берёт в подвале всегда не берёт' },
    { at: '20:30', from: 'uk', text: 'Информация: подача газа в дом прекращена. Электроснабжение и водоснабжение в штатном режиме.' },
    { at: '20:31', from: 'artur', text: 'Значит всё-таки газ?' },
    { at: '20:31', from: 'denis', text: 'значит всё-таки «причина уточняется»' },
    { at: '21:02', from: 'lisa', text: 'у кого нибудь есть зарядка тайпси… а, ну да. никто не принесёт 🙃' },
    { at: '21:30', from: 'artur', text: 'Граф скулит у двери уже час. Кто-нибудь знает, можно ли вывести собаку на лестницу хотя бы' },
  ],
  mchs: [
    { at: '17:48', from: 'mchs', text: 'МЧС РОССИИ: на территории ул. Тополиная, д. 14 вводится режим ЧС. Следуйте указаниям штаба. Тел. 112' },
  ],
  mom: [
    { at: '25.10 19:02', from: 'mom', text: 'Кирюш, ты поел?' },
    { at: '25.10 19:40', from: 'player', text: 'да мам' },
    { at: '25.10 19:41', from: 'mom', text: 'Что поел?' },
    { at: '25.10 21:15', from: 'player', text: 'пельмени))' },
    { at: '25.10 21:15', from: 'mom', text: '🙈' },
  ],
  lyosha: [
    { at: '24.10 23:10', from: 'lyosha', text: 'в субботу футбол в силе?' },
    { at: '24.10 23:30', from: 'player', text: 'в силе. если опять не дождь' },
    { at: '24.10 23:31', from: 'lyosha', text: 'дождь это для слабаков' },
  ],
  irina: [
    { at: '25.10 11:20', from: 'irina', text: 'Кирилл, добрый день! Отправила вам инструкцию к насосу ЦНС-60, 48 страниц. Срок — вторник, 9:00 😊' },
    { at: '25.10 11:42', from: 'player', text: 'Принял, спасибо' },
  ],
  denis: [
    { at: '03.10 20:11', from: 'denis', text: 'привет, это Денис из 49. у тебя вайфай тоже лагает или только у меня' },
    { at: '03.10 20:30', from: 'player', text: 'у меня ок вроде' },
    { at: '03.10 20:31', from: 'denis', text: 'значит соседи опять качают сериалы через мой роутер. спс' },
  ],
  zinaida: [
    { at: '19.10 14:02', from: 'zinaida', text: 'Кирюша здравствуй это Зинаида Павловна из 45 мне внучка телефон новый подарила как тут фото отправить' },
    { at: '19.10 14:30', from: 'player', text: 'Здравствуйте! Нажмите на скрепку слева внизу 🙂' },
    { at: '19.10 14:41', from: 'zinaida', text: 'нажала' },
    { at: '19.10 14:41', from: 'zinaida', photo: 'zina_ceiling' },
    { at: '19.10 14:42', from: 'zinaida', text: 'это потолок я случайно спасибо Кирюша' },
  ],
  gennady: [
    { at: '12.10 08:15', from: 'gennady', text: 'Ермаков, добрый день. Пакеты с мусором оставлять у мусоропровода ЗАПРЕЩЕНО. Мусоропровод закрыт с 2019 года. Делаю вам замечание.' },
    { at: '12.10 09:02', from: 'player', text: 'Это не мои пакеты.' },
    { at: '12.10 09:03', from: 'gennady', text: 'Разберёмся.' },
  ],
};

// ---------------------------------------------------------------- сюжетные цепочки
export const SEQUENCES = {
  intro: [
    { chat: 'mchs', from: 'mchs', delay: 1.5, typing: 0, text: 'ОПОВЕЩЕНИЕ: Жителям д. 14 по ул. Тополиная! Режим ограничения передвижения продлён до особого распоряжения. Не покидайте квартиры. Не открывайте двери посторонним. Штаб ГОЧС.' },
    { do: (c) => c.quest.start('look_around') },
    { chat: 'house', from: 'artur', delay: 5, text: 'Ладно, на лестницу нельзя, понял. Граф, прости' },
    { chat: 'house', from: 'lisa', delay: 3, text: 'добавьте Графа в чат, он хотя бы адекватный будет' },
    { chat: 'house', from: 'gennady', delay: 4, text: 'Гаспарян, собаку на балкон. Приказ был не выходить.' },
    { chat: 'house', from: 'artur', delay: 3, text: 'Чей приказ, Геннадий Борисович? Ваш?' },
    { chat: 'house', from: 'artur', delay: 1, text: 'У меня 3 этаж, какой балкон, он по лестнице спускается быстрее меня' },
    { run: 'mom_first', delay: 12 },
  ],
  mom_first: [
    { chat: 'mom', from: 'mom', text: 'Кирюш, ты как?' },
    { chat: 'mom', from: 'mom', delay: 2, text: 'По первому каналу сказали, что у вас на Тополиной учения гражданской обороны. Это правда учения?' },
    { chat: 'mom', from: 'mom', delay: 2, text: 'Позвони как сможешь' },
    {
      choice: {
        id: 'mom_first', chat: 'mom', timeout: 40,
        options: [
          { id: 'calm', text: 'Всё нормально, мам. Учения. Сижу дома, не волнуйся.', intents: ['calm', 'agree', 'how_are_you'], do: (c) => c.setFlag('lied_mom'), next: 'mom_calm' },
          { id: 'truth', text: 'Нас закрыли в доме. Никто ничего не объясняет. У подъезда военные.', intents: ['ask_quarantine', 'need_help'], do: (c) => c.setFlag('told_mom'), next: 'mom_truth' },
        ],
      },
    },
  ],
  mom_calm: [
    { chat: 'mom', from: 'mom', text: 'Ну слава богу' },
    { chat: 'mom', from: 'mom', delay: 2, text: 'А то тётя Люда звонит, говорит у вас там химзащита ходит. Она по телевизору видела' },
    { chat: 'mom', from: 'mom', delay: 1.5, text: 'Ты поешь хотя бы' },
  ],
  mom_truth: [
    { chat: 'mom', from: 'mom', typing: 4, text: 'Господи' },
    { chat: 'mom', from: 'mom', delay: 2, typing: 6, text: 'А по телевизору говорят учения. Кирилл, ты окна закрой. И воду набери в ванну, мало ли. Я в девяностые всегда набирала' },
    { chat: 'mom', from: 'mom', delay: 2, text: 'Я буду звонить' },
  ],
  inhaler: [
    { chat: 'house', from: 'marina', key: 'm_inh', text: 'Извините, что поздно. У кого-нибудь есть сальбуиамол?' },
    { chat: 'house', from: 'marina', delay: 0.8, typing: 1, text: '*сальбутамол' },
    { chat: 'house', from: 'marina', delay: 1, typing: 3, text: 'У Сони начинается приступ, а ингалятор пустой. Скорая не берёт трубку 😢' },
    { chat: 'house', from: 'gennady', reply: 'm_inh', key: 'g_inh', text: 'Ковалёва, вызывайте скорую. Тут не аптека.' },
    { chat: 'house', from: 'denis', reply: 'g_inh', text: 'скорую. в карантин. Геннадий Борисович, вы гений логистики' },
    { chat: 'house', from: 'olga', delay: 2, typing: 7, text: 'Марина, сколько Соне лет? Пусть сидит ровно, наклон вперёд, руки на колени. Окна не открывать. Дышать медленно: вдох на 4, выдох на 6.' },
    { chat: 'house', from: 'olga', delay: 1, text: 'Я бы пришла, но у нас на 4-м решётка на лестнице. Нас тут заварили, буквально.' },
    { chat: 'house', from: 'marina', text: '7 лет. Сидит. Дышит со свистом' },
    { chat: 'house', from: 'zinaida', delay: 4, typing: 10, key: 'z_inh', text: 'Мариночка у меня есть беротек от Пети ещё остался я сейчас посмотрю срок годности ноги совсем не ходят до тебя не дойду может кто из молодых сходит я на шестом в 45' },
    { chat: 'house', from: 'zinaida', delay: 6, text: 'нашла есть' },
    { do: (c) => c.setFlag('inhaler_asked') },
    {
      choice: {
        id: 'inhaler_offer', chat: 'house', timeout: 14, onTimeout: 'inhaler_nobody',
        options: [
          { id: 'yes', text: 'Я в 47-й, рядом. Схожу к Зинаиде Павловне и отнесу Марине.', intents: ['offer_help', 'agree'], do: (c) => { c.setFlag('promised_inhaler'); c.rel.promise('marina', 'inhaler'); c.rel.adjust('marina', { trust: 10 }); c.rel.adjust('zinaida', { trust: 5 }); c.quest.start('inhaler'); }, next: 'inhaler_yes' },
          { id: 'deflect', text: 'Выходить же запретили… Может, Денис? Он через дверь от Марины.', intents: ['disagree'], do: (c) => { c.setFlag('deflected_inhaler'); c.rel.adjust('denis', { trust: -5 }); c.rel.adjust('marina', { trust: -5 }); }, next: 'inhaler_deflect' },
        ],
      },
    },
  ],
  inhaler_yes: [
    { chat: 'house', from: 'marina', text: 'Кирилл, спасибо огромное!!! 48-я, я у двери' },
    { chat: 'house', from: 'gennady', delay: 3, text: 'Выходить запрещено. Потом не жалуйтесь, когда вас перепишут.' },
    { chat: 'house', from: 'zinaida', delay: 3, typing: 6, text: 'Кирюша я дверь открою стучи погромче я телевизор смотрю' },
    { chat: 'house', from: 'denis', delay: 2, text: 'респект. если Гена выйдет с блокнотом — беги' },
  ],
  inhaler_deflect: [
    { chat: 'house', from: 'denis', delay: 3, typing: 4, text: 'ага щас. у меня тут… короче не могу я выйти. не спрашивайте' },
    { chat: 'house', from: 'marina', delay: 3, text: 'пожалуйста кто-нибудь' },
    { wait: 25 },
    { cond: (c) => !c.flag('promised_inhaler') },
    { run: 'inhaler_nobody' },
  ],
  inhaler_nobody: [
    { cond: (c) => !c.flag('promised_inhaler') && !c.flag('zina_walks') },
    { chat: 'house', from: 'zinaida', typing: 6, text: 'никто не отвечает сама пойду потихоньку' },
    { do: (c) => { c.setFlag('zina_walks'); c.closeChoice('inhaler_offer'); } },
  ],
  inhaler_done: [
    { chat: 'house', from: 'marina', delay: 4, typing: 5, text: 'Кирилл принёс. Соне легче, почти уснула. Зинаида Павловна, дай бог вам здоровья ❤️' },
    { chat: 'house', from: 'zinaida', delay: 3, typing: 6, text: 'ой да на здоровье Мариночка пусть спит ❤️ а Кирюша молодец' },
    { chat: 'house', from: 'gennady', delay: 4, key: 'g_walk', text: 'Значит, по коридорам у нас теперь можно гулять. Хорошо. Запомню.' },
    { chat: 'house', from: 'lisa', reply: 'g_walk', delay: 2, text: 'Геннадий Борисович ведёт тетрадь смерти' },
    { chat: 'marina', from: 'marina', delay: 6, typing: 5, text: 'Спасибо вам ещё раз. Простите, что через цепочку — Соня боится, когда дверь открывают широко.' },
    { do: (c) => c.setVisible('marina') },
  ],
  zina_delivered: [
    { chat: 'house', from: 'marina', delay: 2, typing: 6, text: 'Зинаида Павловна сама дошла, с палочкой… Спасибо вам огромное ❤️' },
    { chat: 'house', from: 'zinaida', delay: 4, text: 'дошла не развалилась' },
    { chat: 'house', from: 'gennady', delay: 3, text: 'Крылова, вы в своём уме? В ваши годы. Молодёжь сидит.' },
    { chat: 'house', from: 'denis', delay: 2, text: 'молодёжь, это камень в мой огород, я понял' },
  ],

  irina_work: [
    { chat: 'irina', from: 'irina', text: 'Кирилл, добрый вечер! Как там наш насос? 😊' },
    { chat: 'irina', from: 'irina', delay: 1.5, text: 'Заказчик спрашивал, успеваем ли к 9:00' },
    {
      choice: {
        id: 'irina', chat: 'irina', timeout: 60,
        options: [
          { id: 'quarantine', text: 'Ирина, у нас дом оцеплен, карантин. Может не успею.', intents: ['ask_quarantine', 'need_help', 'disagree'], next: 'irina_q' },
          { id: 'ok', text: 'Успеваем. К 9:00 будет.', intents: ['agree'], do: (c) => c.setFlag('promised_irina'), next: 'irina_ok' },
        ],
      },
    },
  ],
  irina_q: [
    { chat: 'irina', from: 'irina', typing: 4, text: 'Ой( Ну держитесь там!' },
    { chat: 'irina', from: 'irina', delay: 2, text: 'Но вы же всё равно из дома работаете, вам карантин не помеха 😊 К 9:00, хорошо?' },
  ],
  irina_ok: [{ chat: 'irina', from: 'irina', text: 'Супер! 🙏' }],

  lyosha_fence: [
    { chat: 'lyosha', from: 'lyosha', text: 'братан ты как' },
    { chat: 'lyosha', from: 'lyosha', delay: 2, text: 'я у оцепления на Тополиной. нас не пускают, говорят газ' },
    { chat: 'lyosha', from: 'lyosha', delay: 2, typing: 5, text: 'но это не газовики. химзащита, военные, фургоны с антеннами. какие-то мужики с приборами ходят вдоль стены и слушают её. реально слушают, ухом' },
    {
      choice: {
        id: 'lyosha1', chat: 'lyosha', timeout: 50,
        options: [
          { id: 'ok', text: 'Нормально. Сижу дома, нам ничего не говорят.', intents: ['how_are_you', 'calm'], next: 'lyosha_ok' },
          { id: 'ask', text: 'Слушают стену?? Спроси у кого-нибудь, что происходит.', intents: ['ask_quarantine', 'need_help'], do: (c) => c.setFlag('lyosha_asks'), next: 'lyosha_ask' },
        ],
      },
    },
  ],
  lyosha_ok: [{ chat: 'lyosha', from: 'lyosha', text: 'ок. я тут ещё потусуюсь, мало ли' }],
  lyosha_ask: [
    { chat: 'lyosha', from: 'lyosha', text: 'щас' },
    { wait: 40 },
    { chat: 'lyosha', from: 'lyosha', typing: 6, text: 'спросил. мужик в форме сказал «не ваше дело». а второй, в гражданском, спросил, есть ли у меня родственники в доме. и записал твой номер квартиры. я ему не говорил номер квартиры, кирилл' },
  ],
  lyosha_photo: [
    { chat: 'lyosha', from: 'lyosha', text: 'слушай' },
    { chat: 'lyosha', from: 'lyosha', photo: 'lyosha_facade', delay: 2 },
    { chat: 'lyosha', from: 'lyosha', delay: 2, key: 'l_win', text: 'это ваш подъезд? шестой этаж, третье окно справа. там свет и кто-то стоит. смотрит прямо на нас' },
    { chat: 'lyosha', from: 'lyosha', delay: 2, text: 'это не ты случайно?' },
    { do: (c) => c.clue('lyosha_photo') },
    {
      choice: {
        id: 'lyosha2', chat: 'lyosha', timeout: 20, onTimeout: 'lyosha_lost',
        options: [
          { id: 'no', text: 'Нет. Третье справа — это 52-я. Она опечатана, там никто не живёт.', intents: ['disagree', 'ask_52'], cond: (c) => c.knowsClue('notice_52') || c.flag('after_vetrov'), next: 'lyosha_lost' },
          { id: 'dunno', text: 'Не знаю… Можешь снять ближе?', intents: ['photo', 'need_help'], next: 'lyosha_lost' },
        ],
      },
    },
  ],
  lyosha_lost: [
    { chat: 'lyosha', from: 'lyosha', typing: 3, text: 'погоди тут что-то' },
    { chat: 'lyosha', from: 'lyosha', delay: 1, typing: 2, text: 'нас отгоняют от забора, все фары выключили разом' },
    { do: (c) => { c.setFlag('lyosha_lost'); c.phone.glitch(); } },
  ],

  blackout: [
    { chat: 'house', from: 'denis', delay: 3, text: 'у всех свет вырубило?' },
    { chat: 'house', from: 'lisa', delay: 2, text: 'у нас горит. на 7м норм' },
    { chat: 'house', from: 'artur', delay: 2, text: '3й тоже. Это у вас на шестом' },
    { chat: 'house', from: 'denis', delay: 2, typing: 4, text: 'значит автомат на этаже выбило. щиток в коридоре между 47й и лифтом' },
    { chat: 'house', from: 'denis', delay: 1, key: 'd_panel', text: 'Кирилл, ты ближе всех. там рычаг ЩЭ-6, большой, просто вверх' },
    { chat: 'house', from: 'gennady', delay: 2, key: 'g_panel', text: 'Щиток не трогать!!! Он опломбирован! Я вызову' },
    { chat: 'house', from: 'denis', reply: 'g_panel', delay: 2, text: 'кого? Саныча? он с семи вечера в подвале молчит' },
    { chat: 'house', from: 'zinaida', delay: 4, typing: 5, text: 'у меня свечка есть я привыкшая' },
    { do: (c) => c.quest.start('breaker') },
  ],
  breaker_fixed: [
    { chat: 'house', from: 'lisa', delay: 3, text: 'о. у вас дали?' },
    { chat: 'house', from: 'gennady', delay: 3, key: 'g_who', text: 'Кто трогал щиток?' },
    {
      choice: {
        id: 'who_breaker', chat: 'house', timeout: 15,
        options: [
          { id: 'me', text: 'Я. Иначе сидели бы в темноте.', intents: ['agree'], do: (c) => { c.rel.adjust('gennady', { trust: -5, respect: 10 }); c.rel.adjust('denis', { trust: 5 }); c.rel.learn('gennady', 'player_fixed_breaker'); }, next: 'breaker_me' },
          { id: 'lie', text: 'Не знаю. Само включилось.', intents: ['disagree'], do: (c) => { c.setFlag('lied_breaker'); c.rel.adjust('denis', { trust: -3 }); c.rel.believe('gennady', 'breaker_self', true); }, next: 'breaker_lie' },
        ],
      },
    },
    { chat: 'house', from: 'denis', delay: 4, typing: 3, key: 'd_lift', text: 'стоп. а это что гудит? это лифт поехал??? он же отключен' },
    { chat: 'house', from: 'artur', delay: 3, text: 'У нас на третьем ничего не гудит' },
  ],
  breaker_me: [{ chat: 'house', from: 'gennady', text: 'Ясно. Отмечу.' }, { chat: 'house', from: 'denis', delay: 2, text: '👏' }],
  breaker_lie: [{ chat: 'house', from: 'denis', delay: 2, text: 'ну да. само. 😏' }, { chat: 'house', from: 'gennady', delay: 3, text: 'Само ничего не включается, Ермаков.' }],
  gena_fixed: [
    { chat: 'house', from: 'gennady', text: 'Включил. Без самодеятельности.' },
    { chat: 'house', from: 'denis', delay: 2, text: 'спасибо, наш светоносец' },
  ],

  vetrov: [
    { sys: 'Н. Ветров (кв.52) присоединился к группе по ссылке-приглашению' },
    { do: (c) => { c.setVisible('vetrov'); c.vetrovPing(); } },
    { chat: 'house', from: 'vetrov', delay: 4, typing: 2, key: 'v1', text: 'добрый вечер.' },
    { do: (c) => c.vetrovPing() },
    { chat: 'house', from: 'vetrov', delay: 3, typing: 3, key: 'v2', text: 'не открывайте двери, когда стучат три раза.' },
    { do: (c) => c.vetrovPing() },
    { chat: 'house', from: 'lisa', delay: 2, text: 'эээ' },
    { chat: 'house', from: 'zinaida', delay: 3, typing: 9, key: 'z_v', text: 'это кто?? Коля Ветров умер в двадцать первом году в марте я сама на похоронах была квартиру опечатали' },
    { chat: 'house', from: 'denis', delay: 2, typing: 5, text: 'номер переоформили на кого-то, классика. операторы через полгода чужие симки раздают' },
    { chat: 'house', from: 'olga', delay: 2, text: 'Кто админ? Удалите, пожалуйста. Сейчас не время для таких шуток.' },
    { chat: 'house', from: 'gennady', delay: 3, text: 'Я админ. Удалю.' },
    { chat: 'house', from: 'gennady', delay: 6, typing: 1, text: 'Как удалить?' },
    { chat: 'house', from: 'lisa', delay: 1, text: '😭😭😭' },
    { del: 'v2', delay: 2 },
    { chat: 'house', from: 'vetrov', reply: 'z_v', delay: 5, typing: 4, key: 'v3', text: 'я дома. в пятьдесят второй. я всегда был дома.' },
    { do: (c) => { c.vetrovPing(); c.setFlag('after_vetrov'); c.ambience.setTension(0.4); } },
    { chat: 'house', from: 'marina', delay: 3, typing: 4, text: 'мне честно страшно. Соня не спит, говорит, кто-то ходит за стенкой' },
    { chat: 'house', from: 'zinaida', delay: 5, typing: 10, key: 'z_test', text: 'Коля если это правда ты то скажи что я тебе на пятидесятилетие подарила' },
    { wait: 18 },
    { chat: 'house', from: 'vetrov', reply: 'z_test', typing: 2, text: 'часы. они до сих пор идут.' },
    { do: (c) => c.vetrovPing() },
    { chat: 'house', from: 'zinaida', delay: 8, typing: 2, text: 'Господи' },
    { run: 'denis_ask', delay: 15 },
  ],
  denis_ask: [
    { chat: 'denis', from: 'denis', text: 'слушай' },
    { chat: 'denis', from: 'denis', delay: 1.5, text: 'ты ж почти напротив 52й' },
    { chat: 'denis', from: 'denis', delay: 1.5, typing: 4, text: 'глянь пломбу на двери, есть или нет. и сфоткай, если не сложно' },
    { chat: 'denis', from: 'denis', delay: 1, typing: 4, text: 'я сам не выйду. у меня камера в глазке, я тут кое-что видел днём, потом расскажу' },
    {
      choice: {
        id: 'denis_seal', chat: 'denis', timeout: 30,
        options: [
          { id: 'ok', text: 'Ок, гляну и сфоткаю.', intents: ['agree', 'offer_help', 'photo'], do: (c) => { c.quest.start('seal52'); c.rel.promise('denis', 'photo52'); c.rel.adjust('denis', { trust: 5 }); }, next: 'denis_ok' },
          { id: 'no', text: 'Сам сходи. Ты тоже напротив.', intents: ['disagree', 'insult'], do: (c) => { c.rel.adjust('denis', { trust: -5 }); c.setFlag('refused_denis'); }, next: 'denis_no' },
        ],
      },
    },
  ],
  denis_ok: [{ chat: 'denis', from: 'denis', text: 'спс. в долгу' }],
  denis_no: [{ chat: 'denis', from: 'denis', typing: 3, text: 'справедливо. ладно, забей' }, { do: (c) => c.quest.start('seal52') }],

  gena_home: [
    { chat: 'house', from: 'gennady', key: 'g_home', typing: 5, text: 'Всем сидеть по квартирам. Я у себя, дверь закрыта. Кто шатается по этажу — запишу номера квартир.' },
    { do: (c) => c.setFlag('gena_said_home') },
    { chat: 'house', from: 'artur', delay: 3, text: 'Шатается по этажу только Граф. В моих снах.' },
  ],
  gena_exposed: [
    { chat: 'house', from: 'gennady', delay: 5, typing: 6, text: 'Да. Я выходил. Проверял 52-ю, там кто-то ходит с обеда. Дверь закрыта на цепочку ИЗНУТРИ. Довольны?' },
    { chat: 'house', from: 'denis', delay: 3, text: 'изнутри. в пустой квартире. обожаю этот дом' },
    { chat: 'house', from: 'zinaida', delay: 4, text: 'Гена не ходи туда больше' },
    { do: (c) => c.clue('chain_inside') },
  ],

  denis_smoke: [
    { chat: 'house', from: 'denis', text: 'пойду на лестницу, там хоть одна палка ловит. если не вернусь — мой фикус Лизе' },
    { chat: 'house', from: 'lisa', delay: 2, text: 'фикус принят 🌿' },
    { do: (c) => c.setFlag('denis_smoking') },
  ],
  denis_back: [
    { cond: (c) => c.flag('denis_smoking') && !c.flag('denis_back') },
    { chat: 'house', from: 'denis', text: 'вернулся. фикус остаётся мой' },
    { do: (c) => c.setFlag('denis_back') },
  ],
  denis_cam: [
    { chat: 'denis', from: 'denis', text: 'вот. с камеры, 21:13–21:53' },
    { chat: 'denis', from: 'denis', photo: 'denis_cam_1', delay: 1.5 },
    { chat: 'denis', from: 'denis', photo: 'denis_cam_2', delay: 1 },
    { chat: 'denis', from: 'denis', photo: 'denis_cam_3', delay: 1 },
    { chat: 'denis', from: 'denis', delay: 2, typing: 5, text: 'он не двигается сорок минут. вообще. а потом на кадре просто никого. без двери, без шагов' },
    { do: (c) => c.clue('denis_cam') },
  ],

  mom_call_after: [
    { cond: (c) => c.flag('mom_call_missed') },
    { chat: 'mom', from: 'mom', voice: { duration: 9, transcript: 'Кирюша, ну что ты трубку не берёшь… Я тут подумала — ты помнишь, папа говорил, что ваш дом на месте какого-то института построили? Он туда ездил в командировку, в восемьдесят пятом. Перезвони мне.' } },
    { do: (c) => c.setFlag('mom_voice_institute') },
  ],

  unknown_sms: [
    { do: (c) => c.setVisible('unknown') },
    { chat: 'unknown', from: 'unknown', typing: 0, text: 'Кирилл.' },
    { chat: 'unknown', from: 'unknown', delay: 3, typing: 0, text: 'Не открывай, когда стучат. Это не они.' },
    { chat: 'unknown', from: 'unknown', delay: 3, typing: 0, text: 'Они учатся голосам. Твой они ещё не знают.' },
    { do: (c) => c.phone.glitch() },
  ],

  note_drop: [
    { do: (c) => c.dropNote() },
  ],

  knock_warn: [
    { chat: 'house', from: 'marina', delay: 2, typing: 3, text: 'ЭТО НЕ Я!!! Мы дома, у нас закрыто!!' },
    { chat: 'house', from: 'marina', delay: 1, text: 'Кирилл не открывайте пожалуйста' },
    { chat: 'house', from: 'olga', delay: 4, typing: 8, text: 'Так. Правило для всех: на три стука не открываем. Никому. Даже знакомым голосам. Сначала пишем в чат, потом открываем.' },
    { chat: 'house', from: 'gennady', delay: 4, cond: (c) => c.flag('kept_gena_secret') || c.rel.get('gennady').trust >= 0, text: 'Подтверждаю. Я тоже слышал у 52-й. Не открывать.' },
    { chat: 'house', from: 'gennady', delay: 4, cond: (c) => !(c.flag('kept_gena_secret') || c.rel.get('gennady').trust >= 0), text: 'Паникёры. Никто никуда не стучит.' },
    { chat: 'house', from: 'zinaida', delay: 10, typing: 12, key: 'z_knock', text: 'мне сейчас тоже постучали три раза голос как у Пети моего Зина открой говорит я не открыла Кирюша спасибо тебе' },
    { chat: 'house', from: 'vetrov', delay: 6, typing: 1, text: 'умно.' },
    { do: (c) => { c.vetrovPing(); c.setFlag('aftermath_done'); } },
  ],
  knock_opened: [
    { chat: 'house', from: 'vetrov', delay: 6, typing: 2, text: 'спасибо, Кирилл.' },
    { do: (c) => c.vetrovPing() },
    { wait: 20 },
    { chat: 'house', from: 'player', fake: true, typing: 0, key: 'fake', text: 'не открывайте никому. это я, Кирилл. я в коридоре' },
    { chat: 'house', from: 'zinaida', delay: 6, typing: 5, text: 'Кирюша ты чего ты же дома' },
    { chat: 'house', from: 'denis', delay: 2, text: 'кирилл?? ты в порядке? ты это писал?' },
    { do: (c) => c.setFlag('echo_has_voice') },
    {
      choice: {
        id: 'fake_reply', chat: 'house', timeout: 12, onTimeout: 'knock_opened_2',
        options: [
          { id: 'notme', text: 'Это не я писал. Я у себя. Не верьте сообщениям от меня.', intents: ['disagree'], next: 'knock_opened_2' },
        ],
      },
    },
  ],
  knock_opened_2: [
    { chat: 'house', from: 'marina', delay: 4, typing: 3, text: 'я ничего не понимаю. мне страшно' },
    { chat: 'house', from: 'zinaida', delay: 10, typing: 6, key: 'z_last', text: 'у меня стучат три раза голосом Кирюши' },
    { wait: 20 },
    { chat: 'house', from: 'olga', text: 'Зинаида Павловна, вы не открыли? Ответьте' },
    { chat: 'house', from: 'denis', delay: 15, text: 'Зинаида Павловна?' },
    { do: (c) => { c.setFlag('zina_missing'); c.setFlag('aftermath_done'); } },
  ],
  knock_ignored: [
    { chat: 'house', from: 'zinaida', delay: 20, typing: 6, text: 'Кирюша это ты стучал? я открыла а там никого' },
    { chat: 'house', from: 'zinaida', delay: 12, typing: 4, text: 'темно у меня что-то' },
    { wait: 18 },
    { chat: 'house', from: 'marina', text: 'Зинаида Павловна? Вы как?' },
    { chat: 'house', from: 'olga', delay: 12, text: 'Зинаида Павловна, ответьте, пожалуйста' },
    { do: (c) => { c.setFlag('zina_missing'); c.setFlag('aftermath_done'); } },
  ],
};

// ---------------------------------------------------------------- бытовые разговоры (каждый звучит один раз)
export const AMBIENT = [
  { id: 'trash', cond: (c) => !c.flag('blackout'), steps: [
    { from: 'artur', text: 'Кстати кто знает, мусоропровод работает? У меня пакет уже пахнет' },
    { from: 'gennady', text: 'Мусоропровод закрыт с 2019 года, Гаспарян. Читайте объявления.' },
    { from: 'artur', text: 'Я их читаю. Их просто нет' },
  ] },
  { id: 'howlong', steps: [
    { from: 'lisa', text: 'кто-нибудь знает как долго вообще такие карантины длятся' },
    { from: 'olga', typing: 5, text: 'В ковид было 14 дней. Но тогда хотя бы объясняли, что за болезнь. Нам даже не сказали, что ищут.' },
    { from: 'denis', text: 'ищут агента. агента 007' },
    { from: 'lisa', text: 'смешно. нет' },
  ] },
  { id: 'ramen', steps: [
    { from: 'lisa', photo: 'lisa_ramen' },
    { from: 'lisa', text: 'минутка нормальности: доширак с сыром и последним яйцом' },
    { from: 'artur', text: 'Вот это ресурсы. Уважаю' },
    { from: 'zinaida', typing: 6, text: 'Лизонька это не еда приходи ко мне я котлет нажарила ой нельзя же приходить' },
  ] },
  { id: 'cash', cond: (c) => c.time < t('23:30'), steps: [
    { from: 'gennady', text: 'Напоминаю: подъездная касса за октябрь не сдана кв. 37, 49, 60.' },
    { from: 'denis', text: 'Геннадий Борисович, у нас тут вроде как конец света' },
    { from: 'gennady', text: 'Конец света не отменяет порядок.' },
    { from: 'lisa', text: 'это надо на футболку' },
  ] },
  { id: 'bread', steps: [
    { from: 'zinaida', typing: 7, text: 'мальчики девочки у кого есть хлеб поменяю на банку огурцов своих' },
    { from: 'artur', text: 'У меня лаваш 😄 Но как мы поменяемся' },
    { from: 'zinaida', typing: 6, text: 'через балкон на верёвке как в девяносто втором мы так с третьим этажом менялись' },
    { from: 'artur', text: 'Зинаида Павловна, вы лучшая' },
  ] },
  { id: 'graf', cond: (c) => c.time > t('23:00'), steps: [
    { from: 'artur', text: 'Граф воет. Если что — это Граф. Не паникуем.' },
    { from: 'lisa', text: 'спасибо что предупредил, я уже начала' },
    { from: 'artur', typing: 4, text: 'Хотя он обычно не воет. Он сидит у двери и смотрит в глазок. Он не достаёт до глазка.' },
  ] },
  { id: 'light', cond: (c) => c.flag('after_vetrov'), steps: [
    { from: 'lisa', text: 'я сплю со светом. официально' },
    { from: 'denis', text: 'свет — ресурс. экономь' },
    { from: 'lisa', text: 'ты не помогаешь денис' },
  ] },
  { id: 'list', steps: [
    { from: 'olga', typing: 7, text: 'Составляю список: у кого какие лекарства, хронические болезни, дети, животные. Напишите мне в личку, пожалуйста. Это поможет, если нас начнут выводить.' },
    { from: 'gennady', text: 'Список веду я.' },
    { from: 'olga', text: 'Геннадий Борисович, ведите. Я веду медицинский.' },
    { do: (c) => c.setVisible('olga') },
  ] },
  { id: 'dark6', cond: (c) => c.flag('blackout'), steps: [
    { from: 'lisa', text: 'а у вас на 6м щас как? у меня мурашки от одной мысли' },
    { from: 'denis', text: 'как в бункере. только бункер не знает, что он бункер' },
  ] },
  { id: 'sonya', cond: (c) => c.time > t('00:00') && c.flag('inhaler_delivered'), steps: [
    { from: 'marina', typing: 5, text: 'Соня спрашивает, почему соседи не спят. Сказала — у всех праздник' },
    { from: 'zinaida', text: 'правильно Мариночка' },
  ] },
  { id: 'smell', cond: (c) => c.time > t('23:20'), steps: [
    { from: 'artur', text: 'Странный вопрос. У кого-нибудь пахнет мокрой штукатуркой? Как после ремонта' },
    { from: 'olga', text: 'У нас тоже. Из вентиляции.' },
    { from: 'zinaida', typing: 6, text: 'так в восемьдесят шестом пахло когда подъезд закрывали' },
  ] },
];

// ---------------------------------------------------------------- свободный ввод: ответы по намерениям
// Варианты выбираются по очереди; уже использованные не повторяются, затем — фразы «уже отвечал».
export const RESPONSES = {
  zinaida: {
    greet: ['здравствуй Кирюша', 'здравствуй здравствуй'],
    how_are_you: ['давление скачет а так ничего живая', 'сижу чай пью Петины часы тикают'],
    thanks: ['да на здоровье', 'ой да что ты'],
    ask_history: ['дом наш в восемьдесят первом сдали для работников Кристалла Петя мой там работал говорил котельная а какая котельная если у нас отопление городское', 'в подвале при Брежневе ещё дверь была железная с номером потом её замуровали а теперь Саныч говорит открылась'],
    ask_52: [{ text: 'Коля Ветров жил тихо всё паял что-то по ночам с Петей моим вместе работали потом заболел и всё', cond: (c) => true }, 'не хочу я про Колю Кирюша'],
    ask_quarantine: ['в восемьдесят шестом тоже закрывали неделю никто ничего не сказал потом сказали учения'],
    ask_knock: ['три раза это плохо Петя говорил если стучат три раза не открывай я думала это он так шутит'],
    ask_where: ['дома где ж мне быть'],
    insult: ['ой Кирюша не надо так'],
    photo: ['не вижу ничего очки не те'],
    water: ['вода есть я набрала в ванну и в банки'],
    offer_help: ['спасибо Кирюша ты хороший мальчик'],
    unknown: ['не поняла я Кирюша напиши попроще я старая', 'ты про что'],
  },
  denis: {
    greet: ['йо', 'привет-привет'],
    how_are_you: ['как баг в продакшене — живой, но никто не рад', 'норм. сижу смотрю на дверь'],
    thanks: ['обращайся', 'с тебя пиво после конца света'],
    ask_52: ['утром пломба была целая. я на камеру смотрел', 'там с 21го никто не живёт. официально'],
    ask_quarantine: ['моя версия — подвал. Саныч в 19:12 фоткал люк и пропал. совпадение? не думаю'],
    ask_history: ['это к Зинаиде Павловне, она тут с палеозоя'],
    ask_power: ['щиток ЩЭ-6 у 47й, большой рычаг вверх. не бойся, не ударит. наверное'],
    ask_knock: ['слушай не надо про три раза', 'я камеру вывел на ноут. если кто-то будет стучать — увидим'],
    ask_where: ['дома. ну или на лестнице, если курю. я не курю'],
    insult: ['окей бумер', 'грубо'],
    photo: ['кидай, гляну'],
    agree: ['👍'],
    disagree: ['ок'],
    water: ['у меня пять литров и энергетики. переживу'],
    unknown: ['не распарсил', 'чего?'],
  },
  gennady: {
    greet: ['Добрый вечер.'],
    how_are_you: ['Нормально. Без паники.'],
    thanks: ['Не за что.'],
    ask_where: ['Дома я.', 'Вам какое дело?'],
    ask_52: ['Квартира опечатана. Точка.', 'Не лезьте туда, Ермаков.'],
    ask_quarantine: ['Не знаю. И вам не советую. Ждём указаний.'],
    ask_power: ['Щиток опломбирован. Трогать запрещено.'],
    insult: ['Я вас запомнил, Ермаков.'],
    water: [{ text: 'Воду нужно сдать мне, распределю по справедливости.', do: (c) => c.rel.learn('gennady', 'player_asked_water') }],
    unknown: ['Пишите по существу.'],
  },
  marina: {
    greet: ['Здравствуйте'],
    how_are_you: [{ text: 'Спит. Дышит ровнее. Спасибо вам', cond: (c) => c.flag('inhaler_delivered') }, 'Держимся'],
    thanks: ['Это вам спасибо'],
    ask_knock: ['Соня говорила про стук… Я думала, это Геннадий ходит'],
    ask_where: ['Дома, конечно. Мы не выходим'],
    unknown: ['Простите, я не поняла'],
  },
  olga: {
    greet: ['Здравствуйте, Кирилл.'],
    how_are_you: ['Держусь. У нас на 4-м тихо. Слишком тихо.'],
    ask_quarantine: ['Это не похоже на биологию. Медиков в оцеплении нет — я видела в окно только людей с дозиметрами и какими-то микрофонами.'],
    need_help: ['Опишите, что случилось. Подскажу, что смогу.'],
    thanks: ['Не за что. Берегите себя.'],
    unknown: ['Уточните, пожалуйста.'],
  },
  mom: {
    greet: ['Привет, сынок'],
    how_are_you: ['Я-то нормально, я за тебя переживаю. Давление, конечно'],
    ask_quarantine: ['По телевизору говорят учения. А тётя Люда говорит, это газ. Я не знаю, кому верить'],
    calm: ['Ну хорошо. Только поешь'],
    thanks: ['Ну что ты'],
    insult: ['Кирилл! Ты как с матерью разговариваешь'],
    unknown: ['Не поняла, Кирюш. Позвони лучше', 'Это что значит?'],
  },
  lyosha: {
    greet: ['здарова'],
    how_are_you: ['мёрзну у забора. ты как'],
    ask_quarantine: ['никто ничего не говорит. фургоны с антеннами и всё'],
    thanks: ['да ладно'],
    unknown: ['чё', 'не понял'],
  },
  irina: {
    greet: ['Добрый вечер! 😊'],
    ask_quarantine: ['Ой( Держитесь! Насос к 9:00 😊'],
    unknown: ['К 9:00, Кирилл 😊'],
  },
  vetrov: {
    ask_where: ['в пятьдесят второй.'],
    ask_who: ['ты знаешь.'],
    unknown: [null],
  },
  unknown: {
    unknown: ['не пиши сюда.', null],
  },
};

// Кто отвечает в общем чате на свободное сообщение (если никого не упомянули по имени)
export const GROUP_ROUTING = {
  greet: ['zinaida', 'denis'],
  how_are_you: ['zinaida', 'marina', 'denis'],
  thanks: ['marina', 'zinaida'],
  ask_52: ['zinaida', 'denis', 'gennady'],
  ask_quarantine: ['denis', 'olga', 'gennady'],
  ask_history: ['zinaida'],
  ask_power: ['denis', 'gennady'],
  ask_knock: ['zinaida', 'marina', 'denis'],
  ask_where: ['gennady', 'denis'],
  insult: ['gennady', 'denis'],
  water: ['gennady', 'zinaida'],
  photo: ['denis'],
  need_help: ['olga'],
  offer_help: ['zinaida'],
  unknown: ['denis', 'zinaida'],
};

// Ответы на отправленные игроком фотографии: подбираются по тегам снимка.
export const PHOTO_REACTIONS = [
  { chat: 'denis', tags: ['figure'], steps: [
    { from: 'denis', typing: 2, text: 'так' },
    { from: 'denis', delay: 1, typing: 4, text: 'пломба — да, порвана. но. это что у тебя за стеклом на лестнице?? кто-то стоит' },
    { from: 'denis', delay: 1, text: 'ты там один был??' },
    { do: (c) => { c.clue('figure_photo'); c.rel.learn('denis', 'figure_photo'); c.rel.adjust('denis', { trust: 10 }); c.setFlag('denis_saw_figure'); } },
  ] },
  { chat: 'denis', tags: ['door52'], steps: [
    { from: 'denis', typing: 3, text: 'порвана. утром была целая. я на камеру смотрел' },
    { from: 'denis', delay: 1, text: 'спс. серьёзно' },
    { do: (c) => { c.rel.adjust('denis', { trust: 8 }); c.rel.keep('denis', 'photo52'); } },
  ] },
  { chat: 'house', tags: ['figure'], steps: [
    { from: 'lisa', text: 'что это за силуэт за дверью' },
    { from: 'gennady', delay: 2, text: 'Фотошоп.' },
    { from: 'zinaida', delay: 3, text: 'Господи помилуй' },
    { from: 'vetrov', delay: 6, typing: 1, text: 'это не я.' },
    { do: (c) => { c.vetrovPing(); c.clue('figure_photo'); c.broadcast('figure_photo'); c.setFlag('shared_figure'); } },
  ] },
  { chat: 'house', tags: ['door52'], steps: [
    { from: 'denis', text: 'пломба порвана. кто-то туда лазил' },
    { from: 'gennady', delay: 3, text: 'Я разберусь.' },
    { do: (c) => { c.broadcast('seal_broken'); c.setFlag('shared_seal'); } },
  ] },
  { chat: 'house', tags: ['gena52'], steps: [
    { from: 'denis', text: 'Геннадий Борисович, а вы точно «у себя»? 🙂' },
    { do: (c) => { c.setFlag('exposed_gena'); c.rel.breakPromise('gennady', 'secret52'); c.rel.adjust('gennady', { trust: -30 }); c.runSeq('gena_exposed'); } },
  ] },
  { chat: '*', tags: [], steps: [
    { from: '$with', text: 'темно, ничего не разобрать' },
  ] },
];
