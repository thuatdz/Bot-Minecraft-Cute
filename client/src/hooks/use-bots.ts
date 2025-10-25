import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Bot, InsertBot, UpdateBotConfig } from "@shared/schema";

export function useBots() {
  const queryClient = useQueryClient();

  const { data: bots, isLoading, error } = useQuery<Bot[]>({
    queryKey: ["/api/bots"],
  });

  const addBot = useMutation({
    mutationFn: async (bot: InsertBot) => {
      const response = await apiRequest("POST", "/api/bots", bot);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bots"] });
    },
  });

  const startBot = useMutation({
    mutationFn: async (botId: string) => {
      const response = await apiRequest("POST", `/api/bots/${botId}/start`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bots"] });
    },
  });

  const stopBot = useMutation({
    mutationFn: async (botId: string) => {
      const response = await apiRequest("POST", `/api/bots/${botId}/stop`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bots"] });
    },
  });

  const updateBotConfig = useMutation({
    mutationFn: async ({ botId, config }: { botId: string; config: UpdateBotConfig }) => {
      const response = await apiRequest("PUT", `/api/bots/${botId}/config`, config);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bots"] });
    },
  });

  const deleteBot = useMutation({
    mutationFn: async (botId: string) => {
      const response = await apiRequest("DELETE", `/api/bots/${botId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bots"] });
    },
  });

  return {
    bots,
    isLoading,
    error,
    addBot,
    startBot,
    stopBot,
    updateBotConfig,
    deleteBot,
  };
}
