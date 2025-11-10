// =======================================================================
// MỤC ĐÍCH:
// Tạo và khởi tạo một đối tượng Supabase client duy nhất để tái sử dụng
// trong toàn bộ ứng dụng.
//
// LÝ DO:
// - Mẫu thiết kế Singleton: Đảm bảo chỉ có một kết nối đến Supabase được
//   tạo ra, giúp tiết kiệm tài nguyên và quản lý kết nối tập trung.
// - Tách biệt cấu hình: Tách thông tin cấu hình (URL, key) ra khỏi
//   logic nghiệp vụ của ứng dụng, giúp code sạch sẽ và dễ bảo trì.
// - Bảo mật: Sử dụng biến môi trường (environment variables) để lưu
//   các thông tin nhạy cảm, tránh hard-code trực tiếp trong mã nguồn.
//
// GIẢI PHÁP:
// 1. Import hàm `createClient` từ thư viện `@supabase/supabase-js`.
// 2. Lấy URL và `anon` key của Supabase project từ các biến môi trường
//    (process.env). Các biến này sẽ được định nghĩa trong file `.env.local`.
// 3. Kiểm tra xem các biến môi trường đã được cung cấp hay chưa. Nếu
//    chưa, đưa ra một lỗi rõ ràng để hướng dẫn người dùng.
// 4. Gọi `createClient` với các thông tin trên để tạo ra đối tượng client.
// 5. Export đối tượng client để các component khác có thể import và sử dụng.
// =======================================================================

import { createClient } from '@supabase/supabase-js';

// Lấy thông tin kết nối từ biến môi trường
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Kiểm tra xem các biến môi trường đã được thiết lập chưa
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key must be defined in .env.local. Please check the instructions.");
}

// Tạo và export một Supabase client duy nhất
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
