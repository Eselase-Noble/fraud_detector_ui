export interface Transaction {
  transaction_id: string;
  user_id: string;
  amount: number;
  currency: string;
  merchant?: string;
  location?: string;
  timestamp: string;
}

export interface FraudResult {
  transaction_id: string;
  score: number;
  decision: "ALLOW" | "REVIEW" | "BLOCK";
  reason: string;
  signals: string[];
}
