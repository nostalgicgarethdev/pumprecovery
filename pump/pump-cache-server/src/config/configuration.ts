export default () => ({
  serverUrl: process.env.SERVER_URL,
  redisUrl: process.env.REDIS_URL,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_KEY,
});
