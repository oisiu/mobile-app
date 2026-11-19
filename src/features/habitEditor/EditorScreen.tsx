import { t } from '@/i18n';
import { Text } from '@/theme/Typography';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRef, useState, type ReactNode } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { s } from './editorStyles';
import type { Palette } from './editorTypes';

type Props = {
  busy?: boolean;
  locked?: boolean;
  c: Palette;
  title: string;
  onSave: () => Promise<void>;
  children: ReactNode;
  onSavingChange?: (value: boolean) => void;
};
export function EditorScreen({ c, title, onSave, children, onSavingChange, busy = false, locked = false }: Props) {
  const pending = useRef(false),
    [saving, setSaving] = useState(false);
  const save = async () => {
    if (pending.current || busy) return;
    pending.current = true;
    setSaving(true);
    onSavingChange?.(true);
    try {
      await onSave();
    } finally {
      pending.current = false;
      setSaving(false);
      onSavingChange?.(false);
    }
  };
  return (
    <ScrollView
      style={[s.page, { backgroundColor: c.bg }]}
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={s.top}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('habitEditorBack')}
          disabled={saving || busy}
          hitSlop={8}
          style={s.backButton}
          onPress={() => router.dismissTo('/(tabs)')}
        >
          <Ionicons name="chevron-back" size={16} color={c.accent} accessible={false} />
          <Text style={{ color: c.accent, fontSize: 17 }}>{t('habitEditorBack')}</Text>
        </TouchableOpacity>
        <Text accessibilityRole="header" style={[s.title, { color: c.text }]}>
          {title}
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ disabled: saving || busy, busy: saving || busy }}
          disabled={saving || busy}
          onPress={save}
          style={[s.saveButton, { backgroundColor: c.accent, opacity: saving || busy ? 0.5 : 1 }]}
        >
          <Text style={{ color: c.onAccent, fontWeight: '700', fontSize: 16 }}>{t('save')}</Text>
        </TouchableOpacity>
      </View>
      <View
        style={s.form}
        pointerEvents={saving || busy || locked ? 'none' : 'auto'}
        accessibilityElementsHidden={saving || busy || locked}
        importantForAccessibility={saving || busy || locked ? 'no-hide-descendants' : 'auto'}
      >
        {children}
      </View>
    </ScrollView>
  );
}
