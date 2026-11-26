"use server"

import { prisma } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { onBoard } from "./onboard";

/**
 * Ensures the request is authenticated and the user exists in the database,
 * onboarding on demand if the layout's sync hasn't completed yet.
 *
 * @returns The Prisma `User` linked to the current Clerk session.
 */
export async function requireUser() {
    const { userId } = await auth.protect();
  
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });
  
    if (!user) {
      return onBoard();
    }
  
    return user;
  }
  