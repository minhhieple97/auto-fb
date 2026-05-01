import { create } from "zustand";

type AdminState = {
  selectedCampaignId: string | undefined;
  setSelectedCampaignId: (id: string | undefined) => void;
};

export const useAdminStore = create<AdminState>((set) => ({
  selectedCampaignId: undefined,
  setSelectedCampaignId: (id) => set({ selectedCampaignId: id })
}));
