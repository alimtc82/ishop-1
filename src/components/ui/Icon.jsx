import {
  MessageCircle,
  Phone,
  Pencil,
  Trash2,
  Archive,
  Camera,
  Lock,
  LockOpen,
  ShieldCheck,
  Wrench,
  Palette,
  Check,
  ShoppingBag,
  Smartphone,
  BatteryMedium,
  Award,
  Headphones,
  Copy,
  ChevronLeft,
  Info,
  RotateCcw,
  MapPin,
  Search,
  Smartphone as SmartphoneIcon,
} from 'lucide-react';

/*
 * أيقونات موحّدة (lucide) تحلّ محل الإيموجي في كل الواجهة.
 * الفائدة: مظهر ثابت عبر كل الأنظمة، ألوان تتبع الثيم، وحجم متّسق.
 * الاستخدام: <Icon name="whatsapp" size={16} />
 */
const MAP = {
  whatsapp: MessageCircle,
  phone: Phone,
  edit: Pencil,
  delete: Trash2,
  archive: Archive,
  camera: Camera,
  locked: Lock,
  unlocked: LockOpen,
  warranty: ShieldCheck,
  repair: Wrench,
  color: Palette,
  check: Check,
  bag: ShoppingBag,
  device: Smartphone,
  battery: BatteryMedium,
  award: Award,
  headphones: Headphones,
  copy: Copy,
  chevron: ChevronLeft,
  info: Info,
  returns: RotateCcw,
  location: MapPin,
  search: Search,
  mobile: SmartphoneIcon,
};

export default function Icon({ name, size = 16, className = '', strokeWidth = 2 }) {
  const Cmp = MAP[name];
  if (!Cmp) return null;
  return <Cmp size={size} strokeWidth={strokeWidth} className={className} aria-hidden="true" />;
}
