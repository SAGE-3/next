import { create } from 'zustand';

interface EchartsStore {
  chartDataURL: string | null;
  updateChartDataURL: (state: string) => void;
}

const useEchartsStore = create<EchartsStore>((set) => ({
  chartDataURL: null,
  updateChartDataURL: (state: string) => set(() => ({ chartDataURL: state })),
}));

export default useEchartsStore;
