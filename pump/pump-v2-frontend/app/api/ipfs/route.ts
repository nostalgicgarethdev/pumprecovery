import { NextApiResponse } from "next";
import pinataSDK from "@pinata/sdk";
import { Readable } from "stream";
import { originFromHost } from "@/lib/brand";

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

const saveJson = async (json: any) => {
  const options = {
    pinataMetadata: {
      name: "metadata.json",
    },
  };

  return pinata.pinJSONToIPFS(json, options);
};

export const POST = async (req: Request) => {
  try {
    const formData = await req.formData();

    const file = formData.get("file");
    const name = formData.get("name");
    const symbol = formData.get("symbol");
    const description = formData.get("description");
    const twitter = formData.get("twitter");
    const telegram = formData.get("telegram");
    const website = formData.get("website");
    const showName = formData.get("showName") === "false" ? false : true;

    if (!file) {
      return Response.json({ error: "no file" }, { status: 400 });
    }

    const response = await saveFile(file);
    const { IpfsHash: imageIpfsHash } = response;

    const host =
      req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    const proto = req.headers.get("x-forwarded-proto") || "https";

    const metadata: any = {
      name,
      symbol,
      description,
      image: `https://ipfs.io/ipfs/${imageIpfsHash}`,
      showName,
      createdOn: originFromHost(host, proto),
    };

    if (twitter) metadata.twitter = twitter;
    if (telegram) metadata.telegram = telegram;
    if (website) metadata.website = website;

    const { IpfsHash: metaplexIpfsHash } = await saveJson(metadata);

    return Response.json({
      metadata,
      metadataUri: `https://ipfs.io/ipfs/${metaplexIpfsHash}`,
    });
  } catch (e: any) {
    console.error("ipfs upload failed", e);
    return Response.json({ error: e?.message || "ipfs upload failed" }, { status: 500 });
  }
};
