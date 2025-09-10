interface ErrorResponse {
  status: "error";
  message: string;
  cause?: {
    name: string;
    code?: string;
    issues?: [];
  };
}

interface SuccessResponse {
  status: "success";
  token: string;
}

export type LoginResponse = ErrorResponse | SuccessResponse;

export type ActiveConnection = {
  status: "active" | "inactive";
  subscription_url: string;
  ss_links: {
    country: string;
    link: string;
  }[];
  used_traffic: number;
  limit: number | null;
  limit_reset_strategy: string;
  created_at: string;
  expire: string | null;
  online_at: string | null;
};
