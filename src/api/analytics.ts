import { http } from "./http";
import type { FraudStats } from '@/types/fraud.ts'

export const fraud_stats = async (): Promise<FraudStats> => {
  const res = await http.get("/analytics/fraud_stats");
  return res.data;
}
