"use client";
export const dynamic = 'force-dynamic'; // chặn SSG đòi ENV lúc build
// =======================================================================
// MỤC ĐÍCH:
// Phiên bản cập nhật tích hợp chức năng chụp ảnh sản phẩm trực tiếp
// từ camera khi người dùng nhấn nút "Lưu".
//
// LÝ DO & GIẢI PHÁP (Cập nhật):
// - Luồng UX liền mạch: Người dùng không cần thực hiện bước chọn ảnh riêng.
//   Hành động "Lưu" sẽ tự động chụp ảnh từ những gì đang hiển thị
//   trên camera.
//
// - State Management (`useState`):
//   - Loại bỏ state `imageFile` và `imagePreview`. Dữ liệu ảnh giờ đây
//     được xử lý tức thời tại thời điểm submit.
//
// - Chức năng Chụp ảnh (`captureImage`):
//   - Tạo một hàm `async` mới tên là `captureImage`.
//   - Hàm này tìm đến thẻ `<video>` mà thư viện `html5-qrcode` đã tạo ra.
//   - Nó vẽ khung hình hiện tại của video vào một thẻ `<canvas>` ẩn.
//   - Chuyển đổi nội dung trên canvas thành một đối tượng `File`.
//   - Hàm này trả về đối tượng `File` đó.
//
// - Cập nhật `handleFormSubmit`:
//   - Khi bắt đầu, hàm này sẽ `await captureImage()` để lấy file ảnh.
//   - Nếu có ảnh, nó sẽ được nén và tải lên như bình thường.
//   - Quy trình còn lại không thay đổi.
//
// - Giao diện (JSX):
//   - Loại bỏ hoàn toàn khối `div` chứa `input type="file"` và `img` preview.
//   - Thêm một thẻ `<canvas>` với thuộc tính `hidden` để dùng cho việc chụp ảnh.
//   - Thêm một dòng chữ nhỏ để giải thích cho người dùng về hành vi mới.
// =======================================================================

import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import imageCompression from 'browser-image-compression';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import UsernameModal from '../components/UsernameModal';

const QRCODE_READER_ID = "reader";

export default function Home() {
  // === STATE MANAGEMENT ===
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [isFormDisabled, setIsFormDisabled] = useState(true);
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  // Form states
  const [productName, setProductName] = useState('');
  const [price, setPrice] = useState('');

  // User state
  const [username, setUsername] = useState<string | null>(null);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [isSavingUser, setIsSavingUser] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // === CORE LOGIC ===

  // Effect để kiểm tra người dùng khi component mount
  useEffect(() => {
    const checkUser = async () => {
      const userId = localStorage.getItem('sscan_user_id');
      if (userId) {
        // Nếu có user id trong localStorage, lấy thông tin user từ DB
        setLoadingMessage('Đang tải thông tin người dùng...');
        setIsLoading(true);
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', userId)
            .single();
          
          if (error || !data) {
            // Nếu không tìm thấy user trong DB (có thể do DB bị reset),
            // thì yêu cầu nhập lại.
            localStorage.removeItem('sscan_user_id');
            setShowUsernameModal(true);
            toast.error('Không tìm thấy thông tin người dùng. Vui lòng nhập lại.');
          } else {
            setUsername(data.username);
            toast.success(`Chào mừng trở lại, ${data.username}!`);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          localStorage.removeItem('sscan_user_id');
          setShowUsernameModal(true);
          toast.error('Lỗi khi tải thông tin người dùng.');
        } finally {
          setIsLoading(false);
        }
      } else {
        // Nếu không có user id, hiển thị modal yêu cầu nhập tên
        setShowUsernameModal(true);
      }
    };

    checkUser();
  }, []); // Chạy 1 lần duy nhất

  // Effect để khởi tạo scanner khi component được mount
  useEffect(() => {
    // Chỉ khởi tạo scanner khi đã có thông tin user
    if (!showUsernameModal && document.getElementById(QRCODE_READER_ID) && !scannerRef.current) {
      const html5Qrcode = new Html5Qrcode(QRCODE_READER_ID);
      scannerRef.current = html5Qrcode;
      html5Qrcode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
        },
        handleScanSuccess,
        (errorMessage) => { /* Ignore */ }
      ).catch((err) => {
        toast.error("Không thể khởi động camera.");
        console.error("Unable to start scanning.", err);
      });
    }

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(err => console.error("Failed to stop scanner on cleanup", err));
      }
    };
  }, [showUsernameModal]); // Thêm showUsernameModal vào dependency array


  const handleScanSuccess = (decodedText: string) => {
    if (isFormDisabled && !isLoading) {
      setLoadingMessage('Đang kiểm tra mã vạch...');
      setIsLoading(true);
      checkBarcodeExists(decodedText);
    }
  };

  const checkBarcodeExists = async (barcode: string) => {
    try {
      const { error, count } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('barcode', barcode);
      if (error) throw error;

      if (count && count > 0) {
        toast.error('Mã vạch đã tồn tại!');
        setScannedCode(null);
        setIsFormDisabled(true);
      } else {
        setScannedCode(barcode);
        setIsFormDisabled(false);
        toast.success('Mã hợp lệ! Mời nhập thông tin.');
      }
    } catch (error) {
      console.error("Error checking barcode:", error);
      toast.error('Lỗi khi kiểm tra mã vạch.');
      setScannedCode(null);
      setIsFormDisabled(true);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Chụp ảnh từ video stream và trả về một đối tượng File.
   */
  const captureImage = (): Promise<File | null> => {
    return new Promise((resolve) => {
      const video = document.querySelector(`#${QRCODE_READER_ID} video`) as HTMLVideoElement;
      const canvas = canvasRef.current;

      if (!video || !canvas) {
        console.error("Video or canvas element not found");
        resolve(null);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (!context) {
        console.error("Canvas context not available");
        resolve(null);
        return;
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) {
          console.error("Failed to create blob from canvas");
          resolve(null);
          return;
        }
        const fileName = `capture-${Date.now()}.jpg`;
        const file = new File([blob], fileName, { type: 'image/jpeg' });
        resolve(file);
      }, 'image/jpeg', 0.95); // Chất lượng ảnh 95%
    });
  };

  const handleSaveUsername = async (name: string) => {
    setIsSavingUser(true);
    try {
      // Tạo một user mới trong bảng 'profiles'
      const { data, error } = await supabase
        .from('profiles')
        .insert({ username: name })
        .select('id, username')
        .single();

      if (error) throw error;

      if (data) {
        // Lưu id của user vào localStorage để nhận diện trong các lần truy cập sau
        localStorage.setItem('sscan_user_id', data.id);
        setUsername(data.username);
        setShowUsernameModal(false);
        toast.success(`Cảm ơn, ${data.username}! Bạn có thể bắt đầu quét.`);
      }
    } catch (error) {
      console.error("Error saving user:", error);
      toast.error('Đã có lỗi xảy ra khi lưu tên của bạn.');
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!scannedCode || !productName || !price) {
      toast.error("Vui lòng điền đầy đủ thông tin.");
      return;
    }

    const userId = localStorage.getItem('sscan_user_id');
    if (!userId) {
      toast.error("Không tìm thấy thông tin người dùng. Vui lòng tải lại trang.");
      return;
    }

    setLoadingMessage('Đang chụp ảnh...');
    setIsLoading(true);

    try {
      const imageFile = await captureImage();
      let imageUrl = null;

      if (imageFile) {
        setLoadingMessage('Đang nén và tải ảnh...');
        const compressedFile = await imageCompression(imageFile, { maxSizeMB: 1, maxWidthOrHeight: 1920 });
        const filePath = `public/${scannedCode}-${Date.now()}`;
        const { error: uploadError } = await supabase.storage.from('product_images').upload(filePath, compressedFile);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('product_images').getPublicUrl(filePath);
        imageUrl = publicUrlData.publicUrl;
      } else {
        toast.error("Không thể chụp ảnh. Vui lòng thử lại.");
      }

      setLoadingMessage('Đang lưu thông tin...');
      const { error: insertError } = await supabase.from('products').insert([{ 
        barcode: scannedCode, 
        name: productName, 
        price: parseFloat(price),
        image_url: imageUrl,
        user_id: userId, // Thêm user_id vào đây
      }]);
      if (insertError) throw insertError;

      toast.success('Sản phẩm đã được lưu!');
      resetFormAndContinueScanning();

    } catch (error) {
      console.error("Error saving product:", error);
      toast.error('Đã xảy ra lỗi khi lưu sản phẩm.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetFormAndContinueScanning = () => {
    setIsLoading(false);
    setLoadingMessage('');
    setScannedCode(null);
    setProductName('');
    setPrice('');
    setIsFormDisabled(true);
  };

  // === UI RENDERING ===
  return (
    <div className="flex flex-col h-screen w-full max-w-lg mx-auto bg-white font-sans">
      <canvas ref={canvasRef} hidden /> {/* Canvas ẩn để chụp ảnh */}
      
      {/* Modal nhập tên người dùng */}
      {showUsernameModal && (
        <UsernameModal onSave={handleSaveUsername} isLoading={isSavingUser} />
      )}

      {/* Header */}
      <div className="p-4 flex-shrink-0 border-b border-gray-200 flex justify-between items-center">
        <h1 className="font-bold text-blue-600 text-lg">Sscan - Quét Mã Vạch</h1>
        {username && <span className="text-sm text-gray-600">Chào, {username}</span>}
      </div>

      {/* Lớp phủ Loading */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 z-50 flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">{loadingMessage}</p>
        </div>
      )}

      {/* Vùng Camera (chiều cao cố định) */}
      <div className="flex-shrink-0 h-1/3 bg-black relative">
        <div id={QRCODE_READER_ID} className="w-full h-full" />
        <div className="absolute bottom-0 left-0 right-0 p-2 text-center text-white/80 text-sm bg-black/50">
          {!isFormDisabled ? 'Đã quét xong, mời nhập liệu.' : 'Hướng camera vào mã vạch...'}
        </div>
      </div>

      {/* Vùng Form (có thể cuộn) */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 bg-gray-50">
        <form onSubmit={handleFormSubmit}>
          <fieldset disabled={isFormDisabled || showUsernameModal} className="space-y-4 disabled:opacity-50">
            
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-xs text-gray-600 mb-1">Mã vạch đã quét:</p>
              <p className="text-lg font-mono font-bold text-gray-800 break-all h-7">
                {scannedCode || '...'}
              </p>
            </div>

            <div>
              <label htmlFor="productName" className="block text-sm font-medium text-gray-700 mb-1">Tên sản phẩm</label>
              <input
                id="productName"
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="VD: Nước ngọt Coca-Cola"
                required
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">Giá bán (VND)</label>
              <input
                id="price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="VD: 10000"
                min="0"
                required
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="text-center text-xs text-gray-500 italic">
              *Ảnh sản phẩm sẽ được chụp tự động từ camera khi nhấn &quot;Lưu&quot;.
            </div>

            <div className="flex items-center gap-4 pt-2">
              <button
                type="submit"
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white rounded-md px-4 py-2.5 font-semibold hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:bg-gray-400"
              >
                📷
                <span>Chụp & Lưu</span>
              </button>
              <button
                type="button"
                onClick={resetFormAndContinueScanning}
                disabled={!scannedCode}
                className="flex-shrink-0 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Quét Lại
              </button>
            </div>
          </fieldset>
        </form>
      </div>
    </div>
  );
}
