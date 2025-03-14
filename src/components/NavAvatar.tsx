"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "../../utils/supabase/client";
import { useRouter } from "next/navigation";

interface User {
  avatar_url?: string;
  email?: string;
  name?: string;
}

export const NavAvatar = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUser({
          avatar_url: user.user_metadata?.avatar_url || "",
          email: user.email || "",
          name: user.user_metadata?.full_name || "User",
        });
      }
      setLoading(false);
    };

    fetchUser();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="outline-none">
        {loading ? (
          <Skeleton className="h-10 w-10 rounded-full" />
        ) : (
          <Avatar className="h-10 w-10 cursor-pointer">
            <AvatarImage
              src={user?.avatar_url || "/default-avatar.png"}
              alt="User Avatar"
            />
            <AvatarFallback>{user?.name?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56 p-2 bg-gray-900 shadow-md rounded-lg border-gray-700">
        <div className="p-2 text-center">
          <p className="font-semibold text-gray-200">{user?.name}</p>
          <p className="text-sm text-gray-400">{user?.email}</p>
        </div>
        <DropdownMenuSeparator className="bg-gray-700"/>
        <DropdownMenuItem
          onClick={handleSignOut}
          className="cursor-pointer text-red-400 hover:bg-red-900"
        >
           LogOut
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NavAvatar;
