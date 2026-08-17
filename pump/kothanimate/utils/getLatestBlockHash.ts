export const getLatestBlockHash = async () => {
  return fetch(
    `${process.env.NEXT_PUBLIC_CLIENT_API_URL}/jito-tips/latest-block-hash`
  )
    .then((r) => r.json())
    .then((v) => v.blockhash);
};
