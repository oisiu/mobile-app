import { vi } from 'vitest';

// Feature tests inspect native text nodes; font rendering is verified on device.
vi.mock('@/theme/Typography',async()=>{
  const native=await import('react-native');
  return {Text:native.Text,TextInput:'TextInput' in native?native.TextInput:'TextInput'};
});
vi.mock('@/theme/SvgTypography',async()=>({SvgText:(await import('react-native-svg')).Text}));
vi.mock('expo-font',()=>({useFonts:()=>[true,null]}));
