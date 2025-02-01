import pgPromise, { IDatabase, IMain } from "pg-promise";

// Database interface extensions
interface IExtensions {
  // Add any custom methods here
}

// Export types
export type Database = IDatabase<IExtensions>;

// Initialize pg-promise with options
const initOptions = {
  error(err: Error, e: any) {
    if (e.cn) {
      console.error("DB Connection Error:", err);
    } else if (e.query) {
      console.error("Query Error:", err);
    }
  },
};

const pgp: IMain = pgPromise(initOptions);

// Create and export database instance
const connectionConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "aimaestro",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD,
  max: 20,
};

export const db = pgp(connectionConfig);
