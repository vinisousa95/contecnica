"use client";

import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-6 bg-white border-b border-gray-200">
      <div className="flex items-center gap-4">
        {title && (
          <h1 className="text-base font-semibold text-gray-900">{title}</h1>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="text-gray-500">
          <Bell className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
