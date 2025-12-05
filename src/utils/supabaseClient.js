// src/utils/supabaseClient.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv/config'); // Thư viện để đọc file .env

// Đảm bảo bạn đã cài đặt các thư viện cần thiết:
// npm install @supabase/supabase-js dotenv

// Lấy URL và Key từ file .env
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Kiểm tra xem đã có key trong file .env chưa
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL and Key must be provided in .env file');
}

// Tạo và export một đối tượng client duy nhất để dùng trong toàn bộ project
const supabase = createClient(supabaseUrl, supabaseKey);
module.exports = { supabase };