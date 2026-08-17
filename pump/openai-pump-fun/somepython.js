import OpenAI from "openai";
import fs from "fs";
const oai = new OpenAI({
  baseURL: "https://relay.kuzco.xyz/v1",
  apiKey: "kuzco-900d7f6c2f0b4944ac2b50a06f592baa", // obtainable from https://kuzco.xyz/register
  timeout: 5 * 60 * 1000,
});

const data = JSON.parse(fs.readFileSync("./outputs.json"));
const context = fs
  .readFileSync("./outputs.jsonl")
  .toString()
  .split("\n")
  .flatMap((c) => JSON.parse(c).messages);
for (const c of context) {
  if (c.role == "assistant") {
    if (parseInt(c.content) > 0) {
      console.log(c.content);
    }
  }
}
import { PromisePool } from "@supercharge/promise-pool";

await PromisePool.withConcurrency(data.length)
  .for(data)
  // @ts-ignore
  .handleError(async (err, asset) => {
    console.error(`\nError uploading or whatever`, err.message);
    ms = ms * 2;
    await sleep(ms * 4);
  })
  // @ts-ignore
  .process(async (sample) => {
    const input_text = `Asset details: ${sample["name"]}, ${
      sample["description"]
    }, Has twitter: ${sample["twitter"] != null}, Has website: ${
      sample["website"] != null
    }, Has telegram: ${sample["telegram"] != null}, Image description: ${
      sample["image_description"]
    }`;
    const newSample = [
      { role: "system", content: "Tokenization and encoding of input text." },
      { role: "user", content: input_text },
    ];
    try {
      const contextPlusNewSample = [
        ...context.slice(0, context.length / 64),
        ...newSample,
      ];
      const response = await oai.chat.completions.create({
        messages: contextPlusNewSample,
        model: "llama3:latest",
        stream: false, // streaming is disabled in Kuzco for now
      });

      console.log(sample["name"], response.choices[0].message.content);
    } catch (e) {
      console.error(e);
    }
  });
