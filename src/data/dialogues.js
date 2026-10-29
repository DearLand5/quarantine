// Разговоры вживую. door(c) — что происходит, если постучать: 'open' (подходит и открывает),
// { say, who } — отвечает через дверь, null — тишина. entries — выбор начального узла по условиям.
import { t } from '../utils/time.js';

export const DIALOGUES = {
  // ===================================================================== Зинаида Павловна
  zinaida: {
    door: (c) => {
      if (c.flag('zina_missing')) return null;
      if (c.flag('knock_active')) return { say: 'Кто там?.. Кто стучит? Я не открою, слышите? Не открою.', who: 'zinaida' };
      if (c.time >= t('00:20') && c.rel.get('zinaida').trust < 35) return { say: 'Кирюша, это ты? Прости, ночью не открываю. Ты напиши мне лучше.', who: 'zinaida' };
      return 'open';
    },
    entries: [
      { cond: (c) => c.flag('promised_inhaler') && !c.hasItem('inhaler') && !c.flag('inhaler_delivered') && !c.flag('zina_walks'), node: 'inh1' },
      { cond: (c) => c.flag('zina_inside_talk'), node: 'inside' },
      { cond: (c) => c.flag('after_vetrov') && !c.flag('zina_vetrov_talk'), node: 'vetrov' },
      { cond: (c) => c.flag('inhaler_delivered') || c.flag('zina_walk_done'), node: 'thanks' },
      { node: 'hello' },
    ],
    nodes: {
      inh1: {
        text: 'Кирюша! Заходи, заходи… ой, нельзя же заходить. Вот, держи. Беротек, Петин ещё. Срок, правда, вышел, но он же не молоко.',
        do: (c) => { c.give('inhaler'); c.quest.objective('inhaler', 'get'); },
        choices: [
          { text: 'Спасибо. Отнесу Марине прямо сейчас.', next: 'inh2' },
          { text: 'Зинаида Павловна, вы давно здесь живёте?', next: 'history1' },
        ],
      },
      inh2: { text: 'Беги, беги. И стучи ей тихонько, Соня пугается.', end: true },
      history1: { text: 'С восемьдесят третьего. Нас сюда с Петей как молодых специалистов заселили. Дом-то ведомственный был, «Кристалла». Все друг друга знали.', next: 'history2' },
      history2: {
        text: 'Петя мой говорил — котельная. Ночные смены, пропуск какой-то… Я химик, Кирюша. Я знаю, как котельная пахнет. Он приходил — от него пахло не котельной.',
        choices: [
          { text: 'А чем пахло?', next: 'history3' },
          { text: 'Мне пора.', next: 'bye' },
        ],
      },
      history3: { text: 'Мокрой штукатуркой. Как сейчас из вентиляции тянет. Чуешь?', mood: 'тихо', do: (c) => { c.setFlag('zina_history_told'); c.rel.adjust('zinaida', { trust: 5 }); }, next: 'bye' },
      bye: { text: (c) => (c.hasItem('inhaler') ? 'Ну иди, иди к Марине.' : 'Иди домой, холодно в коридоре.'), end: true },
      thanks: {
        text: (c) => (c.flag('inhaler_delivered') ? 'Отнёс? Ну и молодец. Заходи, если что. Чай есть, и «Юбилейное».' : 'А, Кирюша. Сама я дошла до Мариночки. Ничего, ноги ещё носят.'),
        mood: (c) => (c.flag('zina_walk_done') ? 'чуть обиженно' : ''),
        choices: [
          { text: 'Зайду ненадолго, если можно.', cond: (c) => c.rel.get('zinaida').trust >= 20 && !c.flag('zina_invited'), do: (c) => c.inviteZina(), next: 'invite' },
          { text: 'Вы тоже слышите шаги сверху?', next: 'steps' },
          { text: 'Вы давно здесь живёте?', cond: (c) => !c.flag('zina_history_told'), next: 'history1' },
          { text: 'Спокойной ночи, Зинаида Павловна.', next: null },
        ],
      },
      invite: { text: 'Проходи. Только обувь не снимай, пол холодный. Я в комнате.', end: true },
      steps: { text: 'Слышу. Там Бойко жили, на седьмом. Их ещё днём вывезли, до оцепления, я в окно видела — автобус приезжал. Так что сверху, Кирюша, никого нет.', mood: 'шёпотом', end: true },
      vetrov: {
        text: 'Кирюша… ты читал? Это Коля пишет. Я знаю, что так не бывает. Но про часы никто не знал. Никто, кроме нас троих.',
        do: (c) => c.setFlag('zina_vetrov_talk'),
        choices: [
          { text: 'Кто-то нашёл его вещи и балуется. Это не может быть он.', do: (c) => c.rel.adjust('zinaida', { trust: 3 }), next: 'vet_rational' },
          { text: 'Не знаю. Но, пожалуйста, не открывайте никому ночью. Даже знакомым.', do: (c) => { c.setFlag('warned_zina_early'); c.rel.adjust('zinaida', { trust: 8 }); c.rel.learn('zinaida', 'dont_open_at_night'); }, next: 'vet_warn' },
          { text: 'Можно к вам зайти?', cond: (c) => c.rel.get('zinaida').trust >= 20 && !c.flag('zina_invited'), do: (c) => c.inviteZina(), next: 'invite' },
        ],
      },
      vet_rational: { text: 'Может, ты и прав. Ты молодой, тебе виднее. Иди домой, Кирюша.', end: true },
      vet_warn: { text: 'Не открою. Петя тоже так говорил. Спасибо тебе.', mood: 'тихо', end: true },
      hello: {
        text: 'Кирюша? Что-то случилось?',
        choices: [
          { text: 'Просто проверить, как вы.', do: (c) => { if (!c.flag('zina_checked')) { c.setFlag('zina_checked'); c.rel.adjust('zinaida', { trust: 4 }); } }, next: 'alive' },
          { text: 'Вы давно здесь живёте?', cond: (c) => !c.flag('zina_history_told'), next: 'history1' },
          { text: 'Ничего, извините.', next: null },
        ],
      },
      alive: { text: 'Живая, живая. Давление только. Иди домой, холодно в коридоре.', end: true },
      inside: {
        text: 'Садись, садись. Петины часы слышишь? Сорок лет идут, ни разу не останавливала.',
        choices: [
          { text: 'Это ваш муж на фотографии?', cond: (c) => !c.flag('zina_photo_told'), next: 'photo1' },
          { text: 'Вы правда подарили Ветрову часы?', cond: (c) => c.flag('after_vetrov') && !c.flag('zina_clock_told'), next: 'clock1' },
          { text: 'Что за коробка у вас на серванте?', cond: (c) => !c.hasItem('pass_p17') && c.rel.get('zinaida').trust >= 30, next: 'box' },
          { text: 'Пожалуйста, не открывайте ночью никому.', cond: (c) => c.flag('after_vetrov') && !c.flag('warned_zina_early'), do: (c) => { c.setFlag('warned_zina_early'); c.rel.learn('zinaida', 'dont_open_at_night'); }, next: 'vet_warn' },
          { text: 'Мне пора. Спасибо за чай.', next: null },
        ],
      },
      photo1: { text: 'Пётр. Восемьдесят четвёртый, отдел акустики. Видишь, второй справа — это Коля Ветров. Они вдвоём там до девяностого работали.', do: (c) => { c.setFlag('zina_photo_told'); c.clue('photo_p17'); }, next: 'photo2' },
      photo2: {
        text: 'Потом объект закрыли, Петю на пенсию по здоровью. Он после этого ночами не спал. Говорил: «Зина, стены помнят». Я думала — заговаривается.',
        choices: [
          { text: '«Стены помнят»? Что это значит?', next: 'photo3' },
          { text: 'Понятно…', next: 'inside' },
        ],
      },
      photo3: { text: 'Говорил, в бетон что-то добавляли. Кристаллы. Чтобы звук записывать, а потом… обратно. Ну, Кирюша, это же сказки. Да ведь?', mood: 'смотрит на тебя слишком долго', do: (c) => c.setFlag('know_concrete'), next: 'inside' },
      clock1: { text: 'Подарила. На пятидесятилетие, в девяносто восьмом. Пара была: одни Пете, одни Коле. Никто, кроме нас троих, не знал.', mood: 'шёпотом', do: (c) => c.setFlag('zina_clock_told'), next: 'clock2' },
      clock2: { text: 'Кирюша… а если это правда он? Если он там, в пятьдесят второй, все три года?', next: 'inside' },
      box: { text: 'Петины бумаги. Я их так и не разобрала… Возьми, ты молодой, разберёшься. Мне всё равно глаза не те.', do: (c) => c.give('pass_p17'), next: 'inside' },
    },
  },

  // ===================================================================== Марина
  marina: {
    door: (c) => {
      if (c.flag('knock_active')) return { say: 'Кто там?! Я не открою! Я вызову… я никого не вызову, да. Уходите!', who: 'marina' };
      if (c.time >= t('00:15') && !c.hasItem('inhaler')) return { say: 'Кто там? …Кирилл? Простите, я ночью не открываю. Напишите мне, хорошо?', who: 'marina' };
      return 'open';
    },
    chain: true,
    entries: [
      { cond: (c) => c.hasItem('inhaler') && !c.flag('inhaler_delivered'), node: 'give' },
      { cond: (c) => c.flag('inhaler_delivered'), node: 'after' },
      { cond: (c) => c.flag('zina_walk_done'), node: 'cold' },
      { node: 'hello' },
    ],
    nodes: {
      give: {
        text: 'Кирилл? Вы принесли? Господи…',
        choices: [
          { text: 'Вот, от Зинаиды Павловны.', tag: 'Отдать: Беротек', do: (c) => c.deliverInhaler(), next: 'give2' },
        ],
      },
      give2: { text: 'Спасибо. Спасибо вам. Соня, слышишь? Дядя Кирилл принёс лекарство.', next: 'give3' },
      give3: {
        text: 'Простите, что через цепочку. Соня боится, когда открывают. Говорит, ночью кто-то ходит по коридору и стучит. Три раза. Я думала, это Геннадий Борисович обходы делает.',
        do: (c) => { c.setFlag('heard_three_knocks'); c.rel.learn('marina', 'player_helped'); },
        choices: [
          { text: 'Три раза? Когда это было?', next: 'give4' },
          { text: 'Если что-то понадобится — пишите.', next: 'bye' },
        ],
      },
      give4: { text: 'Вчера. И позавчера. Около двух ночи. Я смотрела в глазок — никого. Только свет в коридоре моргал.', mood: 'тише', next: 'bye' },
      bye: { text: 'Спокойной ночи, Кирилл. Правда — спасибо.', end: true },
      after: {
        text: 'Кирилл? Всё хорошо?',
        choices: [
          { text: 'Как Соня?', next: 'sonya' },
          { text: 'Не открывайте ночью никому, ладно? Даже если голос знакомый.', cond: (c) => c.flag('after_vetrov') && !c.flag('warned_marina_early'), do: (c) => { c.setFlag('warned_marina_early'); c.rel.learn('marina', 'dont_open_at_night'); }, next: 'wont' },
          { text: 'Спокойной ночи.', next: null },
        ],
      },
      sonya: { text: 'Спит. Дышит ровно. Во сне разговаривает — с кем-то спорит. Ей семь, они все так.', end: true },
      wont: { text: 'Я и не открываю. Мне кажется, я теперь вообще никогда никому не открою.', end: true },
      cold: { text: 'Кирилл. Зинаида Павловна сама принесла. С палочкой, по коридору.', mood: 'холодно', do: (c) => { if (!c.flag('marina_cold_once')) { c.setFlag('marina_cold_once'); c.rel.adjust('marina', { trust: -5 }); } }, next: 'cold2' },
      cold2: { text: 'Извините. Мне надо к Соне.', end: true },
      hello: {
        text: 'Да? Кто… а, Кирилл. Что-то случилось?',
        choices: [
          { text: 'Хотел узнать, как вы.', next: 'fine' },
          { text: 'Извините, ничего.', next: null },
        ],
      },
      fine: { text: 'Держимся. Спасибо, что спросили.', end: true },
    },
  },

  // ===================================================================== Денис
  denis: {
    door: (c) => {
      if (c.flag('denis_smoking') && !c.flag('denis_back')) return null;
      if (c.flag('knock_active')) return { say: 'Я тебя вижу на камере. Нет. Иди домой.', who: 'denis' };
      if (c.rel.get('denis').trust >= 10 || c.flag('denis_saw_figure')) return 'open';
      return { say: 'Кто? А, сосед… Слушай, я не открываю. Без обид. Пиши в личку.', who: 'denis' };
    },
    entries: [
      { cond: (c) => c.npcActivity('denis') === 'smoke', node: 'stair1' },
      { node: 'door1' },
    ],
    nodes: {
      stair1: {
        text: (c) => (c.flag('denis_stair_met') ? 'Опять ты. Садись, тут лучший вид на апокалипсис.' : 'О. Живой сосед. Будешь? …Шучу, я ж бросил. Это не моё.'),
        do: (c) => c.setFlag('denis_stair_met'),
        choices: [
          { text: 'Ты писал, что видел что-то на камере.', cond: (c) => !c.flag('denis_cam_sent'), next: 'cam1' },
          { text: 'Что думаешь про «Ветрова»?', cond: (c) => c.flag('after_vetrov'), next: 'vet1' },
          { text: 'Посмотри на это фото.', tag: 'Показать фото', cond: (c) => c.photoTag('figure') && !c.flag('denis_saw_figure'), do: (c) => { c.setFlag('denis_saw_figure'); c.rel.adjust('denis', { trust: 10 }); c.clue('figure_photo'); }, next: 'fig' },
          { text: 'Пока.', next: null },
        ],
      },
      cam1: {
        text: 'Ага. В 21:13 у 52-й кто-то стоял. Сорок минут. Не двигался вообще. Ни переминания, ни телефона. Человек так не стоит.',
        choices: [
          { text: 'Покажешь?', cond: (c) => c.rel.get('denis').trust >= 5 || c.flag('denis_saw_figure'), next: 'cam2' },
          { text: 'Покажешь?', cond: (c) => !(c.rel.get('denis').trust >= 5 || c.flag('denis_saw_figure')), next: 'cam_no' },
          { text: 'Может, это Геннадий был?', next: 'cam_gena' },
        ],
      },
      cam_gena: { text: 'Гена ниже на голову и всё время чешется. Это был не Гена. Это был… кто-то длинный.', next: 'stair1' },
      cam_no: { text: 'Потом. Я сам ещё не уверен, что видел. Не хочу выглядеть психом.', next: 'stair1' },
      cam2: {
        text: 'Скину. Только не в общий чат, ладно? Гена устроит охоту на ведьм, а Зинаиде Павловне и так плохо.',
        do: (c) => { c.setFlag('denis_cam_sent'); c.runSeq('denis_cam'); },
        choices: [
          { text: 'Обещаю. Только между нами.', do: (c) => c.rel.promise('denis', 'cam_private'), next: 'cam3' },
          { text: 'Люди имеют право знать.', do: (c) => { c.rel.adjust('denis', { trust: -5 }); c.setFlag('will_share_cam'); }, next: 'cam4' },
        ],
      },
      cam3: { text: 'Спасибо. Ты нормальный. Для соседа.', end: true },
      cam4: { text: 'Ну… тебе решать. Я предупредил.', end: true },
      vet1: { text: 'Технически — кто-то взял его старый номер. Операторы раздают неактивные через полгода. Только вот… он ответил про часы. Зинаида Павловна потом написала мне в личку: никто не знал.', mood: 'без шуток', next: 'stair1' },
      fig: { text: '…Это у двери, вот прямо здесь? Сейчас? Я тут стою уже двадцать минут. Слушай. Закрывай дверь на лестницу, когда уходишь. Не знаю зачем. Просто закрывай.', mood: 'отходит от двери', next: 'stair1' },
      door1: {
        text: 'Ну? Что-то срочное?',
        choices: [
          { text: 'Посмотри на это фото.', tag: 'Показать фото', cond: (c) => c.photoTag('figure') && !c.flag('denis_saw_figure'), do: (c) => { c.setFlag('denis_saw_figure'); c.rel.adjust('denis', { trust: 10 }); c.clue('figure_photo'); }, next: 'fig' },
          { text: 'Как ты?', next: 'how' },
          { text: 'Ничего. Пока.', next: null },
        ],
      },
      how: { text: 'Сижу, мониторю. Камера в глазке выведена на ноут. Вон ты стоишь. Привет, кстати.', end: true },
    },
  },

  // ===================================================================== Геннадий Борисович
  gennady: {
    door: (c) => {
      if (c.flag('knock_active')) return { say: 'Я вооружён. Предупреждаю один раз.', who: 'gennady' };
      if (c.time >= t('23:55')) return { say: 'Кто? Ермаков? Ночь на дворе. Утром.', who: 'gennady' };
      return 'open';
    },
    entries: [
      { cond: (c) => c.npcActivity('gennady') === 'listen', node: 'at52' },
      { cond: (c) => c.npcActivity('gennady') === 'patrol', node: 'patrol' },
      { cond: (c) => c.npcActivity('gennady') === 'panel', node: 'panel' },
      { node: 'door' },
    ],
    nodes: {
      at52: {
        text: '…! Ермаков. Вы что тут делаете?',
        do: (c) => { c.witnessGena(); },
        choices: [
          { text: 'А вы? Вы же написали в чат, что сидите дома.', cond: (c) => c.flag('gena_said_home'), next: 'lie1' },
          { text: 'Я слышал шаги в 52-й.', next: 'lie1b' },
          { text: 'На лестнице кто-то стоит. Посмотрите.', tag: 'Показать фото', cond: (c) => c.photoTag('figure'), next: 'photo' },
        ],
      },
      lie1: { text: 'Написал, чтобы народ не бегал. Полезут все сюда — будет давка и паника. А паника хуже всего.', next: 'listen' },
      lie1b: { text: 'Вы тоже? С обеда там кто-то ходит. Тук. Тук. Как будто в носках по паркету.', next: 'listen' },
      photo: { text: 'Дайте. …Это где? У нас? Сейчас? Ерунда. Блик.', mood: 'не отдаёт телефон пару секунд', do: (c) => c.rel.learn('gennady', 'figure_photo'), next: 'listen' },
      listen: { text: 'Пломбу — да, я сорвал. Ключ от УК у меня есть, хотел войти, проверить. Имею право.', mood: 'тише', next: 'listen2' },
      listen2: {
        text: 'Дверь не открывается. Изнутри — на цепочке. Понимаете, Ермаков? На цепочке. Изнутри. В квартире, где три года никто не живёт.',
        do: (c) => { c.clue('chain_inside'); c.clue('seal_broken'); c.setFlag('gena_confessed'); },
        choices: [
          { text: 'Я никому не скажу.', do: (c) => { c.setFlag('kept_gena_secret'); c.rel.promise('gennady', 'secret52'); c.rel.adjust('gennady', { trust: 15 }); }, next: 'secret' },
          { text: 'Люди должны знать. Я напишу в чат.', do: (c) => { c.setFlag('exposed_gena'); c.rel.adjust('gennady', { trust: -20 }); c.runSeq('gena_exposed'); c.setFlag('gena_52_done'); }, next: 'threat' },
          { text: 'Пойдёмте отсюда. Вместе. Здесь нельзя стоять.', do: (c) => { c.rel.adjust('gennady', { trust: 5, respect: 10 }); c.setFlag('gena_52_done'); }, next: 'go' },
        ],
      },
      secret: { text: '…Спасибо. Идите домой, Ермаков. Я ещё постою. Послушаю.', end: true },
      threat: { text: 'Пишите. Только потом не удивляйтесь, если в вашу дверь постучат. Не я — я не про себя.', mood: 'глухо', end: true },
      go: { text: '…Ладно. Вы правы. Нечего тут стоять. Отбой.', end: true },
      patrol: {
        text: 'Ермаков! В квартиру. Немедленно.',
        choices: [
          { text: 'Мне нужно к соседке, по делу.', next: 'patrol_ok' },
          { text: 'А вы почему ходите?', next: 'patrol_why' },
          { text: 'Хорошо, хорошо.', next: null },
        ],
      },
      patrol_ok: { text: 'Быстро. Я засекаю время.', end: true },
      patrol_why: { text: 'Я — старший по дому. Я обеспечиваю порядок. Кто-то же должен.', end: true },
      panel: { text: 'Не мешайте. Сам включу. Без самодеятельности.', end: true },
      door: {
        text: 'Что?',
        choices: [
          { text: 'У вас тут… столько воды?', cond: (c) => !c.flag('saw_gena_water'), do: (c) => { c.setFlag('saw_gena_water'); c.clue('gena_water'); }, next: 'water' },
          { text: 'Вы знали Ветрова?', cond: (c) => c.flag('after_vetrov'), next: 'vetrov' },
          { text: 'Ничего. Спокойной ночи.', next: null },
        ],
      },
      water: {
        text: 'Запас. Я человек военный, запасы — это нормально. Вы бы тоже сделали, если бы думали головой.',
        choices: [
          { text: 'А в чате вы собираете воду у соседей «для распределения».', do: (c) => c.rel.adjust('gennady', { trust: -5, respect: 5 }), next: 'water2' },
          { text: 'Понятно.', next: null },
        ],
      },
      water2: { text: 'Кто-то должен распределять. И это буду я. Потому что остальные — растащат. Всё, разговор окончен.', end: true },
      vetrov: { text: 'Знал. Тихий был. Паял. Мне приёмник починил в двадцатом. Хороший приёмник, до сих пор ловит. Иногда ловит то, чего не должен.', mood: 'отводит взгляд', end: true },
    },
  },

  // ===================================================================== Стук в дверь игрока
  knock: {
    entries: [{ node: 'k1' }],
    nodes: {
      k1: {
        speaker: 'voice', name: 'Голос за дверью',
        text: 'Кирилл… Это Марина. Соне плохо. Откройте, пожалуйста.',
        choices: [
          { text: 'Кто там?', next: 'kwho' },
          { text: 'Посмотреть в глазок', do: (c) => c.knockPeephole(), next: null },
          { text: 'Открыть дверь', do: (c) => c.knockOpen(), next: null },
          { text: 'Отойти от двери, не отвечать', next: null },
        ],
      },
      kwho: {
        speaker: 'voice', name: 'Голос за дверью', mood: 'та же интонация, слово в слово',
        text: 'Это Марина. Из сорок восьмой. Соне плохо, Кирилл. Откройте.',
        choices: [
          { text: 'Посмотреть в глазок', do: (c) => c.knockPeephole(), next: null },
          { text: 'Открыть дверь', do: (c) => c.knockOpen(), next: null },
          { text: 'Отойти от двери, не отвечать', next: null },
        ],
      },
    },
  },
};
