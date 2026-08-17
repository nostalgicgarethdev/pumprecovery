from transformers import CLIPProcessor, CLIPModel
import requests
from PIL import Image
from io import BytesIO

model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")

import json 
with open ('./inputs.json', 'r') as f:
    data = json.load(f)
descriptions = [
    "Community-driven token aiming to revolutionize digital interactions",
    "Dog-inspired cryptocurrency promoting fun and humor in finance",
    "Cryptocurrency with a mascot of a popular internet meme character",
    "Token designed for rapid growth and high community engagement",
    "Meme coin with charity-driven initiatives supporting animal welfare",
    "Blockchain token leveraging pop culture for increased adoption",
    "Digital coin with a focus on decentralized community rewards",
    "Internet meme-based cryptocurrency with playful and whimsical themes",
    "Crypto token with a loyalty program rewarding long-term holders",
    "Environmentally conscious meme coin with sustainable practices",
    "NFT-integrated meme token for digital art collectors",
    "Crypto token promoting transparency and fairness in trading",
    "Memecoin with a decentralized autonomous organization (DAO) governance",
    "High-speed transaction coin with low fees for everyday use",
    "Cryptocurrency with airdrop campaigns to boost new user adoption",
    "Limited edition meme coin with exclusive holder benefits",
    "Interoperable blockchain token across multiple crypto platforms",
    "Crypto token with regular burn mechanisms to increase scarcity",
    "Cryptocurrency supporting metaverse and virtual reality platforms",
    "Meme coin with high-profile celebrity endorsements and collaborations",
    "Token featuring innovative smart contract functionality",
    "Meme coin focused on creating a fun and inclusive trading experience",
    "Crypto token with mechanisms for passive income through staking",
    "Digital asset aimed at disrupting traditional financial systems with humor",
    "Cryptocurrency built on a robust and scalable blockchain platform",
    "Token that bridges meme culture with serious financial investment",
    "Coin designed for micro-transactions in social media environments",
    "Meme coin offering rewards and bonuses for community activities",
    "Token with unique anti-inflationary measures to preserve value",
    "Cryptocurrency with active social media presence and viral campaigns",
    "Crypto designed to support charitable causes globally",
    "Blockchain project with a focus on user-friendly features for newcomers",
    "Cryptocurrency offering competitive staking rewards",
    "Meme coin with a focus on mobile and digital wallet integration",
    "Cryptocurrency emphasizing user privacy and security",
    "Token with a vibrant community driving marketing and development",
    "Meme-themed coin that integrates with existing meme culture effectively",
    "Crypto initiative that combines gaming and cryptocurrency",
    "Token fostering a decentralized finance (DeFi) ecosystem",
    "Meme coin built to support specific industries or causes",
    "Cryptocurrency that uses memes for viral growth and engagement",
    "Coin with a mission to simplify cryptocurrency for the average person",
    "Token that offers cross-chain interoperability with other cryptocurrencies",
    "Cryptocurrency promoting a specific lifestyle or cultural movement",
    "Meme coin developed with an emphasis on speed and efficiency",
    "Crypto that introduces unique governance models for community voting",
    "Token that supports a global network of digital content creators",
    "Cryptocurrency designed for rapid transfers and minimal transaction fees",
    "Crypto project that rewards users for content creation and sharing",
    "Meme coin that facilitates easy entry into the cryptocurrency market",
    "Token supporting artistic endeavors through blockchain technology",
    "Cryptocurrency that engages users with interactive challenges and games",
    "Meme coin with a progressive reward system for user engagement",
    "Crypto that pioneers new forms of digital interaction and collaboration",
    "Token promoting a blend of entertainment and investment opportunities",
    "Cryptocurrency that fosters a strong sense of digital community",
    "Token designed for fans of a specific meme or internet culture",
    "Meme coin that celebrates internet history and iconic memes",
    "Token that offers an educational platform for learning about crypto",
     "Token providing automated investment strategies in the crypto market",
    "Cryptocurrency enhancing blockchain scalability through unique algorithms",
    "Meme coin designed to promote digital literacy across underrepresented communities",
    "Token that rewards users for participating in online educational courses",
    "Crypto asset built on the principle of total transparency and open governance",
    "Meme coin with a system to fund public arts and cultural projects",
    "Token aimed at creating a decentralized network of advertisers and content creators",
    "Crypto supporting the development and preservation of open-source software",
    "Token with benefits for holders to access advanced cloud storage solutions",
    "Cryptocurrency fostering a network of amateur astronomers and space enthusiasts",
    "Meme coin designed to reduce transaction fees with each consecutive transaction",
    "Token contributing a portion of transaction fees to ocean cleanup projects",
    "Crypto integrating cutting-edge cybersecurity measures for safe trading",
    "Token promoting the revival of endangered languages and cultures",
    "Meme coin that doubles as a ticket for exclusive virtual reality concerts",
    "Crypto asset encouraging technological innovation in developing countries",
    "Token supporting global health initiatives with every transaction",
    "Meme coin that offers discounts on eco-friendly products and services",
    "Token that connects blockchain with physical fitness tracking devices",
    "Cryptocurrency aiming to simplify and secure online identity verification",
    "Token that provides access to a decentralized job marketplace",
    "Crypto with a system that dynamically adjusts its mining difficulty",
    "Meme coin offering financial literacy tools integrated with personal banking features",
    "Token designed to support the global freelance economy with swift payments",
    "Crypto for crowdfunding community-led environmental projects",
    "Token incentivizing users for sharing and curating digital media",
    "Meme coin centered around promoting indie game developers",
    "Token leveraging AI to provide real-time trading insights",
    "Crypto with mechanisms to ensure fair trading practices",
    "Meme coin aimed at enhancing privacy in digital communications",
    "Token funding innovative recycling technologies",
    "Crypto asset designed to support decentralized news and media outlets",
    "Token providing access to encrypted, decentralized cloud computing",
    "Meme coin for trading collectible digital merchandise",
    "Crypto facilitating a global network of remote learning",
    "Token promoting advancements in telemedicine and online healthcare",
    "Meme coin enhancing the security and transparency of voting systems",
    "Token enabling investments in renewable energy projects",
    "Crypto designed to support artists through micro-patronage",
    "Meme coin used for trading and collecting digital pets",
    "Token that supports amateur filmmakers with grants and funding",
    "Crypto providing incentives for users to adopt sustainable habits",
    "Token aimed at creating a decentralized platform for legal services",
    "Meme coin linking cryptocurrency enthusiasts with local meetups and events",
    "Crypto that integrates with smart home technology",
    "Token designed to reward users for waste reduction and recycling",
    "Crypto promoting safe and accessible online spaces for children",
    "Meme coin facilitating a peer-to-peer network for shared resources",
    "Token supporting research and development in green technologies",
    "Crypto asset with a focus on enhancing user interface design for ease of use",
    "Token offering decentralized storage solutions",
    "Meme coin with a loyalty program for online streaming services",
    "Crypto that rewards users for contributions to forums and online communities",
    "Token enabling direct, peer-to-peer digital content sales",
    "Crypto that allows holders to vote on future project developments",
    "Meme coin dedicated to preserving digital history and archives",
    "Token supporting global digital infrastructure projects",
    "Crypto facilitating borderless, digital nomad lifestyles",
    "Token integrating blockchain with traditional retail rewards programs",
    "Crypto supporting artists and musicians through direct, transparent payments",
    "Meme coin aimed at funding renewable energy installations",
    "Token supporting urban greening and public space projects",
    "Crypto that reduces its carbon footprint through offset initiatives",
    "Token designed for instant, fee-free transactions",
    "Meme coin promoting diversity and inclusion within the blockchain community",
    "Crypto for facilitating barter systems within local economies",
    "Token that automatically donates to charity based on transaction volume",
    "Crypto offering real-world rewards and experiences for virtual activities",
    "Meme coin with features supporting the gig and sharing economies",
    "Token designed to bridge the gap between cryptocurrencies and mainstream finance",
    "Crypto promoting ethical trading practices within blockchain networks",
    "Token that supports blockchain education in schools",
    "Crypto aimed at facilitating international humanitarian aid",
    "Meme coin building a decentralized platform for event tickets"
]
new_data = []
from time import sleep 
for item in data:
    try:
        # Load the image
        response = requests.get(item["image_uri"])
        image = Image.open(BytesIO(response.content))

        # Prepare the inputs
        inputs = processor(text=descriptions, images=image, return_tensors="pt", padding=True)

        # Get model outputs
        outputs = model(**inputs)

        # Find the highest scoring description
        logits = outputs.logits_per_image.squeeze()
        best_description_idx = logits.argmax().item()
        print(f"Best description for {item['name']}: {descriptions[best_description_idx]} with score {logits[best_description_idx].item()}")
        item["image_description"] = descriptions[best_description_idx]
        item["image_score"] = logits[best_description_idx].item()
        new_data.append(item)
        with open('outputs2.json', 'w') as f:
            json.dump(new_data, f)

    except Exception as e:
        
        print(e)
        sleep(2)