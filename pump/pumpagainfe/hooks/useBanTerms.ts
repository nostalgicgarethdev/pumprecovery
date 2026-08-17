import { useProfile } from "@/providers/ProfileProvider";
import { useEffect, useState } from "react";

interface BanTerm {
  id: number;
  term: string;
}

export const useBanTerms = () => {
  const { loginToken } = useProfile();
  const [banTerms, setBanTerms] = useState<BanTerm[]>([]);

  const fetchBanTerms = async () => {
    const banTerms = await fetch(
      `${process.env.NEXT_PUBLIC_CLIENT_API_URL}/replies/ban-terms`,
      {
        headers: {
          Authorization: `Bearer ${loginToken}`, // Pass the JWT token here
        },
      }
    ).then((r) => r.json());

    setBanTerms(banTerms.reverse());
  };

  const createBanTerm = async (term: string) => {
    console.log("TERM", term);

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_CLIENT_API_URL}/replies/ban-terms`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${loginToken}`,
        },
        body: JSON.stringify({ term }),
      }
    );

    fetchBanTerms();
  };

  const deleteBanTerm = async (id: number) => {
    await fetch(
      `${process.env.NEXT_PUBLIC_CLIENT_API_URL}/replies/ban-terms/${id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${loginToken}`,
        },
      }
    );

    fetchBanTerms();
  };

  useEffect(() => {
    fetchBanTerms();
  }, []);

  return { fetchBanTerms, banTerms, createBanTerm, deleteBanTerm };
};
