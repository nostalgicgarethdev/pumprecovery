import { NextApiResponse } from "next";
import pinataSDK from "@pinata/sdk";
import { Readable } from "stream";

const pinata = new pinataSDK({
  pinataApiKey: process.env.PINATA_API_KEY,
  pinataSecretApiKey: process.env.PINATA_SECRET_API_KEY,
});

const saveFile = async (file: any) => {
  try {
    const options = {
      pinataMetadata: {
        name: file.name,
      },
    };

    const fileBuffer = await file.arrayBuffer();
    const fileStream = new Readable();
    fileStream.push(Buffer.from(fileBuffer));
    fileStream.push(null);

    const response = await pinata.pinFileToIPFS(fileStream, options);

    return response;
  } catch (error) {
    throw error;
  }
};

export const POST = async (req: Request, res: NextApiResponse) => {
  const formData = await req.formData();

  const file = formData.get("file");
  const response = await saveFile(file);
  const { IpfsHash } = response;

  return Response.json({
    fileUri: `https://ipfs.io/ipfs/${IpfsHash}`,
  });
};
