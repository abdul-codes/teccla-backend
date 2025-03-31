import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export async function generateUniqueAccountId(): Promise<string> {
  const maxAttempts = 10; // Prevent infinite loops
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    // Generate a candidate accountId (e.g., 8-digit number)
    const candidateId = crypto.randomInt(10000000, 100000000).toString();

    // Check if it already exists in the database
    const existingUser = await prisma.user.findUnique({
      where: { userAccountId: candidateId },
    });

    if (!existingUser) {
      return candidateId; // Unique ID found
    }

    attempts++;
  }

  throw new Error('Failed to generate a unique accountId after multiple attempts.');
}