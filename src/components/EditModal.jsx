import { useState } from 'react';
import { useToast } from '../context/ToastContext';
import { updateDevice, uploadDeviceImage, saveDevicePrices, deleteDeviceImage } from '../lib/api';
import Modal from './ui/Modal';
import DeviceForm from './DeviceForm';

/** مودال التعديل — بيعيد استخدام DeviceForm بوضع edit. */
export default function EditModal({ device, onSaved, onClose }) {
  const { show } = useToast();
  const [busy, setBusy] = useState(false);

  if (!device) return null;

  async function handleSubmit(fields, newImages, priceEntries, keptImages) {
    setBusy(true);
    try {
      // الصور الحالية بعد المسح (اللي المستخدم ساب) + الصور الجديدة المرفوعة
      const kept = Array.isArray(keptImages) ? keptImages : (device.images || []);
      const original = device.images || [];
      const removedSome = kept.length !== original.length;

      let images;
      if (newImages.length > 0) {
        show(`⏳ جاري رفع ${newImages.length} صورة...`, 'info');
        const uploaded = [];
        for (const img of newImages) {
          uploaded.push(await uploadDeviceImage(img, device.sheetRow));
        }
        images = [...kept, ...uploaded];
      } else if (removedSome) {
        // مفيش صور جديدة بس فيه صور اتمسحت — نحفظ القايمة المتبقّية
        images = kept;
      }

      await updateDevice(device.sheetRow, images ? { ...fields, images } : fields);

      // مسح نهائي من الـ Storage للصور اللي المستخدم شالها
      const removed = original.filter((u) => !kept.includes(u));
      if (removed.length > 0) {
        await Promise.allSettled(removed.map((u) => deleteDeviceImage(u)));
      }

      // الأسعار — محروسة زي الإدخال
      if (priceEntries?.length) {
        try {
          await saveDevicePrices(device.sheetRow, priceEntries);
        } catch (e) {
          console.log('[v0] saveDevicePrices error:', e?.message, e?.code, e?.details);
          show('⚠️ التعديل اتحفظ بس الأسعار ما اتحدّثتش: ' + (e?.message || ''), 'error');
        }
      }

      show('✅ تم حفظ التعديلات');
      onSaved();
      onClose();
    } catch (e) {
      show('❌ فشل الحفظ: ' + (e.message || ''), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={!!device} onClose={onClose} title={`تعديل — ${device.model}`} closeOnOverlay={false}>
      <div className="max-h-[70vh] overflow-y-auto px-1 text-start">
        <DeviceForm
          mode="edit"
          initial={device}
          onSubmit={handleSubmit}
          onCancel={onClose}
          busy={busy}
        />
      </div>
    </Modal>
  );
}
