import { create } from "zustand";

type AdminState = {
  selectedCampaignId?: string;
  setSelectedCampaignId: (id: string) => void;
};

export const useAdminStore = create<AdminState>((set) => ({
  setSelectedCampaignId: (id) => set({ selectedCampaignId: id })
}));
