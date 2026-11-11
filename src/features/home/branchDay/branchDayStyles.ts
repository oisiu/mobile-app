import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#0008', justifyContent: 'center', alignItems: 'center', padding: 20 },
  sheet: { width: '100%', maxWidth: 480, maxHeight: '90%', borderRadius: 22 },
  content: { padding: 20, gap: 14 },
  title: { fontSize: 20, fontWeight: '800' },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: 12,
    borderRadius: 14,
  },
  previewValue: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginTop: 4 },
  smallAction: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
  },
  record: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 8, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  path: { flex: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 12 },
  button: {
    minHeight: 48,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 18 },
});
