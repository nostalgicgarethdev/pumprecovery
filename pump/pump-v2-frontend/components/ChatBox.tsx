"use client";

import { useState } from "react";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";
import { AvatarImage, AvatarFallback, Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Chatbox() {
  const [isChatVisible, setChatVisible] = useState(false);

  return (
    <>
      <Button
        onClick={() => setChatVisible(!isChatVisible)}
        className="bg-blue-400 hover:bg-blue-400 fixed right-0 top-0 mt-12 rounded-none h-8 z-50"
      >
        {isChatVisible ? <FaArrowRight /> : <FaArrowLeft />}
        Trollbox
      </Button>
      <div
        className={`fixed right-0 top-0 mt-20 h-3/4 transition-transform duration-500 ease-in-out transform ${
          isChatVisible ? "translate-x-0" : "translate-x-full"
        } flex flex-col sm:w-2/3 md:w-1/4 p-4 bg-[#2e303a] text-white z-50`}
      >
        <div className="flex flex-col space-y-4 overflow-y-auto h-[calc(100%-64px)] mb-4 rounded rounded-md">
          <div className="flex items-start space-x-2">
            <Avatar>
              <AvatarImage
                alt="user avatar"
                src="/placeholder.svg?height=32&width=32"
              />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm">
                <strong>tamagoyaki:</strong> ooga booga
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Input
            className="flex-1 border border-white"
            placeholder="Send a message"
          />
          <Button className="bg-blue-400 hover:bg-blue-500 rounded rounded-md">
            Chat
          </Button>
        </div>
      </div>
    </>
  );
}
