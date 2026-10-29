// Сюжетные события первой главы. cond(c) проверяется дважды в секунду, do(c) выполняется один раз.
// c — StoryContext (см. story/StoryContext.js). Время — игровое (t('23:00')), c.since(id) — реальные секунды.
import { t } from '../utils/time.js';

export const STORY_EVENTS = [
  { id: 'intro', cond: () => true, do: (c) => c.runSeq('intro') },
  { id: 'inhaler', cond: (c) => c.since('intro') > 55, do: (c) => c.runSeq('inhaler') },
  { id: 'irina', cond: (c) => c.time >= t('22:08') && c.since('inhaler') > 60, do: (c) => c.runSeq('irina_work') },
  { id: 'lyosha_fence', cond: (c) => c.time >= t('22:18'), do: (c) => c.runSeq('lyosha_fence') },

  // Обещал отнести ингалятор, но так и не дошёл
  {
    id: 'promise_broken',
    cond: (c) => c.flag('promised_inhaler') && !c.flag('inhaler_delivered') && c.time >= t('22:46') && !c.hasItem('inhaler'),
    do: (c) => { c.rel.breakPromise('marina', 'inhaler'); c.runSeq('inhaler_nobody_late'); },
  },
  // Отключение света: после истории с ингалятором (или по времени)
  {
    id: 'blackout',
    cond: (c) => c.time >= t('22:24') && (c.flag('inhaler_delivered') || c.flag('zina_walk_done') || c.time >= t('22:50')) && !c.busy() && c.since('inhaler') > 90,
    do: (c) => c.story.blackout(),
  },
  // Лапин срывает пломбу с 52-й, пока на этаже темно
  { id: 'seal_torn', cond: (c) => c.flag('blackout') && c.since('blackout') > 30, do: (c) => c.story.tearSeal() },
  { id: 'gena_to_panel', cond: (c) => c.flag('blackout') && !c.flag('breaker_fixed') && c.since('blackout') > 200, do: (c) => c.setFlag('gena_to_panel') },
  { id: 'lift_ghost', cond: (c) => c.flag('breaker_fixed') && c.since('breaker_fixed_ev') > 6, do: (c) => c.story.liftGhost() },
  { id: 'breaker_fixed_ev', cond: (c) => c.flag('breaker_fixed'), do: () => {} },

  // «Ветров» появляется в чате
  { id: 'vetrov', cond: (c) => (c.flag('breaker_fixed') && c.since('breaker_fixed_ev') > 40) || c.time >= t('23:20'), do: (c) => c.runSeq('vetrov') },
  { id: 'figure_stair', cond: (c) => c.flag('after_vetrov') && !c.flag('knock_active') && !c.flag('knock_done'), do: (c) => c.story.setFigure('stair_glass') },
  { id: 'silhouette', cond: (c) => c.flag('after_vetrov') && c.since('vetrov') > 60 && c.playerRoom() === 'corridor' && c.lookingWest() && c.playerX() > -4, do: (c) => c.story.silhouette() },

  { id: 'mom_call', cond: (c) => c.time >= t('23:02') && c.flag('after_vetrov') && !c.busy(), do: (c) => c.contacts.incoming('mom_evening') },

  // Лапин у 52-й, хотя пишет, что дома
  { id: 'gena_at_52', cond: (c) => c.flag('after_vetrov') && c.time >= t('23:12') && c.since('vetrov') > 90, do: (c) => c.setFlag('gena_at_52') },
  { id: 'gena_home_msg', cond: (c) => c.flag('gena_at_52') && c.npcAt('gennady', 'f52'), do: (c) => c.runSeq('gena_home') },
  { id: 'gena_leave_52', cond: (c) => c.flag('gena_at_52') && !c.flag('gena_52_done') && (c.time >= t('00:05') || (c.flag('gena_confessed') && c.since('gena_home_msg') > 90)), do: (c) => c.setFlag('gena_52_done') },

  { id: 'denis_smoke', cond: (c) => c.time >= t('23:35') && c.flag('after_vetrov'), do: (c) => c.runSeq('denis_smoke') },
  { id: 'denis_back', cond: (c) => c.time >= t('00:22') && c.flag('denis_smoking'), do: (c) => c.runSeq('denis_back') },
  { id: 'lyosha_photo', cond: (c) => c.time >= t('23:48') && c.flag('after_vetrov'), do: (c) => c.runSeq('lyosha_photo') },

  { id: 'note_drop', cond: (c) => c.time >= t('00:02') && c.playerApartment() === '47' && c.flag('after_vetrov'), do: (c) => c.runSeq('note_drop') },
  { id: 'unknown_sms', cond: (c) => c.time >= t('00:16') && c.flag('after_vetrov'), do: (c) => c.runSeq('unknown_sms') },
  { id: 'night_quest', cond: (c) => c.time >= t('00:20') && c.flag('after_vetrov'), do: (c) => c.quest.start('night') },
  { id: 'nudge_home', cond: (c) => c.time >= t('00:32') && c.playerApartment() !== '47' && c.flag('after_vetrov'), do: (c) => { c.runSeq('nudge_home'); c.flicker('corridor', 2.5); } },

  // Главный выбор главы: стук в дверь
  {
    id: 'knock',
    cond: (c) => c.time >= t('00:26') && c.flag('after_vetrov') && c.playerApartment() === '47' && c.doorClosed('d47') && !c.busy(),
    do: (c) => { c.quest.objective('night', 'home'); c.story.startKnock(); },
  },
  { id: 'ending', cond: (c) => c.flag('aftermath_done') && c.flag('knock_done') && c.since('knock') > 30 && !c.busy(), do: (c) => c.story.finishChapter() },
];
