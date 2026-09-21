import { useLocalSearchParams } from 'expo-router';
import InsightDetailScreen from '@/features/insights/InsightDetailScreen';

export default function InsightDetailRoute(){
  const {id}=useLocalSearchParams<{id:string}>();
  // A reused or prefetched route must start with this habit's filters and charts.
  return <InsightDetailScreen key={id}/>;
}
