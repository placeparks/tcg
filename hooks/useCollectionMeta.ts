// hooks/useCollectionMeta.ts
import { useReadContracts } from "wagmi";
import { CONTRACTS } from "@/lib/contract";

export function useCollectionMeta(address: `0x${string}`) {
  const { data, isLoading, isError } = useReadContracts({
    contracts: [
      {
        address,
        abi: CONTRACTS.nft1155Abi,
        functionName: "name",
      },
      {
        address,
        abi: CONTRACTS.nft1155Abi,
        functionName: "symbol",
      },
      {
        address,
        abi: CONTRACTS.nft1155Abi,
        functionName: "uri",
        args: [0n],
      },
    ],
  });

  return {
    name: (data?.[0]?.result as string) || "Unknown",
    symbol: (data?.[1]?.result as string) || "NFT",
    imageUri: (data?.[2]?.result as string) || "",
    isLoading,
    isError,
  };
}
