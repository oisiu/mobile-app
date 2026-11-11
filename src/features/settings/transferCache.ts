import * as FileSystem from 'expo-file-system/legacy';

// Expo DocumentPicker owns this cache subdirectory on Android and iOS.
export async function clearTransferCache(){
  if(!FileSystem.cacheDirectory)throw new Error('Transfer cache is unavailable');
  for(const name of ['oisiu-export.json','oisiu-export.csv','DocumentPicker']){
    await FileSystem.deleteAsync(`${FileSystem.cacheDirectory}${name}`,{idempotent:true});
  }
}
