// Unit tests must never reach a database (D-12).
delete process.env.NETLIFY_DB_URL;
delete process.env.DATABASE_URL;
delete process.env.NETLIFY_DB_DRIVER;
