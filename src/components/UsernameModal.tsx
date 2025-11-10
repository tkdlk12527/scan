// =======================================================================
// MỤC ĐÍCH:
// Component này hiển thị một hộp thoại (modal) để yêu cầu người dùng
// nhập tên của họ lần đầu tiên truy cập ứng dụng.
//
// LÝ DO & GIẢI PHÁP:
// - Trải nghiệm người dùng: Thay vì chuyển hướng trang, một modal được
//   hiển thị ngay trên giao diện chính, giúp người dùng không bị mất
//   ngữ cảnh.
// - Quản lý State: Sử dụng `useState` để theo dõi giá trị tên mà người
//   dùng nhập vào ô input.
// - Xử lý sự kiện:
//   - `handleSubmit`: Được gọi khi người dùng nhấn nút "Lưu". Nó sẽ
//     ngăn chặn hành vi mặc định của form, kiểm tra xem tên có được
//     nhập hay không, sau đó gọi hàm `onSave` được truyền từ component cha.
// - Giao diện (Props):
//   - `onSave`: Một hàm callback (`(name: string) => void`) để component
//     cha xử lý logic lưu trữ tên.
//   - `isLoading`: Một boolean để hiển thị trạng thái chờ, vô hiệu hóa
//     nút bấm trong khi đang lưu dữ liệu.
// =======================================================================

"use client";

import { useState } from 'react';

interface UsernameModalProps {
  onSave: (name: string) => void;
  isLoading: boolean;
}

export default function UsernameModal({ onSave, isLoading }: UsernameModalProps) {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim());
    }
  };

  return (
    <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Chào mừng bạn!</h2>
        <p className="text-gray-600 mb-6">Vui lòng nhập tên của bạn để bắt đầu. Tên của bạn sẽ được sử dụng để ghi nhận các sản phẩm bạn đã quét.</p>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Tên của bạn
            </label>
            <input
              id="username"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Nguyễn Văn A"
              required
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading || !name.trim()}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-md px-4 py-2.5 font-semibold hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Đang lưu...</span>
              </>
            ) : (
              'Lưu và Bắt đầu'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
