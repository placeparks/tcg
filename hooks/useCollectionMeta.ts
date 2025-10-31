// hooks/useCollectionMeta.ts
import { useReadContracts } from "wagmi";
import { CONTRACTS } from "@/lib/contract";

export function useCollectionMeta(address: `0x${string}`, type: 'erc1155' | 'single' = 'single') {
  const { data, isLoading, isError } = useReadContracts({
    contracts: type === 'erc1155'
      ? ([
          { address, abi: CONTRACTS.nft1155Abi, functionName: "name" },
          { address, abi: CONTRACTS.nft1155Abi, functionName: "symbol" },
          { address, abi: CONTRACTS.nft1155Abi, functionName: "uri", args: [0n] as const },
          { address, abi: CONTRACTS.nft1155Abi, functionName: "baseUri" },
        ] as const)
      : ([
          { address, abi: CONTRACTS.singleCollectionAbi, functionName: "name" },
          { address, abi: CONTRACTS.singleCollectionAbi, functionName: "symbol" },
          { address, abi: CONTRACTS.singleCollectionAbi, functionName: "uri", args: [0n] as const },
        ] as const),
  });

  const name   = (data?.[0]?.result as string) || "Unknown";
  const symbol = (data?.[1]?.result as string) || "NFT";
  const uri0   = (data?.[2]?.result as string) || "";
  const base   = type === 'erc1155' ? ((data?.[3]?.result as string) || "") : "";

  // Choose a reasonable display source: prefer uri(0) if present, otherwise baseUri for ERC1155
  const bestUri = uri0 || base;

  return {
    name,
    symbol,
    imageUri: bestUri,
    isLoading,
    isError,
  };
}
