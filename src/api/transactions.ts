import { http } from "./http";
import { type Transaction } from "@/types/fraud";

export const detectFraud = async (txn: Transaction) => {
  const res = await http.post("/transactions/detect", txn);
  return res.data;
};

export const getAllTransactions = async () => {
  const res = await http.get("/transactions");
  return res.data;
};
