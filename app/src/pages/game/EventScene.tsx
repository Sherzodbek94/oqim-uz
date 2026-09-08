/* eslint-disable react-refresh/only-export-components */
import type { ModalState } from './CardModals';

export type Scene = 'salary' | 'market' | 'bank' | 'business' | 'education' | 'family' | 'health' | 'repair' | 'weekend' | 'charity' | 'dream' | 'production';
const scenes: Scene[] = ['salary', 'market', 'bank', 'business', 'education', 'family', 'health', 'repair', 'weekend', 'charity', 'dream', 'production'];
const defaults: Record<ModalState['kind'], Scene> = {
  'deal-pick': 'business', deal: 'business', market: 'market', event: 'market', dilemma: 'business', migration: 'salary',
  charity: 'charity', doodad: 'repair', baby: 'family', 'child-edu': 'education', downsized: 'salary', weekend: 'weekend',
  'life-event': 'family', 'loan-offers': 'bank', exchange: 'market', 'ft-deal': 'production', 'ft-dream': 'dream',
  'ft-charity': 'charity', 'ft-info': 'market', bot: 'salary',
};

/** Illustration only: never changes eligibility, prices, choices or effects. */
export function sceneForText(text: string, fallback: Scene): Scene {
  const t = text.toLowerCase();
  if (/kasal|shifo|tibb|davola|sog.li|operatsiya/.test(t)) return 'health';
  if (/avto|mashina|ta.mir|transport/.test(t)) return 'repair';
  if (/ta.lim|maktab|bilim|kurs|o.quv|universitet/.test(t)) return 'education';
  if (/farzand|bola|nikoh|oila|to.y|chaqaloq/.test(t)) return 'family';
  if (/xayriya|yordam|ehson/.test(t)) return 'charity';
  if (/kredit|qarz|bank/.test(t)) return 'bank';
  if (/zavod|ishlab chiqar|xomashyo|uskuna|fermer|hosil/.test(t)) return 'production';
  if (/orzu|uy|hovli|kvartira/.test(t)) return 'dream';
  if (/dam olish|sayohat|sayr|ta.til/.test(t)) return 'weekend';
  if (/maosh|ishdan|lavozim|ish haqi/.test(t)) return 'salary';
  if (/biznes|filial|buyurtma|mijoz|do.kon/.test(t)) return 'business';
  if (/bozor|aksiya|birja|savdo|narx/.test(t)) return 'market';
  return fallback;
}

export function modalScene(modal: ModalState): Scene {
  const title = 'card' in modal && 'title' in modal.card ? modal.card.title : 'deal' in modal ? modal.deal.title : 'dream' in modal ? modal.dream.title : 'title' in modal ? modal.title : '';
  return sceneForText(title, defaults[modal.kind]);
}

export default function EventScene({scene, compact = false}: {scene: Scene; compact?: boolean}) {
  const index = scenes.indexOf(scene);
  return <div aria-hidden="true" className={compact ? 'event-scene event-scene-compact' : 'event-scene'} data-scene={scene}>
    <img src="/event-scenes.webp" alt="" draggable={false} decoding="async" style={{left: `${-(index % 4) * 100}%`, top: '50%', transform: `translateY(-${(Math.floor(index / 4) + .5) * 100 / 3}%)`}} />
  </div>;
}
