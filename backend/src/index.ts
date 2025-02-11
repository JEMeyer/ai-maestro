import dotenv from "dotenv";
dotenv.config();

import "./instrument";

import { Server } from "./server";

async function main() {
  try {
    const server = new Server();
    await server.start();
  } catch (error) {
    console.error("Failed to start application:", (error as Error).message);
    process.exit(1);
  }
}

main();
